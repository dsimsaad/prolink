"""A small threaded SMTP server: one thread per connection, blocking sockets."""

import logging
import socket
import ssl
import threading
import time
import uuid
from pathlib import Path

from .errors import ConnectionClosedError, LineTooLongError
from .message import domain_of
from .session import Credentials, ServerLimits, Session, format_reply
from .wire import LineReader

log = logging.getLogger("prolink_net.smtp.server")

DEFAULT_MAILBOX_DIR = Path(__file__).resolve().parents[2] / "mailbox"
DEFAULT_LOCAL_DOMAINS = ("prolink.test", "localhost")


class MailboxHandler:
    """Accepts mail for local domains and stores each message as a .eml file."""

    def __init__(self, mailbox_dir=DEFAULT_MAILBOX_DIR, local_domains=DEFAULT_LOCAL_DOMAINS):
        self.mailbox_dir = Path(mailbox_dir)
        self.local_domains = {domain.lower() for domain in local_domains}

    def is_local(self, address):
        return domain_of(address) in self.local_domains

    def check_recipient(self, address):
        """Return None to accept, or (code, text) to refuse.

        Refusing foreign domains is what keeps this from being an open
        relay (RFC 5321 section 3.9.2 and 7.1).
        """
        if self.is_local(address):
            return None
        return 550, "5.7.1 Relaying denied"

    def deliver(self, envelope):
        for recipient in envelope.recipients:
            self.store_message(recipient, envelope.data)
        return 250, "2.0.0 Message accepted"

    def store_message(self, recipient, data):
        """Write one .eml file per recipient. The address was already checked to be safe as a folder name."""
        folder = self.mailbox_dir / recipient.lower()
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / f"{int(time.time())}-{uuid.uuid4().hex[:8]}.eml"
        path.write_bytes(data)
        log.info("stored %s (%d bytes)", path.name, len(data))
        return path


class SmtpServer:
    def __init__(self, handler, host="127.0.0.1", port=2525, name="prolink-smtp",
                 limits=None, tls_context=None, credentials=None):
        self.handler = handler
        self.host = host
        self.port = port
        self.name = name
        self.limits = limits or ServerLimits()
        self.tls_context = tls_context
        self.credentials = credentials
        self.listener = None
        self.stop_event = threading.Event()
        self.active_connections = 0
        self.lock = threading.Lock()
        self.thread = None

    def start(self):
        """Bind the port and accept connections in a background thread."""
        self.listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.listener.bind((self.host, self.port))
        self.listener.listen(16)
        self.listener.settimeout(0.2)
        self.port = self.listener.getsockname()[1]
        self.thread = threading.Thread(target=self._accept_loop, daemon=True)
        self.thread.start()

    def serve_forever(self):
        self.start()
        try:
            while self.thread.is_alive():
                self.thread.join(0.5)
        except KeyboardInterrupt:
            log.info("shutting down")
        finally:
            self.stop()

    def stop(self):
        self.stop_event.set()
        if self.thread is not None:
            self.thread.join(timeout=2)
        if self.listener is not None:
            self.listener.close()

    def _accept_loop(self):
        while not self.stop_event.is_set():
            try:
                conn, address = self.listener.accept()
            except socket.timeout:
                continue
            except OSError:
                return
            threading.Thread(target=self._serve_connection, args=(conn, address), daemon=True).start()

    def _try_reserve_slot(self):
        with self.lock:
            if self.active_connections >= self.limits.max_connections:
                return False
            self.active_connections += 1
            return True

    def _release_slot(self):
        with self.lock:
            self.active_connections -= 1

    def _serve_connection(self, conn, address):
        if not self._try_reserve_slot():
            with conn:
                conn.sendall(format_reply(421, f"{self.name} Too many connections, try later"))
            return
        try:
            conn.settimeout(self.limits.idle_timeout)
            self._converse(conn, address)
        except OSError as error:
            log.info("%s: connection error: %s", address[0], error)
        finally:
            self._release_slot()

    def _converse(self, conn, address):
        session = Session(self.name, self.handler, self.limits, address[0],
                          tls_available=self.tls_context is not None, credentials=self.credentials)
        reader = LineReader(conn)
        self._send(conn, address, session.greeting())
        try:
            while not session.closing:
                max_length = (self.limits.max_text_line if session.in_data_mode()
                              else self.limits.max_command_line)
                line = reader.read_line(max_length)
                self._log_client_line(address, session, line)
                reply = session.feed_line(line)
                if reply is not None:
                    self._send(conn, address, reply)
                if session.wants_tls_upgrade:
                    conn, reader = self._upgrade_to_tls(conn, reader, session)
        except socket.timeout:
            self._send(conn, address, format_reply(421, f"{self.name} 4.4.2 Idle timeout, closing"))
        except LineTooLongError:
            self._send(conn, address, format_reply(500, "5.5.2 Line too long"))
        except (ConnectionClosedError, ssl.SSLError):
            log.info("%s: client went away", address[0])
        finally:
            conn.close()

    def _upgrade_to_tls(self, conn, reader, session):
        if reader.has_buffered_data():
            raise ConnectionClosedError("client sent data before the TLS handshake")
        tls_conn = self.tls_context.wrap_socket(conn, server_side=True)
        session.tls_started()
        log.info("-- TLS handshake complete")
        return tls_conn, LineReader(tls_conn)

    def _log_client_line(self, address, session, line):
        """Log what the client sent, hiding anything that could be a credential or message content."""
        if session.state.auth_step or line.upper().startswith(b"AUTH "):
            shown = "********"
        elif session.in_data_mode():
            shown = "[message line]"
        else:
            shown = line.decode("utf-8", "replace")
        log.info("%s C: %s", address[0], shown)

    def _send(self, conn, address, data):
        log.info("%s S: %s", address[0], data.decode("utf-8", "replace").rstrip())
        conn.sendall(data)


def build_tls_context(cert_path, key_path):
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.load_cert_chain(cert_path, key_path)
    return context


def credentials_from_environment(environ):
    """Build the test user from FAKE_SMTP_USER and FAKE_SMTP_PASSWORD, or None when unset."""
    user = environ.get("FAKE_SMTP_USER")
    password = environ.get("FAKE_SMTP_PASSWORD")
    if user and password:
        return Credentials(user, password)
    return None

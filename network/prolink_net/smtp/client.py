"""A small SMTP client written directly on top of a TCP socket (RFC 5321)."""

import base64
import socket
import ssl
from dataclasses import dataclass

from .errors import (
    InsecureAuthError,
    PermanentError,
    SmtpError,
    TemporaryError,
    TlsNotOfferedError,
    UnexpectedReplyError,
)
from .wire import LineReader

MAX_REPLY_LINE = 1024
CRLF_TEXT = "\r\n"


@dataclass
class Reply:
    code: int
    lines: list

    @property
    def text(self):
        return "\n".join(self.lines)


def parse_reply_line(line):
    """Split one reply line into (code, is_last, text).

    RFC 5321 section 4.2.1: "250-text" means more lines follow,
    "250 text" (a space) means this is the last line.
    """
    if len(line) < 3 or not line[:3].isdigit():
        raise UnexpectedReplyError(0, f"malformed reply line: {line[:40]!r}")
    separator = line[3:4]
    if separator not in ("", " ", "-"):
        raise UnexpectedReplyError(0, f"malformed reply line: {line[:40]!r}")
    return int(line[:3]), separator != "-", line[4:]


def parse_capabilities(reply):
    """Turn the lines after the greeting of an EHLO reply into {KEYWORD: parameters}."""
    capabilities = {}
    for line in reply.lines[1:]:
        keyword, _, parameters = line.partition(" ")
        capabilities[keyword.upper()] = parameters
    return capabilities


def raise_for_reply(reply, expected):
    """Return the reply if its code is expected, otherwise raise a typed error."""
    if reply.code in expected:
        return reply
    if 400 <= reply.code < 500:
        raise TemporaryError(reply.code, reply.text)
    if 500 <= reply.code < 600:
        raise PermanentError(reply.code, reply.text)
    raise UnexpectedReplyError(reply.code, reply.text)


def dot_stuff(message):
    """Prepare a message for DATA (RFC 5321 section 4.5.2).

    A line that starts with a dot gets a second dot, so the receiver
    cannot confuse it with the lone dot that ends the message. The result
    ends with the CRLF.CRLF terminator.
    """
    lines = message.split(b"\r\n")
    if lines[-1] == b"":
        lines.pop()
    stuffed = [b"." + line if line.startswith(b".") else line for line in lines]
    return b"".join(line + b"\r\n" for line in stuffed) + b".\r\n"


def encode_auth_plain(user, password):
    """RFC 4616: base64 of authzid NUL authcid NUL password, with an empty authzid."""
    return base64.b64encode(f"\0{user}\0{password}".encode("utf-8")).decode("ascii")


def encode_auth_login_step(value):
    return base64.b64encode(value.encode("utf-8")).decode("ascii")


class SmtpClient:
    def __init__(self, host, port, timeout=10.0, trace=None, verify_tls=True, local_name="localhost",
                 tls_context=None):
        self.host = host
        self.port = port
        self.timeout = timeout
        self.trace = trace
        self.verify_tls = verify_tls
        self.local_name = local_name
        self.tls_context = tls_context
        self.sock = None
        self.reader = None
        self.capabilities = {}
        self.tls_active = False

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        self.close()

    def close(self):
        if self.sock is not None:
            self.sock.close()
            self.sock = None

    def connect(self):
        self.sock = socket.create_connection((self.host, self.port), timeout=self.timeout)
        self.sock.settimeout(self.timeout)
        self.reader = LineReader(self.sock)
        return raise_for_reply(self._read_reply(), (220,))

    def ehlo(self):
        reply = self.command(f"EHLO {self.local_name}", (250,))
        self.capabilities = parse_capabilities(reply)
        return reply

    def starttls(self):
        """Upgrade the connection to TLS (RFC 3207)."""
        if "STARTTLS" not in self.capabilities:
            raise TlsNotOfferedError("the server did not offer STARTTLS")
        self.command("STARTTLS", (220,))
        if self.reader.has_buffered_data():
            raise SmtpError("server sent plaintext after STARTTLS, refusing to upgrade")
        self.sock = self._build_tls_context().wrap_socket(self.sock, server_hostname=self.host)
        self.reader = LineReader(self.sock)
        self.tls_active = True
        self._log("*** TLS handshake complete, everything below is encrypted on the wire")
        self.ehlo()

    def _build_tls_context(self):
        if self.tls_context is not None:
            return self.tls_context
        context = ssl.create_default_context()
        if not self.verify_tls:
            # For testing only: this accepts any certificate, including the
            # local self-signed one, and gives no protection against an attacker.
            context.check_hostname = False
            context.verify_mode = ssl.CERT_NONE
        return context

    def login(self, user, password, mechanism="PLAIN", allow_plain_auth=False):
        """Authenticate with AUTH PLAIN or AUTH LOGIN (RFC 4954)."""
        if not self.tls_active and not allow_plain_auth:
            raise InsecureAuthError("refusing to send credentials without TLS")
        mechanism = mechanism.upper()
        if mechanism not in self.capabilities.get("AUTH", "").split():
            raise SmtpError(f"server does not offer AUTH {mechanism}")
        if mechanism == "PLAIN":
            self.command(f"AUTH PLAIN {encode_auth_plain(user, password)}", (235,), secret=True)
        else:
            self._login_mechanism(user, password)

    def _login_mechanism(self, user, password):
        self.command("AUTH LOGIN", (334,))
        self.command(encode_auth_login_step(user), (334,), secret=True)
        self.command(encode_auth_login_step(password), (235,), secret=True)

    def send_envelope_and_data(self, sender, recipients, message):
        """MAIL FROM, one RCPT TO per recipient, then DATA (RFC 5321 section 3.3)."""
        self.command(f"MAIL FROM:<{sender}>", (250,))
        for recipient in recipients:
            self.command(f"RCPT TO:<{recipient}>", (250, 251))
        self.command("DATA", (354,))
        payload = dot_stuff(message)
        for line in payload.decode("utf-8", errors="replace").split("\r\n")[:-1]:
            self._log("C: " + line)
        self.sock.sendall(payload)
        return raise_for_reply(self._read_reply(), (250,))

    def quit(self):
        try:
            self.command("QUIT", (221,))
        finally:
            self.close()

    def command(self, text, expected, secret=False):
        self._send_raw((text + CRLF_TEXT).encode("utf-8"), "********" if secret else text)
        return raise_for_reply(self._read_reply(), expected)

    def _send_raw(self, data, description):
        self._log("C: " + description)
        self.sock.sendall(data)

    def _read_reply(self):
        lines = []
        while True:
            raw = self.reader.read_line(MAX_REPLY_LINE)
            code, is_last, text = parse_reply_line(raw.decode("utf-8", errors="replace"))
            self._log(f"S: {code}{' ' if is_last else '-'}{text}")
            lines.append(text)
            if is_last:
                return Reply(code, lines)

    def _log(self, text):
        if self.trace:
            self.trace(text)


def send_mail(host, port, sender, recipients, message, starttls=False, verify_tls=True,
              user=None, password=None, mechanism="PLAIN", allow_plain_auth=False,
              timeout=10.0, trace=None, local_name="localhost", tls_context=None):
    """Run a whole SMTP conversation and always close the socket at the end."""
    with SmtpClient(host, port, timeout, trace, verify_tls, local_name, tls_context) as client:
        client.connect()
        client.ehlo()
        if starttls:
            client.starttls()
        if user is not None:
            client.login(user, password, mechanism, allow_plain_auth)
        client.send_envelope_and_data(sender, recipients, message)
        client.quit()

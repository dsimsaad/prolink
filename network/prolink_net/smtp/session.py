"""The SMTP server state machine, with no sockets in it.

Feed it one line at a time with feed_line() and it returns the bytes to
send back. Because it never touches the network, tests can drive it
directly, and the socket code in server.py stays short.
"""

import base64
import binascii
import hmac
import re
from dataclasses import dataclass, field

from .message import (
    ADDRESS_PATTERN,
    MAX_RECEIVED_HEADERS,
    add_received_header,
    count_received_headers,
    make_received_header,
)

MAIL_FROM = re.compile(r"^FROM:\s*<([^<>\s]*)>(?:\s+(.*))?$", re.IGNORECASE)
RCPT_TO = re.compile(r"^TO:\s*<([^<>\s]*)>(?:\s+.*)?$", re.IGNORECASE)
MAX_RECIPIENTS = 100
USERNAME_PROMPT = base64.b64encode(b"Username:").decode("ascii")
PASSWORD_PROMPT = base64.b64encode(b"Password:").decode("ascii")


@dataclass
class ServerLimits:
    max_command_line: int = 512
    max_text_line: int = 1000
    max_message_size: int = 1_000_000
    idle_timeout: float = 60.0
    max_connections: int = 50


@dataclass
class Envelope:
    sender: str
    recipients: list
    data: bytes
    client_name: str = ""


@dataclass
class Credentials:
    user: str
    password: str


@dataclass
class SessionState:
    name: str = "connected"
    sender: str = ""
    recipients: list = field(default_factory=list)
    data_lines: list = field(default_factory=list)
    data_size: int = 0
    too_big: bool = False
    auth_step: str = ""
    auth_user: str = ""


def format_reply(code, lines):
    """Build a reply the way RFC 5321 section 4.2.1 describes it.

    Every line except the last has a hyphen after the code.
    """
    if isinstance(lines, str):
        lines = [lines]
    parts = []
    for index, text in enumerate(lines):
        separator = " " if index == len(lines) - 1 else "-"
        parts.append(f"{code}{separator}{text}\r\n")
    return "".join(parts).encode("utf-8")


class Session:
    def __init__(self, server_name, handler, limits, client_address, tls_available=False,
                 credentials=None):
        self.server_name = server_name
        self.handler = handler
        self.limits = limits
        self.client_address = client_address
        self.tls_available = tls_available
        self.credentials = credentials
        self.tls_active = False
        self.wants_tls_upgrade = False
        self.closing = False
        self.client_name = ""
        self.state = SessionState()
        self.commands = {
            "EHLO": self._cmd_ehlo, "HELO": self._cmd_helo, "MAIL": self._cmd_mail,
            "RCPT": self._cmd_rcpt, "DATA": self._cmd_data, "RSET": self._cmd_rset,
            "NOOP": self._cmd_noop, "QUIT": self._cmd_quit, "STARTTLS": self._cmd_starttls,
            "AUTH": self._cmd_auth,
        }

    def greeting(self):
        return format_reply(220, f"{self.server_name} ESMTP ready")

    def tls_started(self):
        """After the handshake the client must say EHLO again (RFC 3207 section 4.2)."""
        self.tls_active = True
        self.wants_tls_upgrade = False
        self.state = SessionState()
        self.client_name = ""

    def in_data_mode(self):
        return self.state.name == "data"

    def feed_line(self, line):
        """Handle one line from the client; return reply bytes, or None if no reply is due."""
        if self.in_data_mode():
            return self._data_line(line)
        if self.state.auth_step:
            return self._auth_line(line)
        text = line.decode("utf-8", errors="replace").strip()
        verb, _, argument = text.partition(" ")
        handler = self.commands.get(verb.upper())
        if handler is None:
            return format_reply(500, "5.5.1 Command not recognized")
        return handler(argument.strip())

    def _reset_transaction(self):
        self.state = SessionState(name="greeted")

    def _cmd_helo(self, argument):
        if not argument:
            return format_reply(501, "5.5.4 HELO needs a name")
        self.client_name = argument
        self._reset_transaction()
        return format_reply(250, f"{self.server_name} Hello {argument}")

    def _cmd_ehlo(self, argument):
        if not argument:
            return format_reply(501, "5.5.4 EHLO needs a name")
        self.client_name = argument
        self._reset_transaction()
        lines = [f"{self.server_name} Hello {argument}", f"SIZE {self.limits.max_message_size}"]
        if self.tls_available and not self.tls_active:
            lines.append("STARTTLS")
        if self._auth_allowed():
            lines.append("AUTH PLAIN LOGIN")
        return format_reply(250, lines)

    def _auth_allowed(self):
        """Offer AUTH only when credentials exist and TLS is not still pending (RFC 4954 section 4)."""
        if self.credentials is None:
            return False
        return self.tls_active or not self.tls_available

    def _cmd_mail(self, argument):
        if self.state.name != "greeted":
            return format_reply(503, "5.5.1 Bad sequence of commands")
        match = MAIL_FROM.match(argument)
        if not match or (match.group(1) and not ADDRESS_PATTERN.match(match.group(1))):
            return format_reply(501, "5.1.7 Syntax: MAIL FROM:<address>")
        declared = re.search(r"SIZE=(\d+)", match.group(2) or "", re.IGNORECASE)
        if declared and int(declared.group(1)) > self.limits.max_message_size:
            return format_reply(552, "5.3.4 Message size exceeds limit")
        self.state.name = "mail"
        self.state.sender = match.group(1)
        return format_reply(250, "2.1.0 Sender OK")

    def _cmd_rcpt(self, argument):
        if self.state.name not in ("mail", "rcpt"):
            return format_reply(503, "5.5.1 Bad sequence of commands")
        match = RCPT_TO.match(argument)
        if not match or not ADDRESS_PATTERN.match(match.group(1)):
            return format_reply(501, "5.1.3 Syntax: RCPT TO:<address>")
        if len(self.state.recipients) >= MAX_RECIPIENTS:
            return format_reply(452, "4.5.3 Too many recipients")
        refusal = self.handler.check_recipient(match.group(1))
        if refusal:
            return format_reply(*refusal)
        self.state.recipients.append(match.group(1))
        self.state.name = "rcpt"
        return format_reply(250, "2.1.5 Recipient OK")

    def _cmd_data(self, argument):
        if self.state.name != "rcpt":
            return format_reply(503, "5.5.1 Need MAIL and RCPT before DATA")
        self.state.name = "data"
        return format_reply(354, "End data with <CR><LF>.<CR><LF>")

    def _data_line(self, line):
        """Collect message lines until a lone dot; undo dot-stuffing on the way."""
        if line == b".":
            return self._finish_data()
        if line.startswith(b"."):
            line = line[1:]
        self.state.data_size += len(line) + 2
        if self.state.data_size > self.limits.max_message_size:
            self.state.too_big = True
            self.state.data_lines = []
        elif not self.state.too_big:
            self.state.data_lines.append(line)
        return None

    def _finish_data(self):
        state = self.state
        sender, recipients, too_big = state.sender, state.recipients, state.too_big
        data = b"\r\n".join(state.data_lines) + b"\r\n"
        self._reset_transaction()
        if too_big:
            return format_reply(552, "5.3.4 Message size exceeds limit")
        received = make_received_header(
            self.client_name or "unknown", self.client_address, self.server_name, self.tls_active)
        data = add_received_header(data, received)
        if count_received_headers(data) > MAX_RECEIVED_HEADERS:
            return format_reply(554, "5.4.6 Too many Received headers, mail loop suspected")
        reply = self.handler.deliver(Envelope(sender, recipients, data, self.client_name))
        return format_reply(*reply)

    def _cmd_rset(self, argument):
        if self.state.name != "connected":
            self._reset_transaction()
        return format_reply(250, "2.0.0 OK")

    def _cmd_noop(self, argument):
        return format_reply(250, "2.0.0 OK")

    def _cmd_quit(self, argument):
        self.closing = True
        return format_reply(221, "2.0.0 Bye")

    def _cmd_starttls(self, argument):
        if not self.tls_available:
            return format_reply(502, "5.5.1 STARTTLS is not available")
        if self.tls_active:
            return format_reply(503, "5.5.1 TLS is already active")
        if argument:
            return format_reply(501, "5.5.4 STARTTLS takes no arguments")
        self.wants_tls_upgrade = True
        return format_reply(220, "2.0.0 Ready to start TLS")

    def _cmd_auth(self, argument):
        if self.credentials is None:
            return format_reply(502, "5.5.1 AUTH is not enabled")
        if self.tls_available and not self.tls_active:
            return format_reply(530, "5.7.0 Must issue STARTTLS first")
        if self.state.name != "greeted":
            return format_reply(503, "5.5.1 Say EHLO first, and AUTH only before MAIL")
        mechanism, _, initial = argument.partition(" ")
        mechanism = mechanism.upper()
        if mechanism == "PLAIN" and initial:
            return self._check_plain(initial.strip())
        if mechanism == "PLAIN":
            self.state.auth_step = "plain"
            return format_reply(334, "")
        if mechanism == "LOGIN":
            self.state.auth_step = "login_user"
            return format_reply(334, USERNAME_PROMPT)
        return format_reply(504, "5.5.4 Unsupported AUTH mechanism")

    def _auth_line(self, line):
        text = line.decode("ascii", errors="replace").strip()
        step = self.state.auth_step
        if text == "*":
            self.state.auth_step = ""
            return format_reply(501, "5.0.0 Authentication cancelled")
        if step == "plain":
            self.state.auth_step = ""
            return self._check_plain(text)
        if step == "login_user":
            self.state.auth_user = text
            self.state.auth_step = "login_password"
            return format_reply(334, PASSWORD_PROMPT)
        self.state.auth_step = ""
        return self._check_login(self.state.auth_user, text)

    def _check_plain(self, encoded):
        try:
            authzid, user, password = base64.b64decode(encoded, validate=True).split(b"\0")
            user, password = user.decode("utf-8"), password.decode("utf-8")
        except (binascii.Error, ValueError):
            return format_reply(501, "5.5.2 Cannot decode AUTH data")
        return self._verdict(user, password)

    def _check_login(self, encoded_user, encoded_password):
        try:
            user = base64.b64decode(encoded_user, validate=True).decode("utf-8")
            password = base64.b64decode(encoded_password, validate=True).decode("utf-8")
        except (binascii.Error, ValueError):
            return format_reply(501, "5.5.2 Cannot decode AUTH data")
        return self._verdict(user, password)

    def _verdict(self, user, password):
        """Compare in constant time so response timing does not leak the password."""
        user_ok = hmac.compare_digest(user.encode(), self.credentials.user.encode())
        password_ok = hmac.compare_digest(password.encode(), self.credentials.password.encode())
        self.state.auth_user = ""
        if user_ok and password_ok:
            return format_reply(235, "2.7.0 Authentication successful")
        return format_reply(535, "5.7.8 Authentication credentials invalid")

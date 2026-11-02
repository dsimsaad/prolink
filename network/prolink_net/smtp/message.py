"""Building and inspecting RFC 5322 messages by hand.

Everything here works on plain strings and bytes, so it can be tested
without a socket.
"""

import base64
import re
from email.header import Header
from email.utils import formatdate, make_msgid

from .errors import HeaderInjectionError

CRLF = "\r\n"
MAX_SAFE_LINE = 900
MAX_RECEIVED_HEADERS = 10
ADDRESS_PATTERN = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+$")


def reject_line_breaks(value, field_name):
    """Refuse CR, LF and NUL so a value cannot start a new header line.

    A subject like "Hi\\r\\nBcc: victim" would otherwise add a header of the
    attacker's choice (header injection, RFC 5322 section 2.2).
    """
    if any(char in value for char in "\r\n\0"):
        raise HeaderInjectionError(f"{field_name} must not contain CR, LF or NUL")


def check_address(address, field_name="address"):
    reject_line_breaks(address, field_name)
    if not ADDRESS_PATTERN.match(address):
        raise ValueError(f"{field_name} is not a plain user@domain address")
    return address


def domain_of(address):
    return address.rsplit("@", 1)[1].lower()


def encode_subject(subject):
    """Plain ASCII stays as it is; anything else becomes an RFC 2047 encoded word."""
    reject_line_breaks(subject, "subject")
    if subject.isascii():
        return subject
    return Header(subject, "utf-8").encode(linesep=CRLF)


def to_crlf(text):
    """Turn any mix of LF, CR and CRLF line endings into CRLF (RFC 5322 section 2.3)."""
    return text.replace("\r\n", "\n").replace("\r", "\n").replace("\n", CRLF)


def encode_body(body):
    """Return (transfer_encoding, text) for the message body.

    Short ASCII text is sent as 7bit. Anything else is base64 so the
    message stays ASCII on the wire and no line gets too long (RFC 2045).
    """
    text = to_crlf(body)
    lines = text.split(CRLF)
    if text.isascii() and all(len(line) <= MAX_SAFE_LINE for line in lines):
        return "7bit", text
    encoded = base64.b64encode(text.encode("utf-8")).decode("ascii")
    chunks = [encoded[i:i + 76] for i in range(0, len(encoded), 76)]
    return "base64", CRLF.join(chunks)


def build_message(sender, recipients, subject, body, date=None, message_id=None):
    """Build a complete message as bytes with CRLF line endings."""
    check_address(sender, "sender")
    for recipient in recipients:
        check_address(recipient, "recipient")
    encoding, text = encode_body(body)
    headers = [
        ("From", sender),
        ("To", ", ".join(recipients)),
        ("Subject", encode_subject(subject)),
        ("Date", date or formatdate()),
        ("Message-ID", message_id or make_msgid(domain=domain_of(sender))),
        ("MIME-Version", "1.0"),
        ("Content-Type", "text/plain; charset=utf-8"),
        ("Content-Transfer-Encoding", encoding),
    ]
    head = "".join(f"{name}: {value}{CRLF}" for name, value in headers)
    return (head + CRLF + text + CRLF).encode("ascii")


def split_header_block(raw):
    """Split a message into (header_block, rest) at the first blank line."""
    marker = b"\r\n\r\n"
    index = raw.find(marker)
    if index == -1:
        return raw, b""
    return raw[:index + 2], raw[index + 2:]


def count_received_headers(raw):
    header_block, _ = split_header_block(raw)
    lines = header_block.split(b"\r\n")
    return sum(1 for line in lines if line.lower().startswith(b"received:"))


def make_received_header(client_name, client_address, server_name, uses_tls, date=None):
    """Build the trace header each server adds on top of the message (RFC 5321 section 4.4)."""
    protocol = "ESMTPS" if uses_tls else "ESMTP"
    reject_line_breaks(client_name, "client name")
    line = (
        f"Received: from {client_name} ([{client_address}]) "
        f"by {server_name} with {protocol}; {date or formatdate()}{CRLF}"
    )
    return line.encode("ascii", errors="replace")


def add_received_header(raw, received_header):
    """New trace headers go on top, so the newest hop is always the first line."""
    return received_header + raw

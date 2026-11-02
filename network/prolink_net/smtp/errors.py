"""Exceptions shared by the SMTP client, server and relay."""


class SmtpError(Exception):
    """Base class for every SMTP problem we raise on purpose."""


class ReplyError(SmtpError):
    """The server answered with a code we did not expect."""

    def __init__(self, code, text):
        super().__init__(f"{code} {text}")
        self.code = code
        self.text = text


class TemporaryError(ReplyError):
    """A 4yz reply (RFC 5321 section 4.2.1): the same command may work later."""


class PermanentError(ReplyError):
    """A 5yz reply (RFC 5321 section 4.2.1): retrying the same command is pointless."""


class UnexpectedReplyError(ReplyError):
    """A reply code outside the 2yz-5yz families, or a success code we did not expect."""


class ConnectionClosedError(SmtpError):
    """The other side closed the TCP connection in the middle of a conversation."""


class LineTooLongError(SmtpError):
    """A line was longer than the limit, so we stop reading instead of buffering forever."""


class InsecureAuthError(SmtpError):
    """Credentials were about to be sent over a connection that is not encrypted."""


class TlsNotOfferedError(SmtpError):
    """STARTTLS was requested but the server did not advertise it."""


class HeaderInjectionError(ValueError):
    """A header value or address contained a CR or LF character."""

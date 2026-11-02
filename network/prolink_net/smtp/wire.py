"""Reading CRLF-terminated lines from a TCP socket.

TCP is a byte stream, so one recv() can return half a line or three lines.
LineReader keeps the leftover bytes between calls.
"""

from .errors import ConnectionClosedError, LineTooLongError

CRLF = b"\r\n"


class LineReader:
    def __init__(self, sock):
        self.sock = sock
        self.buffer = b""

    def read_line(self, max_length):
        """Return one line without its CRLF.

        max_length counts the CRLF too, the way RFC 5321 section 4.5.3.1
        counts it. We check the limit while reading so a peer that never
        sends CRLF cannot make us buffer without end.
        """
        while True:
            end = self.buffer.find(CRLF)
            if end != -1:
                if end + len(CRLF) > max_length:
                    raise LineTooLongError(f"line longer than {max_length} bytes")
                line = self.buffer[:end]
                self.buffer = self.buffer[end + len(CRLF):]
                return line
            if len(self.buffer) >= max_length:
                raise LineTooLongError(f"line longer than {max_length} bytes")
            self._fill()

    def _fill(self):
        chunk = self.sock.recv(4096)
        if not chunk:
            raise ConnectionClosedError("connection closed by peer")
        self.buffer += chunk

    def has_buffered_data(self):
        return bool(self.buffer)

import socket
import time

import pytest

from prolink_net.smtp.server import MailboxHandler, SmtpServer
from prolink_net.smtp.wire import LineReader


@pytest.fixture
def start_server():
    """Start SMTP servers on random free ports; they are all stopped after the test."""
    servers = []

    def start(handler, **options):
        server = SmtpServer(handler, "127.0.0.1", 0, **options)
        server.start()
        servers.append(server)
        return server

    yield start
    for server in servers:
        server.stop()


@pytest.fixture
def mailbox(tmp_path):
    return tmp_path / "mailbox"


@pytest.fixture
def local_server(start_server, mailbox):
    return start_server(MailboxHandler(mailbox, ["prolink.test"]), name="test-server")


def wait_for(condition, timeout=5.0):
    """Poll until condition() is true; background threads need a moment."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        if condition():
            return True
        time.sleep(0.02)
    return False


def messages_for(mailbox, address):
    folder = mailbox / address
    return sorted(folder.glob("*.eml")) if folder.exists() else []


class RawConnection:
    """A bare socket for tests that need to send commands in a wrong order."""

    def __init__(self, port):
        self.sock = socket.create_connection(("127.0.0.1", port), timeout=3)
        self.reader = LineReader(self.sock)
        self.greeting = self.read_reply()

    def read_reply(self):
        line = self.reader.read_line(1024)
        while line[3:4] == b"-":
            line = self.reader.read_line(1024)
        return line.decode()

    def say(self, command):
        self.sock.sendall(command.encode() + b"\r\n")
        return self.read_reply()

    def close(self):
        self.sock.close()

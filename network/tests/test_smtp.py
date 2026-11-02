import secrets
import socket
import ssl

import pytest
import trustme
from conftest import RawConnection, messages_for, wait_for

from prolink_net.smtp.client import (
    Reply,
    SmtpClient,
    dot_stuff,
    parse_capabilities,
    parse_reply_line,
    send_mail,
)
from prolink_net.smtp.errors import (
    HeaderInjectionError,
    InsecureAuthError,
    PermanentError,
)
from prolink_net.smtp.message import build_message, count_received_headers
from prolink_net.smtp.relay import MailQueue, RelayHandler, RelayWorker, RetryPolicy
from prolink_net.smtp.server import MailboxHandler
from prolink_net.smtp.session import Credentials, ServerLimits
from prolink_net.smtp.wire import LineReader

SENDER = "sender@prolink.test"
ALICE = "alice@prolink.test"
BOB = "bob@prolink.test"


def send(server, recipients, body="Hello there", subject="Test", **options):
    message = build_message(SENDER, recipients, subject, body)
    send_mail("127.0.0.1", server.port, SENDER, recipients, message, **options)


def read_text(path):
    return path.read_bytes().decode("utf-8")


def test_multiline_reply_is_parsed():
    ours, theirs = socket.socketpair()
    theirs.sendall(b"250-mail.test Hello\r\n250-SIZE 1000\r\n250-STARTTLS\r\n250 AUTH PLAIN LOGIN\r\n")
    client = SmtpClient("unused", 0)
    client.reader = LineReader(ours)
    reply = client._read_reply()
    assert reply.code == 250
    assert len(reply.lines) == 4
    assert parse_capabilities(reply) == {"SIZE": "1000", "STARTTLS": "", "AUTH": "PLAIN LOGIN"}
    ours.close()
    theirs.close()


def test_reply_line_continuation_marker():
    assert parse_reply_line("250-more") == (250, False, "more")
    assert parse_reply_line("250 done") == (250, True, "done")


def test_happy_path_stores_one_eml(local_server, mailbox):
    send(local_server, [ALICE], body="Line one\nLine two")
    files = messages_for(mailbox, ALICE)
    assert len(files) == 1
    text = read_text(files[0])
    assert text.startswith("Received: from localhost")
    assert "Subject: Test\r\n" in text
    assert "Line one\r\nLine two\r\n" in text
    assert count_received_headers(files[0].read_bytes()) == 1


def test_dot_stuffing_round_trip(local_server, mailbox):
    send(local_server, [ALICE], body="before\n.starts with a dot\n..two dots\n.\nafter")
    text = read_text(messages_for(mailbox, ALICE)[0])
    assert "\r\n.starts with a dot\r\n..two dots\r\n.\r\nafter\r\n" in text


def test_dot_stuff_adds_terminator():
    assert dot_stuff(b"a\r\n.b\r\n") == b"a\r\n..b\r\n.\r\n"


def test_several_recipients_each_get_a_copy(local_server, mailbox):
    send(local_server, [ALICE, BOB])
    assert len(messages_for(mailbox, ALICE)) == 1
    assert len(messages_for(mailbox, BOB)) == 1


def test_unknown_domain_is_rejected_no_open_relay(local_server, mailbox):
    with pytest.raises(PermanentError) as caught:
        send(local_server, ["victim@elsewhere.test"])
    assert caught.value.code == 550
    assert "5.7.1" in caught.value.text
    assert not mailbox.exists()


def test_commands_out_of_order_get_503(local_server):
    conn = RawConnection(local_server.port)
    assert conn.say(f"MAIL FROM:<{SENDER}>").startswith("503")
    assert conn.say("EHLO tester").startswith("250")
    assert conn.say(f"RCPT TO:<{ALICE}>").startswith("503")
    assert conn.say("DATA").startswith("503")
    assert conn.say("BOGUS").startswith("500")
    assert conn.say("MAIL FROM:nonsense").startswith("501")
    assert conn.say("QUIT").startswith("221")
    conn.close()


def test_message_over_size_limit_gets_552(start_server, mailbox):
    server = start_server(MailboxHandler(mailbox, ["prolink.test"]),
                          limits=ServerLimits(max_message_size=2000))
    with pytest.raises(PermanentError) as caught:
        send(server, [ALICE], body="x" * 100 + "\n" + ("y" * 100 + "\n") * 40)
    assert caught.value.code == 552
    assert messages_for(mailbox, ALICE) == []


def test_declared_size_over_limit_is_refused_early(start_server, mailbox):
    server = start_server(MailboxHandler(mailbox, ["prolink.test"]),
                          limits=ServerLimits(max_message_size=2000))
    conn = RawConnection(server.port)
    conn.say("EHLO tester")
    assert conn.say(f"MAIL FROM:<{SENDER}> SIZE=999999").startswith("552")
    conn.close()


@pytest.mark.parametrize("field", ["subject", "sender", "recipient"])
def test_header_injection_is_rejected(field):
    bad = "x\r\nBcc: someone@prolink.test"
    arguments = {
        "subject": (SENDER, [ALICE], bad),
        "sender": ("a" + bad, [ALICE], "Hi"),
        "recipient": (SENDER, [ALICE + bad], "Hi"),
    }[field]
    with pytest.raises(HeaderInjectionError):
        build_message(arguments[0], arguments[1], arguments[2], "body")


def test_non_ascii_subject_uses_rfc2047():
    raw = build_message(SENDER, [ALICE], "Caf\u00e9 \u2615", "body").decode("ascii")
    assert "Subject: =?utf-8?" in raw


def test_non_ascii_body_is_base64_and_stays_ascii():
    raw = build_message(SENDER, [ALICE], "Hi", "na\u00efve")
    assert b"Content-Transfer-Encoding: base64" in raw
    raw.decode("ascii")


def make_tls_pair():
    ca = trustme.CA()
    server_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ca.issue_cert("127.0.0.1").configure_cert(server_context)
    client_context = ssl.create_default_context()
    ca.configure_trust(client_context)
    return server_context, client_context


def test_starttls_delivers_over_encrypted_connection(start_server, mailbox):
    server_context, client_context = make_tls_pair()
    server = start_server(MailboxHandler(mailbox, ["prolink.test"]), tls_context=server_context)
    lines = []
    send(server, [ALICE], starttls=True, tls_context=client_context, trace=lines.append)
    assert any("TLS handshake complete" in line for line in lines)
    assert "ESMTPS" in read_text(messages_for(mailbox, ALICE)[0])


def test_starttls_rejects_untrusted_certificate_by_default(start_server, mailbox):
    server_context, _ = make_tls_pair()
    server = start_server(MailboxHandler(mailbox, ["prolink.test"]), tls_context=server_context)
    with pytest.raises(ssl.SSLCertVerificationError):
        send(server, [ALICE], starttls=True)
    send(server, [ALICE], starttls=True, verify_tls=False)
    assert len(messages_for(mailbox, ALICE)) == 1


def test_auth_is_refused_without_tls(start_server, mailbox):
    password = secrets.token_hex(8)
    server_context, _ = make_tls_pair()
    server = start_server(MailboxHandler(mailbox, ["prolink.test"]), tls_context=server_context,
                          credentials=Credentials("tester", password))
    with pytest.raises(InsecureAuthError):
        send(server, [ALICE], user="tester", password=password)
    conn = RawConnection(server.port)
    conn.say("EHLO tester")
    assert conn.say("AUTH PLAIN AAAA").startswith("530")
    conn.close()


@pytest.mark.parametrize("mechanism", ["PLAIN", "LOGIN"])
def test_auth_over_tls_works_and_is_masked_in_trace(start_server, mailbox, mechanism):
    password = secrets.token_hex(8)
    server_context, client_context = make_tls_pair()
    server = start_server(MailboxHandler(mailbox, ["prolink.test"]), tls_context=server_context,
                          credentials=Credentials("tester", password))
    lines = []
    send(server, [ALICE], starttls=True, tls_context=client_context, user="tester",
         password=password, mechanism=mechanism, trace=lines.append)
    assert "235" in "\n".join(lines)
    assert password not in "\n".join(lines)
    assert "C: ********" in lines
    assert len(messages_for(mailbox, ALICE)) == 1


def test_wrong_password_gets_535(start_server, mailbox):
    server = start_server(MailboxHandler(mailbox, ["prolink.test"]),
                          credentials=Credentials("tester", secrets.token_hex(8)))
    with pytest.raises(PermanentError) as caught:
        send(server, [ALICE], user="tester", password="wrong", allow_plain_auth=True)
    assert caught.value.code == 535


def test_idle_connection_gets_421(start_server, mailbox):
    server = start_server(MailboxHandler(mailbox, ["prolink.test"]),
                          limits=ServerLimits(idle_timeout=0.3))
    conn = RawConnection(server.port)
    assert conn.read_reply().startswith("421")
    conn.close()


def test_too_many_connections_gets_421(start_server, mailbox):
    server = start_server(MailboxHandler(mailbox, ["prolink.test"]),
                          limits=ServerLimits(max_connections=1))
    first = RawConnection(server.port)
    second = RawConnection(server.port)
    assert second.greeting.startswith("421")
    first.close()
    second.close()


def start_relay(start_server, tmp_path, name, routes, max_attempts=5):
    queue = MailQueue(tmp_path / f"queue-{name}")
    handler = RelayHandler(queue, routes, tmp_path / f"mailbox-{name}", ["prolink.test"])
    server = start_server(handler, name=name)
    worker = RelayWorker(queue, RetryPolicy(max_attempts, base_delay=0.05), name)
    worker.start()
    return server, worker, queue


def test_two_hop_relay_delivers_one_message_with_two_received_headers(start_server, tmp_path):
    final = start_server(MailboxHandler(tmp_path / "mailbox-b", ["b.test"]), name="server-b")
    relay, worker, _ = start_relay(start_server, tmp_path, "relay-a",
                                   {"b.test": ("127.0.0.1", final.port)})
    message = build_message(SENDER, ["carol@b.test"], "Across", "hop hop")
    send_mail("127.0.0.1", relay.port, SENDER, ["carol@b.test"], message)
    assert wait_for(lambda: messages_for(tmp_path / "mailbox-b", "carol@b.test"))
    worker.stop()
    delivered = messages_for(tmp_path / "mailbox-b", "carol@b.test")
    assert len(delivered) == 1
    assert count_received_headers(delivered[0].read_bytes()) == 2


def test_relay_refuses_domains_it_does_not_route(start_server, tmp_path):
    relay, worker, _ = start_relay(start_server, tmp_path, "relay-a", {})
    with pytest.raises(PermanentError) as caught:
        send(relay, ["x@nowhere.test"])
    worker.stop()
    assert "5.7.1" in caught.value.text


def test_loop_protection_refuses_more_than_ten_received_headers(local_server, mailbox):
    def with_hops(count):
        trace = "Received: from hop by hop; Mon, 02 Nov 2026 12:00:00 -0000\r\n" * count
        return trace.encode() + build_message(SENDER, [ALICE], "Loop", "x")

    send_mail("127.0.0.1", local_server.port, SENDER, [ALICE], with_hops(9))
    with pytest.raises(PermanentError) as caught:
        send_mail("127.0.0.1", local_server.port, SENDER, [ALICE], with_hops(10))
    assert caught.value.code == 554
    assert len(messages_for(mailbox, ALICE)) == 1


class FlakyHandler(MailboxHandler):
    """Fails with a 451 for the first few deliveries, like a busy server."""

    def __init__(self, *args, failures):
        super().__init__(*args)
        self.failures_left = failures
        self.attempts = 0

    def deliver(self, envelope):
        self.attempts += 1
        if self.failures_left > 0:
            self.failures_left -= 1
            return 451, "4.3.0 Try again later"
        return super().deliver(envelope)


def test_temporary_failure_is_retried(start_server, tmp_path):
    flaky = FlakyHandler(tmp_path / "mailbox-b", ["b.test"], failures=2)
    final = start_server(flaky)
    relay, worker, queue = start_relay(start_server, tmp_path, "relay-a",
                                       {"b.test": ("127.0.0.1", final.port)})
    send(relay, ["dave@b.test"])
    assert wait_for(lambda: messages_for(tmp_path / "mailbox-b", "dave@b.test"))
    worker.stop()
    assert flaky.attempts == 3
    assert list(queue.directory.glob("*.json")) == []


def test_giving_up_writes_a_failure_note(start_server, tmp_path):
    flaky = FlakyHandler(tmp_path / "mailbox-b", ["b.test"], failures=99)
    final = start_server(flaky)
    relay, worker, queue = start_relay(start_server, tmp_path, "relay-a",
                                       {"b.test": ("127.0.0.1", final.port)}, max_attempts=3)
    send(relay, ["erin@b.test"])
    assert wait_for(lambda: list(queue.failed_directory.glob("*.txt")))
    worker.stop()
    note = list(queue.failed_directory.glob("*.txt"))[0].read_text()
    assert "Attempts: 3" in note
    assert flaky.attempts == 3

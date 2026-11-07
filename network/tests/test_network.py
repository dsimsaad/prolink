from contextlib import ExitStack
import mailbox, secrets, smtplib, socket, time
from aiosmtpd.controller import Controller
from aiosmtpd.handlers import Mailbox, Proxy
import pytest
from websockets.sync.client import connect
from websockets.sync.server import broadcast

from make_certs import write_dev_certs
from smtp_send import send_mail
from smtp_server_tls import start_tls_server
from status_feed import next_event, start_status_server


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def test_sent_message_arrives_in_maildir(tmp_path):
    mail_dir, port = tmp_path / "mail", free_port()
    ctrl = Controller(Mailbox(mail_dir), hostname="127.0.0.1", port=port)
    ctrl.start()
    try:
        send_mail("sender@prolink.test", "alice@prolink.test", "Welcome", "Body text", port=port)
        messages = list(mailbox.Maildir(mail_dir).values())
        assert len(messages) == 1
        assert messages[0]["From"] == "sender@prolink.test"
        assert messages[0]["To"] == "alice@prolink.test"
        assert messages[0]["Subject"] == "Welcome"
    finally:
        ctrl.stop()


def test_two_hop_proxy_chain_delivers_one_message(tmp_path):
    mail_dir = tmp_path / "mail"
    port_c, port_b, port_a = free_port(), free_port(), free_port()
    servers = [
        Controller(Mailbox(mail_dir), hostname="127.0.0.1", port=port_c),
        Controller(Proxy("127.0.0.1", port_c), hostname="127.0.0.1", port=port_b),
        Controller(Proxy("127.0.0.1", port_b), hostname="127.0.0.1", port=port_a),
    ]
    for srv in servers:
        srv.start()
    try:
        send_mail("sender@prolink.test", "carol@prolink.test", "Chain", "Across two hops", port=port_a)
        messages = list(mailbox.Maildir(mail_dir).values())
        assert len(messages) == 1
        assert messages[0]["Subject"] == "Chain"
    finally:
        for srv in reversed(servers):
            srv.stop()


def test_starttls_with_trustme_and_plain_auth_refused(tmp_path, monkeypatch):
    ca_pem, cert_pem, key_pem = write_dev_certs(tmp_path / "certs")
    mail_dir, port, token = tmp_path / "mail", free_port(), secrets.token_hex(8)
    monkeypatch.setenv("SMTP_PASSWORD", token)
    srv = start_tls_server(cert_pem, key_pem, mail_dir, port=port, user="demo", password=token)
    try:
        with pytest.raises(smtplib.SMTPException):
            send_mail("sender@prolink.test", "alice@prolink.test", port=port, user="demo")
        send_mail("sender@prolink.test", "alice@prolink.test", "Encrypted", "Secret body",
                  port=port, starttls=True, cafile=str(ca_pem), user="demo")
        assert len(list(mailbox.Maildir(mail_dir).values())) == 1
    finally:
        srv.stop()


def test_status_feed_sends_same_event_to_five_clients():
    with start_status_server(port=0) as srv, ExitStack() as stack:
        port = srv.socket.getsockname()[1]
        clients = [stack.enter_context(connect(f"ws://127.0.0.1:{port}", proxy=None)) for _ in range(5)]
        deadline = time.monotonic() + 2.0
        while len(srv.connections) < 5 and time.monotonic() < deadline:
            time.sleep(0.01)
        event = next_event()
        broadcast(srv.connections, event)
        assert [c.recv(timeout=2.0) for c in clients] == [event] * 5

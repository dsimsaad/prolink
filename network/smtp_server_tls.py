import hmac, os, ssl, sys, time
from aiosmtpd.controller import Controller
from aiosmtpd.handlers import Mailbox, Proxy
from aiosmtpd.smtp import AuthResult, LoginPassword
import typer

# Add the missing CLI hook to aiosmtpd's Proxy handler so `python -m aiosmtpd -c` accepts host and port.
Proxy.from_cli = classmethod(lambda cls, _parser, host, port: cls(host, int(port)))

# Start an aiosmtpd Maildir server requiring STARTTLS and optional FAKE_SMTP_* login.
def start_tls_server(cert="certs/server.pem", key="certs/server.key", mailbox_dir="mailbox",
                     host="127.0.0.1", port=2525, user=None, password=None):
    if host not in ("127.0.0.1", "localhost", "::1"):
        print(f"WARNING: binding to {host} exposes this server on the network", file=sys.stderr)
    ctx = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
    ctx.load_cert_chain(str(cert), str(key))
    def auth(_srv, _sess, _env, _mech, data):
        ok = (isinstance(data, LoginPassword) and hmac.compare_digest(data.login, user.encode())
              and hmac.compare_digest(data.password, password.encode()))
        return AuthResult(success=ok, handled=False)
    use_auth = bool(user and password)
    ctrl = Controller(Mailbox(mailbox_dir), hostname=host, port=port, tls_context=ctx, require_starttls=True,
                      authenticator=auth if use_auth else None, auth_required=use_auth, auth_require_tls=True)
    ctrl.start()
    return ctrl

def main(host: str = "127.0.0.1", port: int = 2525, cert: str = "certs/server.pem", key: str = "certs/server.key", mailbox: str = "mailbox") -> None:
    srv = start_tls_server(cert, key, mailbox, host, port, os.getenv("FAKE_SMTP_USER"), os.getenv("FAKE_SMTP_PASSWORD"))
    print(f"STARTTLS server listening on {host}:{port} -> {mailbox}")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        srv.stop()

if __name__ == "__main__":
    typer.run(main)

"""Command line for the SMTP tools: python -m prolink_net.smtp client|server|relay."""

import argparse
import getpass
import logging
import os
import sys

from .client import send_mail
from .errors import SmtpError
from .message import build_message
from .relay import (
    DEFAULT_QUEUE_DIR,
    MailQueue,
    RelayHandler,
    RelayWorker,
    RetryPolicy,
    parse_route,
)
from .server import (
    DEFAULT_LOCAL_DOMAINS,
    DEFAULT_MAILBOX_DIR,
    MailboxHandler,
    SmtpServer,
    build_tls_context,
    credentials_from_environment,
)
from .session import ServerLimits

LOOPBACK_HOSTS = ("127.0.0.1", "localhost", "::1")


def build_parser():
    parser = argparse.ArgumentParser(prog="python -m prolink_net.smtp")
    commands = parser.add_subparsers(dest="command", required=True)
    add_client_options(commands.add_parser("client", help="send one message"))
    add_server_options(commands.add_parser("server", help="run the mini SMTP server"))
    relay = commands.add_parser("relay", help="run the server in relay mode")
    add_server_options(relay)
    add_relay_options(relay)
    return parser


def add_client_options(parser):
    parser.add_argument("--host", default=os.environ.get("SMTP_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("SMTP_PORT", "2525")))
    parser.add_argument("--starttls", action="store_true", help="upgrade to TLS (RFC 3207)")
    parser.add_argument("--insecure-skip-verify", action="store_true",
                        help="do not verify the certificate; for the local self-signed one, testing only")
    parser.add_argument("--allow-plain-auth", action="store_true",
                        help="allow AUTH without TLS; for localhost tests only")
    parser.add_argument("--user", default=os.environ.get("SMTP_USER"))
    parser.add_argument("--auth", choices=("plain", "login"), default="plain")
    parser.add_argument("--sender", default=os.environ.get("SMTP_FROM"))
    parser.add_argument("--to", nargs="+", required=True, dest="recipients")
    parser.add_argument("--subject", default="(no subject)")
    parser.add_argument("--body", default="")
    parser.add_argument("--trace", action="store_true", help="print the whole conversation")
    parser.add_argument("--timeout", type=float, default=10.0)


def add_server_options(parser):
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=2525)
    parser.add_argument("--name", default="prolink-smtp", help="name used in the greeting and Received header")
    parser.add_argument("--domain", action="append", dest="domains",
                        help="local domain, can be repeated")
    parser.add_argument("--cert", help="PEM certificate; with --key it enables STARTTLS")
    parser.add_argument("--key", help="PEM private key")
    parser.add_argument("--max-size", type=int, default=1_000_000, help="largest message in bytes")
    parser.add_argument("--mailbox-dir", default=str(DEFAULT_MAILBOX_DIR))


def add_relay_options(parser):
    parser.add_argument("--route", action="append", default=[], type=parse_route,
                        metavar="DOMAIN=HOST:PORT", help="forward this domain to the next hop")
    parser.add_argument("--queue-dir", default=str(DEFAULT_QUEUE_DIR))
    parser.add_argument("--max-attempts", type=int, default=5)
    parser.add_argument("--backoff", type=float, default=2.0, help="first retry delay in seconds")


def read_password(user):
    """The password never comes from the command line, where ps and shell history would show it."""
    password = os.environ.get("SMTP_PASSWORD")
    if password is None and user:
        password = getpass.getpass("SMTP password: ")
    return password


def run_client(args):
    if not args.sender:
        sys.exit("error: give --sender or set SMTP_FROM")
    message = build_message(args.sender, args.recipients, args.subject, args.body)
    password = read_password(args.user) if args.user else None
    trace = (lambda line: print(line)) if args.trace else None
    try:
        send_mail(args.host, args.port, args.sender, args.recipients, message,
                  starttls=args.starttls, verify_tls=not args.insecure_skip_verify,
                  user=args.user, password=password, mechanism=args.auth,
                  allow_plain_auth=args.allow_plain_auth, timeout=args.timeout, trace=trace)
    except (SmtpError, OSError) as error:
        sys.exit(f"send failed: {error}")
    print("message sent")


def warn_if_public(host):
    if host not in LOOPBACK_HOSTS:
        print(f"WARNING: listening on {host}, other machines can reach this server", file=sys.stderr)


def build_server(args, handler):
    tls_context = None
    if args.cert or args.key:
        if not (args.cert and args.key):
            sys.exit("error: --cert and --key must be given together")
        tls_context = build_tls_context(args.cert, args.key)
    limits = ServerLimits(max_message_size=args.max_size)
    return SmtpServer(handler, args.host, args.port, args.name, limits, tls_context,
                      credentials_from_environment(os.environ))


def run_server(args):
    handler = MailboxHandler(args.mailbox_dir, args.domains or DEFAULT_LOCAL_DOMAINS)
    server = build_server(args, handler)
    warn_if_public(args.host)
    print(f"SMTP server listening on {args.host}:{args.port}, mailbox {args.mailbox_dir}")
    server.serve_forever()


def run_relay(args):
    queue = MailQueue(args.queue_dir)
    handler = RelayHandler(queue, dict(args.route), args.mailbox_dir,
                           args.domains or DEFAULT_LOCAL_DOMAINS)
    server = build_server(args, handler)
    worker = RelayWorker(queue, RetryPolicy(args.max_attempts, args.backoff), args.name)
    warn_if_public(args.host)
    print(f"SMTP relay listening on {args.host}:{args.port}, routes {dict(args.route)}")
    worker.start()
    try:
        server.serve_forever()
    finally:
        worker.stop()


def main(argv=None):
    args = build_parser().parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s", datefmt="%H:%M:%S")
    {"client": run_client, "server": run_server, "relay": run_relay}[args.command](args)


if __name__ == "__main__":
    main()

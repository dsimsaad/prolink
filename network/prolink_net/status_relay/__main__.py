"""Command line: python -m prolink_net.status_relay server|client."""

import argparse
import asyncio
import logging
import sys

from .client import StatusClient
from .server import StatusRelayServer
from .sources import SourceError, create_source

LOOPBACK_HOSTS = ("127.0.0.1", "localhost", "::1")


def build_parser():
    parser = argparse.ArgumentParser(prog="python -m prolink_net.status_relay")
    commands = parser.add_subparsers(dest="command", required=True)
    server = commands.add_parser("server", help="run the relay")
    client = commands.add_parser("client", help="print events from a relay")
    for sub in (server, client):
        sub.add_argument("--host", default="127.0.0.1")
        sub.add_argument("--port", type=int, default=9099)
    server.add_argument("--source", choices=("fake", "db"), default="fake")
    client.add_argument("--name", default="console")
    return parser


async def run_server(args):
    source = create_source(args.source)
    if args.host not in LOOPBACK_HOSTS:
        print(f"WARNING: listening on {args.host}, other machines can reach this server",
              file=sys.stderr)
    print(f"status relay on {args.host}:{args.port}, source {args.source}. Press Ctrl+C to stop.")
    await StatusRelayServer(args.host, args.port).serve(source)


async def run_client(args):
    await StatusClient(args.host, args.port, args.name).run_forever()


def main(argv=None):
    args = build_parser().parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s", datefmt="%H:%M:%S")
    runner = run_server if args.command == "server" else run_client
    try:
        # asyncio.run turns Ctrl+C into a cancellation of the main task, so the
        # finally blocks run (clients get a BYE). This works the same on macOS
        # and Windows, where loop.add_signal_handler is not available.
        asyncio.run(runner(args))
    except KeyboardInterrupt:
        print("stopped")
    except SourceError as error:
        sys.exit(f"error: {error}")


if __name__ == "__main__":
    main()

"""Open many clients against the status relay and report how many events each received.

Run from the network/ folder:
    python scripts/stress_relay.py
    python scripts/stress_relay.py --clients 50 --events 500
    python scripts/stress_relay.py --port 9099 --seconds 20   (use a relay that is already running)
"""

import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from prolink_net.status_relay.client import StatusClient  # noqa: E402
from prolink_net.status_relay.server import StatusRelayServer  # noqa: E402

EVENT = {"job_id": "stress-job", "from_status": "Open", "to_status": "Assigned",
         "at": "2026-01-01T00:00:00+00:00"}


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--clients", type=int, default=50)
    parser.add_argument("--events", type=int, default=200, help="events to send (own relay only)")
    parser.add_argument("--port", type=int, help="connect to a relay that is already running")
    parser.add_argument("--seconds", type=float, default=15.0, help="listen time for a running relay")
    return parser.parse_args()


async def start_clients(count, port):
    clients = [StatusClient("127.0.0.1", port, f"stress-{n}", on_event=lambda payload: None,
                            report=lambda text: None) for n in range(count)]
    tasks = [asyncio.create_task(client.run_forever()) for client in clients]
    for client in clients:
        await asyncio.wait_for(client.welcomed.wait(), 10)
    return clients, tasks


async def run_against_own_relay(args):
    server = StatusRelayServer("127.0.0.1", 0, report=lambda text: None)
    await server.start()
    clients, tasks = await start_clients(args.clients, server.port)
    for _ in range(args.events):
        server.broadcast(EVENT)
        await asyncio.sleep(0.005)
    await asyncio.sleep(1.0)
    await server.stop()
    return clients, tasks


async def run_against_running_relay(args):
    clients, tasks = await start_clients(args.clients, args.port)
    await asyncio.sleep(args.seconds)
    return clients, tasks


def report(clients, expected):
    counts = [client.events_received for client in clients]
    print(f"clients: {len(counts)}")
    print(f"events received per client: min {min(counts)}, max {max(counts)}, "
          f"average {sum(counts) / len(counts):.1f}")
    if expected is not None:
        complete = sum(1 for count in counts if count == expected)
        print(f"clients that got all {expected} events: {complete}/{len(counts)}")


async def main():
    args = parse_args()
    runner = run_against_running_relay if args.port else run_against_own_relay
    clients, tasks = await runner(args)
    for task in tasks:
        task.cancel()
    report(clients, None if args.port else args.events)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("stopped")

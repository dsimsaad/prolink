from collections import deque
from datetime import datetime, timezone
from itertools import cycle
import json, sys, threading, time
import typer
from websockets.sync.server import broadcast, serve

STEPS = cycle([("Open", "Assigned"), ("Assigned", "In-Progress"), ("In-Progress", "Completed")])

def next_event(job_id: str = "demo-job-001") -> str:
    old, new = next(STEPS)
    return json.dumps({"job_id": job_id, "from_status": old, "to_status": new, "time": datetime.now(timezone.utc).isoformat(timespec="seconds")})

# Start a WebSocket broadcast server using websockets' built-in ping/pong heartbeat and size limit.
def start_status_server(host: str = "127.0.0.1", port: int = 9099):
    if host not in ("127.0.0.1", "localhost", "::1"):
        print(f"WARNING: binding to {host} exposes this server on the network", file=sys.stderr)
    srv = serve(lambda ws: deque(ws, maxlen=0), host, port, ping_interval=15, ping_timeout=15, max_size=65536)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

def main(host: str = "127.0.0.1", port: int = 9099, interval: float = 3.0) -> None:
    with start_status_server(host, port) as srv:
        print(f"WebSocket status feed on ws://{host}:{port}")
        while True:
            time.sleep(interval)
            broadcast(srv.connections, next_event())

if __name__ == "__main__":
    typer.run(main)

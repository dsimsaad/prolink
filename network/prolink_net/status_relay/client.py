"""Console client for the live status relay with automatic reconnect."""

import asyncio

from .protocol import FrameDecoder, FrameType, ProtocolError, encode_frame

READ_SIZE = 4096
CONNECT_TIMEOUT = 5.0
DEFAULT_READ_TIMEOUT = 45.0


def format_event(payload):
    old = payload.get("from_status") or "-"
    return f"{payload.get('at', '?')}  {payload.get('job_id', '?')}  {old} -> {payload.get('to_status', '?')}"


class StatusClient:
    def __init__(self, host="127.0.0.1", port=9099, name="console", on_event=None,
                 backoff_start=0.5, backoff_max=15.0, read_timeout=DEFAULT_READ_TIMEOUT,
                 report=print):
        self.host = host
        self.port = port
        self.name = name
        self.on_event = on_event or (lambda payload: report(format_event(payload)))
        self.backoff_start = backoff_start
        self.backoff_max = backoff_max
        self.read_timeout = read_timeout
        self.report = report
        self.welcomed = asyncio.Event()
        self.events_received = 0

    async def run_forever(self):
        """Connect, read, and on any failure wait a little longer each time before retrying."""
        delay = self.backoff_start
        while True:
            try:
                await self._session()
                self.report("server closed the connection")
            except (OSError, asyncio.TimeoutError, ProtocolError) as error:
                self.report(f"connection problem: {error or type(error).__name__}")
            if self.welcomed.is_set():
                delay = self.backoff_start
            self.welcomed.clear()
            self.report(f"reconnecting in {delay:.1f}s")
            await asyncio.sleep(delay)
            delay = min(self.backoff_max, delay * 2)

    async def _session(self):
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(self.host, self.port), CONNECT_TIMEOUT)
        try:
            writer.write(encode_frame(FrameType.HELLO, {"name": self.name}))
            await writer.drain()
            await self._read_frames(reader, writer)
        finally:
            writer.close()
            try:
                await writer.wait_closed()
            except OSError:
                pass

    async def _read_frames(self, reader, writer):
        decoder = FrameDecoder()
        while True:
            data = await asyncio.wait_for(reader.read(READ_SIZE), self.read_timeout)
            if not data:
                return
            for frame in decoder.feed(data):
                if await self._handle_frame(frame, writer):
                    return

    async def _handle_frame(self, frame, writer):
        """Return True when the server said BYE."""
        if frame.type == FrameType.WELCOME:
            self.welcomed.set()
            self.report(f"connected to {frame.payload.get('server', 'server')}")
        elif frame.type == FrameType.EVENT:
            self.events_received += 1
            self.on_event(frame.payload)
        elif frame.type == FrameType.PING:
            writer.write(encode_frame(FrameType.PONG))
            await writer.drain()
        elif frame.type == FrameType.BYE:
            return True
        return False

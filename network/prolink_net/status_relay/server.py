"""Live status relay server built on asyncio streams.

Every client has its own bounded outgoing queue and its own writer task, so a
slow client can only hurt itself.
"""

import asyncio
import logging

from .protocol import (
    FrameDecoder,
    FrameType,
    ProtocolError,
    encode_frame,
)

log = logging.getLogger("prolink_net.status_relay")

SERVER_NAME = "prolink-status-relay"
READ_SIZE = 4096
HELLO_TIMEOUT = 10.0
WRITE_TIMEOUT = 10.0
MAX_NAME_LENGTH = 64


class ClientConnection:
    def __init__(self, writer, queue_size, max_overflow):
        self.writer = writer
        self.queue = asyncio.Queue(maxsize=queue_size)
        self.max_overflow = max_overflow
        self.name = "?"
        self.dropped = 0
        self.overflow_strikes = 0
        self.missed_pongs = 0
        self.writer_task = None
        self.decoder = FrameDecoder()

    def offer(self, data):
        """Queue bytes for this client without ever waiting.

        When the queue is full the oldest frame is thrown away to make room,
        because a status feed is more useful fresh than complete. Returns
        False when the client overflowed so often that it should be dropped.
        """
        if self.queue.full():
            self.queue.get_nowait()
            self.dropped += 1
            self.overflow_strikes += 1
        self.queue.put_nowait(data)
        return self.overflow_strikes < self.max_overflow

    def abort(self):
        """Close the socket immediately, without waiting for unsent data to drain."""
        self.writer.transport.abort()


class StatusRelayServer:
    def __init__(self, host="127.0.0.1", port=9099, queue_size=100, ping_interval=15.0,
                 max_missed_pongs=2, max_overflow=20, max_clients=500, report=print):
        self.host = host
        self.port = port
        self.queue_size = queue_size
        self.ping_interval = ping_interval
        self.max_missed_pongs = max_missed_pongs
        self.max_overflow = max_overflow
        self.max_clients = max_clients
        self.report = report
        self.clients = set()
        self.tcp_server = None
        self.heartbeat_task = None

    async def start(self):
        self.tcp_server = await asyncio.start_server(self._handle_client, self.host, self.port)
        self.port = self.tcp_server.sockets[0].getsockname()[1]
        self.heartbeat_task = asyncio.create_task(self._heartbeat_loop())

    async def serve(self, source):
        """Run until cancelled (Ctrl+C), forwarding every event from the source to all clients."""
        await self.start()
        try:
            async for event in source.events():
                self.broadcast(event)
        finally:
            await self.stop()

    def broadcast(self, event):
        data = encode_frame(FrameType.EVENT, event)
        for client in list(self.clients):
            if not client.offer(data):
                log.info("%s keeps overflowing, disconnecting", client.name)
                client.abort()

    async def stop(self):
        """Say BYE to everyone, then close. Safe to call twice."""
        if self.heartbeat_task:
            self.heartbeat_task.cancel()
            self.heartbeat_task = None
        if self.tcp_server is None:
            return
        self.tcp_server.close()
        for client in list(self.clients):
            await self._say_goodbye(client)
        await self.tcp_server.wait_closed()
        self.tcp_server = None

    async def _say_goodbye(self, client):
        client.writer_task.cancel()
        try:
            client.writer.write(encode_frame(FrameType.BYE))
            await asyncio.wait_for(client.writer.drain(), timeout=1.0)
        except (OSError, asyncio.TimeoutError):
            pass
        client.abort()

    async def _heartbeat_loop(self):
        while True:
            await asyncio.sleep(self.ping_interval)
            self._ping_everyone()

    def _ping_everyone(self):
        ping = encode_frame(FrameType.PING)
        for client in list(self.clients):
            if client.missed_pongs >= self.max_missed_pongs:
                log.info("%s missed %d PONGs, disconnecting", client.name, client.missed_pongs)
                client.abort()
                continue
            client.missed_pongs += 1
            client.offer(ping)

    async def _handle_client(self, reader, writer):
        client = ClientConnection(writer, self.queue_size, self.max_overflow)
        try:
            early_frames = await self._wait_for_hello(client, reader)
            self._register(client)
            await self._read_frames(client, reader, early_frames)
        except (ProtocolError, asyncio.TimeoutError) as error:
            log.info("closing %s: %s", client.name, error or "timed out")
        except (ConnectionError, OSError):
            pass
        finally:
            await self._cleanup(client)

    async def _wait_for_hello(self, client, reader):
        """Read until the first frame arrives, which must be HELLO. Returns any frames that came with it."""
        frames = []
        while not frames:
            data = await asyncio.wait_for(reader.read(READ_SIZE), HELLO_TIMEOUT)
            if not data:
                raise ConnectionError("closed before HELLO")
            frames = client.decoder.feed(data)
        if frames[0].type != FrameType.HELLO:
            raise ProtocolError("first frame must be HELLO")
        client.name = str(frames[0].payload.get("name", "?"))[:MAX_NAME_LENGTH]
        return frames[1:]

    def _register(self, client):
        if len(self.clients) >= self.max_clients:
            raise ProtocolError("too many clients")
        client.writer_task = asyncio.create_task(self._write_loop(client))
        client.offer(encode_frame(FrameType.WELCOME,
                                  {"server": SERVER_NAME, "ping_interval": self.ping_interval}))
        self.clients.add(client)
        self.report(f"connected clients: {len(self.clients)}")

    async def _read_frames(self, client, reader, frames):
        while True:
            for frame in frames:
                if self._handle_frame(client, frame):
                    return
            data = await reader.read(READ_SIZE)
            if not data:
                return
            frames = client.decoder.feed(data)

    def _handle_frame(self, client, frame):
        """Return True when the client said BYE."""
        if frame.type == FrameType.PONG:
            client.missed_pongs = 0
        elif frame.type == FrameType.PING:
            client.offer(encode_frame(FrameType.PONG))
        elif frame.type == FrameType.BYE:
            return True
        return False

    async def _write_loop(self, client):
        try:
            while True:
                data = await client.queue.get()
                client.writer.write(data)
                await asyncio.wait_for(client.writer.drain(), WRITE_TIMEOUT)
                client.overflow_strikes = 0
        except (OSError, asyncio.TimeoutError):
            client.abort()

    async def _cleanup(self, client):
        if client.writer_task:
            client.writer_task.cancel()
        if client in self.clients:
            self.clients.discard(client)
            self.report(f"connected clients: {len(self.clients)}")
        client.writer.close()
        try:
            await client.writer.wait_closed()
        except OSError:
            pass

import asyncio
import random
import time

import pytest

from prolink_net.status_relay.client import StatusClient
from prolink_net.status_relay.protocol import (
    HEADER,
    MAX_PAYLOAD,
    FrameDecoder,
    FrameTooLargeError,
    FrameType,
    ProtocolError,
    encode_frame,
)
from prolink_net.status_relay.server import StatusRelayServer
from prolink_net.status_relay.sources import FakeEventSource, PollingDbEventSource, SourceError

EVENT = {"job_id": "demo-job-001", "from_status": "Open", "to_status": "Assigned",
         "at": "2026-01-01T00:00:00+00:00"}


def quiet_server(**options):
    return StatusRelayServer("127.0.0.1", 0, report=lambda text: None, **options)


class Peer:
    """A hand-driven client: it only does what the test tells it to."""

    def __init__(self, reader, writer):
        self.reader = reader
        self.writer = writer
        self.decoder = FrameDecoder()
        self.frames = []

    @classmethod
    async def connect(cls, port, name="peer"):
        reader, writer = await asyncio.open_connection("127.0.0.1", port)
        peer = cls(reader, writer)
        writer.write(encode_frame(FrameType.HELLO, {"name": name}))
        await writer.drain()
        return peer

    async def next_frame(self, timeout=3.0):
        while not self.frames:
            data = await asyncio.wait_for(self.reader.read(4096), timeout)
            if not data:
                return None
            self.frames.extend(self.decoder.feed(data))
        return self.frames.pop(0)

    async def next_of_type(self, frame_type, timeout=3.0):
        while True:
            frame = await self.next_frame(timeout)
            if frame is None or frame.type == frame_type:
                return frame

    async def wait_for_eof(self, timeout=3.0):
        while await self.next_frame(timeout) is not None:
            pass

    def close(self):
        self.writer.close()


async def wait_until(condition, timeout=3.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if condition():
            return True
        await asyncio.sleep(0.01)
    return False


SAMPLE_STREAM = (encode_frame(FrameType.HELLO, {"name": "tester"})
                 + encode_frame(FrameType.EVENT, EVENT)
                 + encode_frame(FrameType.PING))


async def count_events(peer, wanted):
    received = 0
    while received < wanted:
        await peer.next_of_type(FrameType.EVENT, timeout=3)
        received += 1
    return received


def test_frame_header_bytes():
    frame = encode_frame(FrameType.EVENT, {"a": 1})
    assert frame == bytes.fromhex("03 00 00 00 07 7b 22 61 22 3a 31 7d")
    assert HEADER.size == 5


def test_decoder_works_when_split_at_every_byte_boundary():
    for cut in range(len(SAMPLE_STREAM) + 1):
        decoder = FrameDecoder()
        frames = decoder.feed(SAMPLE_STREAM[:cut]) + decoder.feed(SAMPLE_STREAM[cut:])
        assert [frame.type for frame in frames] == [FrameType.HELLO, FrameType.EVENT, FrameType.PING]
        assert frames[1].payload == EVENT


def test_decoder_works_one_byte_at_a_time():
    decoder = FrameDecoder()
    frames = []
    for index in range(len(SAMPLE_STREAM)):
        frames += decoder.feed(SAMPLE_STREAM[index:index + 1])
    assert len(frames) == 3


def test_decoder_returns_several_frames_from_one_chunk():
    assert len(FrameDecoder().feed(SAMPLE_STREAM * 4)) == 12


def test_oversized_frame_is_rejected_from_the_header_alone():
    header_only = HEADER.pack(int(FrameType.EVENT), MAX_PAYLOAD + 1)
    with pytest.raises(FrameTooLargeError):
        FrameDecoder().feed(header_only)
    with pytest.raises(FrameTooLargeError):
        encode_frame(FrameType.EVENT, {"x": "y" * MAX_PAYLOAD})


@pytest.mark.parametrize("bad", [
    HEADER.pack(99, 2) + b"{}",
    HEADER.pack(int(FrameType.EVENT), 3) + b"not",
    HEADER.pack(int(FrameType.EVENT), 2) + b"[]",
])
def test_decoder_rejects_malformed_frames(bad):
    with pytest.raises(ProtocolError):
        FrameDecoder().feed(bad)


def test_server_closes_connection_on_oversized_frame():
    async def scenario():
        server = quiet_server()
        await server.start()
        peer = await Peer.connect(server.port)
        await peer.next_of_type(FrameType.WELCOME)
        peer.writer.write(HEADER.pack(int(FrameType.EVENT), MAX_PAYLOAD + 1))
        await peer.writer.drain()
        await peer.wait_for_eof()
        await server.stop()

    asyncio.run(scenario())


def test_server_requires_hello_first():
    async def scenario():
        server = quiet_server()
        await server.start()
        reader, writer = await asyncio.open_connection("127.0.0.1", server.port)
        writer.write(encode_frame(FrameType.PONG))
        await writer.drain()
        assert await asyncio.wait_for(reader.read(10), 3) == b""
        await server.stop()

    asyncio.run(scenario())


def test_twelve_clients_all_receive_the_same_event():
    async def scenario():
        server = quiet_server()
        await server.start()
        peers = [await Peer.connect(server.port, f"peer-{n}") for n in range(12)]
        for peer in peers:
            assert (await peer.next_frame()).type == FrameType.WELCOME
        assert await wait_until(lambda: len(server.clients) == 12)
        server.broadcast(EVENT)
        for peer in peers:
            frame = await peer.next_of_type(FrameType.EVENT)
            assert frame.payload == EVENT
        await server.stop()

    asyncio.run(scenario())


def test_slow_client_does_not_delay_the_others():
    async def scenario():
        server = quiet_server(queue_size=20, max_overflow=20)
        await server.start()
        slow = await Peer.connect(server.port, "slow")
        fast = await Peer.connect(server.port, "fast")
        await fast.next_frame()
        assert await wait_until(lambda: len(server.clients) == 2)
        big_event = dict(EVENT, note="x" * 60000)
        counter = asyncio.create_task(count_events(fast, 300))
        started = time.monotonic()
        for _ in range(300):
            server.broadcast(big_event)
            await asyncio.sleep(0.002)
        assert await asyncio.wait_for(counter, 3) == 300
        assert time.monotonic() - started < 3
        assert await wait_until(lambda: len(server.clients) == 1)
        slow.close()
        await server.stop()

    asyncio.run(scenario())


def test_client_that_ignores_ping_is_disconnected():
    async def scenario():
        server = quiet_server(ping_interval=0.1, max_missed_pongs=2)
        await server.start()
        silent = await Peer.connect(server.port, "silent")
        pings = 0
        while (frame := await silent.next_frame(timeout=2)) is not None:
            pings += frame.type == FrameType.PING
        assert pings == 2
        assert await wait_until(lambda: len(server.clients) == 0)
        await server.stop()

    asyncio.run(scenario())


def test_client_that_answers_ping_stays_connected():
    async def scenario():
        server = quiet_server(ping_interval=0.1)
        await server.start()
        client = StatusClient("127.0.0.1", server.port, report=lambda text: None)
        task = asyncio.create_task(client.run_forever())
        await asyncio.sleep(0.8)
        assert len(server.clients) == 1
        task.cancel()
        await server.stop()

    asyncio.run(scenario())


def test_client_reconnects_after_server_restart():
    async def scenario():
        server = quiet_server()
        await server.start()
        port = server.port
        events = []
        client = StatusClient("127.0.0.1", port, on_event=events.append, backoff_start=0.05,
                              report=lambda text: None)
        task = asyncio.create_task(client.run_forever())
        await asyncio.wait_for(client.welcomed.wait(), 3)
        await server.stop()
        assert await wait_until(lambda: not client.welcomed.is_set())
        server = StatusRelayServer("127.0.0.1", port, report=lambda text: None)
        await server.start()
        await asyncio.wait_for(client.welcomed.wait(), 3)
        server.broadcast(EVENT)
        assert await wait_until(lambda: events == [EVENT])
        task.cancel()
        await server.stop()

    asyncio.run(scenario())


def test_fake_source_walks_jobs_through_statuses():
    source = FakeEventSource(job_count=1, rng=random.Random(1))
    events = [source.next_event() for _ in range(6)]
    assert [event["to_status"] for event in events] == [
        "Assigned", "In-Progress", "Completed", "Reviewed", "Open", "Assigned"]
    assert set(events[0]) == {"job_id", "from_status", "to_status", "at"}


def test_db_source_needs_database_url():
    with pytest.raises(SourceError, match="DATABASE_URL"):
        PollingDbEventSource(environ={})

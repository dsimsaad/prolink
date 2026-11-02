"""Frame building and parsing for the live status relay. See PROTOCOL.md.

TCP only delivers a stream of bytes and keeps no message boundaries, so each
message is wrapped in a frame: 1 byte type, 4 byte length, then the payload.
Nothing in this file touches a socket.
"""

import json
import struct
from dataclasses import dataclass
from enum import IntEnum

HEADER = struct.Struct("!BI")
MAX_PAYLOAD = 64 * 1024


class FrameType(IntEnum):
    HELLO = 1
    WELCOME = 2
    EVENT = 3
    PING = 4
    PONG = 5
    BYE = 6


class ProtocolError(Exception):
    """The peer sent bytes that do not follow the protocol; the connection must be closed."""


class FrameTooLargeError(ProtocolError):
    pass


@dataclass
class Frame:
    type: FrameType
    payload: dict


def encode_frame(frame_type, payload=None):
    body = json.dumps(payload or {}, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    if len(body) > MAX_PAYLOAD:
        raise FrameTooLargeError(f"payload of {len(body)} bytes is over the {MAX_PAYLOAD} byte limit")
    return HEADER.pack(int(frame_type), len(body)) + body


def decode_payload(body):
    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ProtocolError(f"payload is not valid UTF-8 JSON: {error}") from error
    if not isinstance(payload, dict):
        raise ProtocolError("payload must be a JSON object")
    return payload


class FrameDecoder:
    """Collects bytes as they arrive and hands back whole frames.

    It does not matter whether bytes come one at a time or ten frames at once.
    """

    def __init__(self):
        self.buffer = bytearray()

    def feed(self, data):
        self.buffer.extend(data)
        frames = []
        while True:
            frame = self._take_frame()
            if frame is None:
                return frames
            frames.append(frame)

    def _take_frame(self):
        if len(self.buffer) < HEADER.size:
            return None
        raw_type, length = HEADER.unpack_from(self.buffer)
        frame_type = self._check_type(raw_type)
        # The length is checked as soon as the header is in, before waiting for
        # the body, so a huge announced length can never make us buffer 4 GB.
        if length > MAX_PAYLOAD:
            raise FrameTooLargeError(f"frame announces {length} bytes, limit is {MAX_PAYLOAD}")
        end = HEADER.size + length
        if len(self.buffer) < end:
            return None
        body = bytes(self.buffer[HEADER.size:end])
        del self.buffer[:end]
        return Frame(frame_type, decode_payload(body))

    @staticmethod
    def _check_type(raw_type):
        try:
            return FrameType(raw_type)
        except ValueError:
            raise ProtocolError(f"unknown frame type {raw_type}") from None

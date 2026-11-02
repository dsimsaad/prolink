# Status relay protocol

The status relay sends live job status events to many console clients over one
TCP connection each. TCP is a byte stream: it keeps the order of the bytes but
not the boundaries between messages. One `recv` can return half a message or
three messages glued together. So every message is wrapped in a **frame**.

## Frame layout

```text
 0        1        2        3        4        5
 +--------+--------+--------+--------+--------+----------------------+
 |  type  |        length (big-endian)        |  payload (UTF-8 JSON)|
 +--------+--------+--------+--------+--------+----------------------+
   1 byte               4 bytes                  `length` bytes
```

- It is built with `struct` format `"!BI"` (network byte order, unsigned
  byte, unsigned 32-bit integer). The header is always 5 bytes.
- The payload is a JSON object encoded as UTF-8. It is `{}` when there is
  nothing to say.
- The largest payload is 65536 bytes (64 KB). A header that announces more is
  a protocol error: the receiver closes the connection without reading the body.
- An unknown type, invalid JSON or a payload that is not an object is also a
  protocol error and closes the connection.

## Frame types

| Value | Name    | Sent by | Payload |
| ----- | ------- | ------- | ------- |
| 1 | HELLO   | client | `{"name": "<client name>"}`, must be the first frame |
| 2 | WELCOME | server | `{"server": "prolink-status-relay", "ping_interval": 15}` |
| 3 | EVENT   | server | `{"job_id", "from_status", "to_status", "at"}` |
| 4 | PING    | server | `{}` |
| 5 | PONG    | client | `{}` |
| 6 | BYE     | either | `{}`, a polite goodbye before closing |

## Conversation

```text
client                         server
  |---- TCP handshake ---------->|
  |---- HELLO {"name": ...} ---->|
  |<--- WELCOME -----------------|
  |<--- EVENT ...                |   as often as events happen
  |<--- PING --------------------|   every 15 seconds
  |---- PONG ------------------->|
  |---- BYE -------------------->|
  |---- FIN -------------------->|
```

A client that has not answered two PING frames is disconnected. A client that
cannot keep up loses its oldest events (they are counted), and a client whose
queue keeps overflowing is disconnected.

## Example frame

An EVENT with payload `{"a":1}` (7 bytes) is these 12 bytes:

```text
03 00 00 00 07 7b 22 61 22 3a 31 7d
```

`03` is EVENT, `00 00 00 07` is the length 7, and the rest is the JSON text.
In Wireshark, use "Follow TCP Stream" and look at the first 5 bytes of every
message.

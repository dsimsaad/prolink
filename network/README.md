# ProLink Computer Networks modules (`network/`)

Python modules written with the standard library only, so the team can explain
every byte that goes over the wire and capture it in Wireshark. They run
**locally on team machines**, beside the product. The ProLink web app, API and
database work without them.

> The DSA work of ProLink is in C#. Nothing here is DSA work.

## What each module teaches

| Module | Package | What you learn |
| --- | --- | --- |
| SMTP client, server and relay | `prolink_net/smtp/` | TCP sockets, a text application protocol (RFC 5321), message format (RFC 5322), STARTTLS (RFC 3207) and TLS, AUTH (RFC 4954), threads and one-thread-per-connection servers, store-and-forward, retries with backoff, loop protection |
| Live status relay | `prolink_net/status_relay/` | TCP as a byte stream, binary framing with `struct`, asyncio concurrency, bounded queues and slow consumers, heartbeat (PING/PONG), reconnect with backoff, graceful shutdown. The wire format is in [PROTOCOL.md](prolink_net/status_relay/PROTOCOL.md) |
| Reserved, empty for now | `dns_tls/`, `websocket/`, `heartbeat/` | DNS and TLS handshake timing, a hand-written WebSocket, a UDP heartbeat monitor |

Not allowed here: `smtplib`, `aiosmtpd`, `socketserver`, `websockets` or any
library that hides the protocol.

## Layout

```text
network/
├── prolink_net/
│   ├── smtp/             client.py, message.py, session.py, server.py, relay.py, __main__.py
│   ├── status_relay/     protocol.py, server.py, client.py, sources.py, PROTOCOL.md
│   ├── dns_tls/  websocket/  heartbeat/     (empty packages)
├── tests/                pytest, all on localhost
├── scripts/stress_relay.py
├── captures/             Wireshark captures (read the warning below first)
├── report/               lab report
├── .env.example          names of environment variables, no values
├── requirements.txt  requirements-dev.txt
```

`session.py`, `message.py` and `protocol.py` contain only pure functions and
state machines, with no sockets, so they are tested in memory.

## Setup

Python 3.12 or newer. Run every command below from the `network/` folder.

macOS:

```bash
cd network
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
```

Windows PowerShell:

```powershell
cd network
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
```

Only the tests need packages. The modules themselves need none.

## Ports

| Port | Used by |
| --- | --- |
| 2525 | SMTP server, or the first relay |
| 2526 | the second relay (next hop) |
| 9099 | status relay |

All servers listen on `127.0.0.1` only. `--host 0.0.0.0` opens them to your
network and prints a warning. Do not do that on a shared network.

## Run the tests

```bash
python -m pytest
```

## SMTP commands

macOS (bash/zsh):

```bash
python -m prolink_net.smtp server
python -m prolink_net.smtp client --sender me@prolink.test --to alice@prolink.test \
    --subject "Hello" --body "First message" --trace
```

Windows PowerShell:

```powershell
python -m prolink_net.smtp server
python -m prolink_net.smtp client --sender me@prolink.test --to alice@prolink.test `
    --subject "Hello" --body "First message" --trace
```

The server accepts mail for `prolink.test` and `localhost` (change with
`--domain`, repeatable). Anything else gets `550 5.7.1 Relaying denied`, so it
is not an open relay.

Useful client options: `--to` takes several addresses, `--starttls`,
`--insecure-skip-verify` (testing only, for the local self-signed certificate),
`--user` with `--auth plain|login`, `--allow-plain-auth` (localhost tests
only), `--trace`. The password is read from `SMTP_PASSWORD` or asked with a
hidden prompt, never from the command line.

Server options: `--port`, `--name`, `--domain`, `--cert` and `--key` (these
turn on STARTTLS), `--max-size` (bytes, default 1 MB), `--mailbox-dir`.
Limits: command lines 512 bytes, text lines 1000 bytes, 60 s idle timeout, 50
connections. AUTH is only offered if `FAKE_SMTP_USER` and `FAKE_SMTP_PASSWORD`
are set when the server starts, and only after STARTTLS when a certificate is
configured.

### Local development certificate

STARTTLS needs a certificate. Make a throwaway self-signed one in `certs/`
(git-ignored through `*.pem`). **Never commit it or any key.**

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/dev-key.pem \
    -out certs/dev-cert.pem -days 30 -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

On Windows, `openssl` comes with Git for Windows
(`C:\Program Files\Git\usr\bin\openssl.exe`). Create the folder with
`mkdir certs` first. Then:

```bash
python -m prolink_net.smtp server --cert certs/dev-cert.pem --key certs/dev-key.pem
python -m prolink_net.smtp client --starttls --insecure-skip-verify --sender me@prolink.test \
    --to alice@prolink.test --body "Encrypted" --trace
```

Without `--insecure-skip-verify` the client checks the certificate and refuses
this self-signed one. That is the correct default.

### Relay

A relay is the same server with `--route domain=host:port`. It forwards mail
for routed domains to the next hop with the client, adds a `Received:` header
at each hop, refuses messages with more than 10 `Received:` headers (mail
loop), and keeps a queue in `queue/` (git-ignored). Temporary failures (4xx,
refused connections) are retried with delays of 2, 4, 8... seconds, then a
note is written to the `failed/` folder inside the queue directory. A static route table is enough for
now; DNS MX lookup is planned for the `dns_tls` module.

## Demonstration walk-through

Use separate terminals, each with the virtual environment active and in `network/`.

**1. Start the server and send a message**

```bash
python -m prolink_net.smtp server
```

```bash
python -m prolink_net.smtp client --sender me@prolink.test --to alice@prolink.test \
    --subject "Hello" --body $'Line one\n.Line that starts with a dot' --trace
```

The trace shows the conversation: `220`, `EHLO`, `250-`/`250 ` capability lines,
`MAIL FROM`, `RCPT TO`, `DATA`, `354`, the message (the dot-stuffed line has
two dots on the wire), `.`, `250`, `QUIT`, `221`.

**2. Watch the .eml file appear**

```bash
ls mailbox/alice@prolink.test/
cat mailbox/alice@prolink.test/*.eml
```

On PowerShell: `Get-ChildItem mailbox\alice@prolink.test` and
`Get-Content mailbox\alice@prolink.test\*.eml`. Notice the `Received:` header
the server put on top.

**3. Two relays, client to A to B**

Stop the server first (Ctrl+C), then:

```bash
python -m prolink_net.smtp relay --port 2526 --name relay-b --domain b.test --queue-dir queue/b
python -m prolink_net.smtp relay --port 2525 --name relay-a --route b.test=127.0.0.1:2526 --queue-dir queue/a
python -m prolink_net.smtp client --sender me@prolink.test --to carol@b.test --body "Across two relays"
cat mailbox/carol@b.test/*.eml
```

The delivered file has two `Received:` headers, newest on top. Try
`--to someone@unknown.test` to see `550 5.7.1`. Stop relay B, send again, and
watch relay A retry; start B again and the message goes through.

**4. Status relay with several clients**

```bash
python -m prolink_net.status_relay server
python -m prolink_net.status_relay client --name one
python -m prolink_net.status_relay client --name two
```

The server prints `connected clients: N` whenever it changes. A made-up job
status event arrives about every 3 seconds on both clients. Stop the server
with Ctrl+C: the clients get BYE, then reconnect with growing delays. Start
the server again and they come back. Then run the stress script:

```bash
python scripts/stress_relay.py --clients 50 --events 200
```

### Optional database source

`--source db` reads new rows from `job_events` every 3 seconds, read-only. It
needs `pip install "psycopg[binary]"` and `DATABASE_URL` in the environment
(never on the command line). It stops with a clear message if either is
missing and never prints the connection string. Set `DATABASE_URL` to a
read-only database user, not to an admin account.

## Wireshark guide

Install Wireshark from wireshark.org. On Windows, the installer offers Npcap;
tick the option to support loopback traffic, or install the "Npcap Loopback
Adapter".

**Capturing loopback traffic**

- macOS: choose the interface `Loopback: lo0`. Running Wireshark may need
  access to `/dev/bpf*`; the installer's "ChmodBPF" package sets that up.
- Windows: choose `Adapter for loopback traffic capture` (Npcap) or the
  `Npcap Loopback Adapter`.

**Capture filters** (typed before you start; they limit what is recorded)

```text
tcp port 2525
tcp port 9099
```

For the two-relay demo use `tcp port 2525 or tcp port 2526`.

**Display filters** (typed in the bar after capturing)

```text
smtp
tls
tcp.port == 9099
tcp.flags.fin == 1
```

Wireshark only decodes SMTP automatically on port 25. For 2525 or 2526 use
Analyze > Decode As... > TCP port 2525 > SMTP.

**What to look for**

- *SMTP command sequence*: right-click a packet > Follow > TCP Stream. You see
  the greeting, `EHLO`, the capability list, `MAIL FROM`, `RCPT TO`, `DATA`,
  the message, `QUIT`. Every line ends with CR LF (`0d 0a`), and the message
  ends with `0d 0a 2e 0d 0a`.
- *STARTTLS*: the stream is readable text until `220 2.0.0 Ready to start TLS`.
  Then a TLS `Client Hello` appears and the rest is unreadable `Application
  Data`. The second `EHLO` and the password data are no longer visible. If
  Wireshark does not switch to TLS decoding, use Decode As > TLS. With TLS 1.3
  even the server certificate is encrypted.
- *Relay frame headers*: open Follow TCP Stream on port 9099 and choose "Hex
  Dump". Every message starts with 5 header bytes: for an EVENT `03` and a
  4-byte length, followed by the JSON. A PING is `04 00 00 00 02 7b 7d`, a
  PONG `05 00 00 00 02 7b 7d`. Watch the PING arrive every 15 seconds.
- *Disconnect*: filter `tcp.flags.fin == 1`. A clean close shows FIN, ACK in
  both directions. A server that was aborted shows a RST instead.

**Safety**

Capture only your own machine's traffic. Use throwaway credentials (the
`FAKE_SMTP_*` test user). **Never commit a capture that contains real
credentials or personal data.** Check a capture with Follow TCP Stream before
you put it in `captures/`. An unencrypted `AUTH` line is base64, not
protection: anyone can decode it.

## Environment variables

Names only are listed in [.env.example](.env.example). The code does not read
`.env` files; set the variables in your shell (`export NAME=...` on macOS,
`$env:NAME = "..."` in PowerShell) and never commit real values.

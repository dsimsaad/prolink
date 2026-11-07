# ProLink Computer Networks Modules (`network/`)

Small local Computer Networks demos built with Python standard libraries and ready-made tools (`smtplib`, `email.message.EmailMessage`, `aiosmtpd`, `websockets`, `trustme`, and `typer`). Every piece runs locally on `127.0.0.1` so the team can inspect real protocol traffic in Wireshark and explain it clearly in the viva.

## Why we do not rent a server

These programs run on team laptops only during tests and demonstrations. The live ProLink website does not depend on them (production realtime updates come from Supabase Realtime). Render's free web services block outbound SMTP ports (`25`, `465`, `587`), and Vercel serverless functions cannot hold long-lived raw sockets, so hosting them in the cloud is neither needed nor supported on the free stack.

## What each piece does

| Piece | File or command | Purpose |
| :--- | :--- | :--- |
| SMTP sender | `smtp_send.py` | Builds an RFC 5322 email with `EmailMessage` and sends it with `smtplib` (supports `--starttls`, `--cafile`, `--user`, and `--trace`). |
| SMTP Maildir server | `python -m aiosmtpd ... Mailbox` | Receives mail and stores messages in a standard Maildir folder (`network/mailbox/`, git-ignored). |
| SMTP relay hop | `python -m aiosmtpd ... smtp_server_tls.Proxy` | Forwards incoming SMTP mail to the next hop using `aiosmtpd.handlers.Proxy`. |
| Dev TLS certificates | `make_certs.py` | Uses `trustme` to generate a local CA (`certs/ca.pem`) and a `localhost` / `127.0.0.1` server certificate (`certs/server.pem`, `certs/server.key`, git-ignored) so clients verify TLS normally. |
| STARTTLS + AUTH server | `smtp_server_tls.py` | Runs an `aiosmtpd` `Controller` with `Mailbox`, `require_starttls=True`, and optional login verification from `FAKE_SMTP_USER` and `FAKE_SMTP_PASSWORD` (not exposed on `aiosmtpd`'s CLI). |
| WebSocket status feed | `status_feed.py` | Broadcasts JSON job-status events (`job_id`, `from_status`, `to_status`, `time`) on `ws://127.0.0.1:9099` using `websockets`' `broadcast` helper, built-in Ping/Pong heartbeat, and `max_size` limit. |
| WebSocket client | `python -m websockets` | Ready-made interactive WebSocket client provided by the `websockets` package. |

## Ports and safety rules

| Port | Service | Default bind |
| :--- | :--- | :--- |
| `2525` | Primary SMTP server, STARTTLS server, or first relay hop | `127.0.0.1` |
| `2526` | Second SMTP relay hop | `127.0.0.1` |
| `2527` | Final-hop SMTP Maildir server in a three-server chain | `127.0.0.1` |
| `9099` | Live status feed (`ws://127.0.0.1:9099`) | `127.0.0.1` |

- All servers bind to `127.0.0.1` by default. Passing another `--host` prints a network exposure warning.
- `smtp_send.py` reads the password only from `SMTP_PASSWORD` or an interactive `getpass` prompt, never from a command-line argument.
- **Credential warning for `--trace`**: `smtplib`'s `--trace` flag (`set_debuglevel(1)`) prints `AUTH` lines as unmasked base64. Base64 is encoding, not encryption, and anyone can decode it. Only use throwaway fake-server credentials (`FAKE_SMTP_USER` / `FAKE_SMTP_PASSWORD`).

## Setup and tests

Run all commands below from `network/` with Python 3.12+.

**macOS / Linux:**

```bash
cd network
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest
```

**Windows PowerShell:**

```powershell
cd network
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
python -m pytest
```

## Demonstration walk-through

Open separate terminals in `network/` with `.venv` activated.

### (a) Run a final-hop mail server with the Mailbox handler

```bash
python -m aiosmtpd -n -l 127.0.0.1:2525 -c aiosmtpd.handlers.Mailbox mailbox
```

### (b) Send a mail with the sender script

**macOS / Linux:**

```bash
python smtp_send.py --to alice@prolink.test --subject "Job Assigned" --body "Plumber is on the way" --trace
```

**Windows PowerShell:**

```powershell
python smtp_send.py --to alice@prolink.test --subject "Job Assigned" --body "Plumber is on the way" --trace
```

### (c) Show the saved file

**macOS / Linux:**

```bash
cat mailbox/new/*
```

**Windows PowerShell:**

```powershell
Get-Content mailbox\new\*
```

Stop the server on port `2525` (`Ctrl+C`) before step `(d)`.

### (d) Start a three-server chain with the Proxy handler and send across it

Start the final Maildir server on `2527`, middle hop B on `2526`, and entry hop A on `2525` (each in its own terminal, same commands on macOS and PowerShell):

```bash
python -m aiosmtpd -n -l 127.0.0.1:2527 -c aiosmtpd.handlers.Mailbox mailbox
python -m aiosmtpd -n -l 127.0.0.1:2526 -c smtp_server_tls.Proxy 127.0.0.1 2527
python -m aiosmtpd -n -l 127.0.0.1:2525 -c smtp_server_tls.Proxy 127.0.0.1 2526
```

Send to the first hop (`2525`) and inspect the delivered Maildir message (notice the `X-Peer` trace headers added across hops):

```bash
python smtp_send.py --port 2525 --to carol@prolink.test --subject "Relay Chain" --body "Across A -> B -> C"
```

Stop all three servers (`Ctrl+C`) before step `(e)`.

### (e) STARTTLS with the dev certificate (and optional AUTH)

Generate the local CA and localhost certificate once:

```bash
python make_certs.py
```

**macOS / Linux** (set throwaway credentials if testing `AUTH`):

```bash
export FAKE_SMTP_USER=demo
export FAKE_SMTP_PASSWORD=<throwaway-test-value>
python smtp_server_tls.py
```

In a second terminal:

```bash
export SMTP_PASSWORD=<throwaway-test-value>
python smtp_send.py --starttls --cafile certs/ca.pem --user demo --to alice@prolink.test --subject "TLS Mail" --trace
```

**Windows PowerShell:**

```powershell
$env:FAKE_SMTP_USER = "demo"
$env:FAKE_SMTP_PASSWORD = "<throwaway-test-value>"
python smtp_server_tls.py
```

In a second PowerShell terminal:

```powershell
$env:SMTP_PASSWORD = "<throwaway-test-value>"
python smtp_send.py --starttls --cafile certs/ca.pem --user demo --to alice@prolink.test --subject "TLS Mail" --trace
```

*(Without `AUTH`, you can also run `python -m aiosmtpd -n -l 127.0.0.1:2525 --tlscert certs/server.pem --tlskey certs/server.key -c aiosmtpd.handlers.Mailbox mailbox` directly.)*

### (f) Live status feed with several built-in clients

Terminal 1 (server):

```bash
python status_feed.py
```

Terminals 2 and 3 (built-in interactive client, same on macOS and PowerShell):

```bash
python -m websockets ws://127.0.0.1:9099
```

Every 3 seconds, every connected client receives the same JSON event, such as `{"job_id": "demo-job-001", "from_status": "Open", "to_status": "Assigned", "time": "..."}`.

## Zero-code demos

With a server running on `127.0.0.1:2525`, you can exercise SMTP without any Python client code:

1. **Type SMTP commands by hand (`nc` / `ncat` / `telnet`)**
   - macOS (`-c` sends CRLF line endings required by RFC 5321): `nc -c 127.0.0.1 2525`
   - Windows: `ncat -C 127.0.0.1 2525` (from Nmap) or `telnet 127.0.0.1 2525`
   - Type in order:
     ```text
     EHLO localhost
     MAIL FROM:<me@prolink.test>
     RCPT TO:<alice@prolink.test>
     DATA
     Subject: Typed by hand

     Hello over raw TCP!
     .
     QUIT
     ```
2. **Watch the STARTTLS upgrade with OpenSSL** (against `smtp_server_tls.py`):
   ```bash
   openssl s_client -starttls smtp -crlf -connect 127.0.0.1:2525 -CAfile certs/ca.pem
   ```
   OpenSSL performs `EHLO` and `STARTTLS`, prints the verified certificate chain, and hands you an interactive encrypted SMTP prompt.
3. **Send an email with `curl`**:
   ```bash
   curl smtp://127.0.0.1:2525 --mail-from me@prolink.test --mail-rcpt alice@prolink.test --upload-file - <<'EOF'
   From: me@prolink.test
   To: alice@prolink.test
   Subject: Sent with curl

   Body sent directly by curl.
   EOF
   ```
   On Windows PowerShell, save those 5 lines to `mail.txt` and run `curl.exe smtp://127.0.0.1:2525 --mail-from me@prolink.test --mail-rcpt alice@prolink.test --upload-file mail.txt`.
4. **Optional no-code web inbox**: **Mailpit** (or **MailHog**) can replace the final-hop `aiosmtpd` `Mailbox` server when you want a browser UI to view received messages.

## What the libraries do for us (viva notes)

### SMTP dialogue (`smtplib` and `aiosmtpd`)

| Step | What goes on the wire | Plain-language purpose | Where to see it in Wireshark |
| :--- | :--- | :--- | :--- |
| `EHLO` | Client sends `EHLO <host>`; server replies `250-...` extensions (`SIZE`, `STARTTLS`, `AUTH`). | Introduces the client and discovers which SMTP extensions the server supports. | Plain SMTP capture (`tcp.port == 2525`, filter `smtp`). |
| `STARTTLS` | Client sends `STARTTLS`; server replies `220 Ready to start TLS`; TLS handshake follows, then a fresh `EHLO`. | Upgrades the existing TCP connection from plaintext to TLS encryption. | STARTTLS capture: last readable `220` before `TLSv1.3 Client Hello` (`smtp or tls`). |
| `AUTH` | Client sends `AUTH PLAIN <base64>` (or `AUTH LOGIN`); server replies `235 2.7.0 Authentication successful`. | Proves the sender's identity using credentials protected inside the TLS tunnel. | Encrypted on the wire (`tls` `Application Data`); visible in `--trace` output only. |
| `MAIL FROM` | `MAIL FROM:<sender> SIZE=<n>` -> `250 OK`. | Starts a mail transaction and sets the bounce/envelope sender address. | Plain SMTP capture (`smtp`). |
| `RCPT TO` | `RCPT TO:<recipient>` -> `250 OK` (repeated per recipient). | Tells the server which envelope mailbox(es) should receive the message. | Plain SMTP capture (`smtp`). |
| `DATA` | `DATA` -> `354 End data with <CR><LF>.<CR><LF>`, RFC 5322 headers + body (dot-stuffed), lone `.` -> `250 OK`. | Transfers the actual email headers and body, ending with `CRLF.CRLF`. | Plain SMTP capture (`Follow -> TCP Stream`). |
| `QUIT` | `QUIT` -> `221 Bye`, followed by TCP `FIN`. | Cleanly ends the SMTP session before closing the socket. | Plain SMTP capture (`smtp` and `tcp.flags.fin == 1`). |

### WebSocket handshake and frames (`websockets`)

| Element | How it works on the wire | Where to see it in Wireshark |
| :--- | :--- | :--- |
| `HTTP Upgrade` | Client sends an HTTP `GET / HTTP/1.1` with `Connection: Upgrade` and `Upgrade: websocket`; server replies `HTTP/1.1 101 Switching Protocols`. | Status feed capture (`tcp.port == 9099`, first two HTTP packets after TCP SYN). |
| `Sec-WebSocket-Key` & `Accept` | Client sends a random 16-byte base64 key; server appends the RFC 6455 GUID, hashes with SHA-1, and returns `Sec-WebSocket-Accept` to prove it speaks WebSocket. | Expand `Hypertext Transfer Protocol` on the `GET` and `101` packets (`tcp.port == 9099`). |
| `opcode` | 4-bit field in byte 0 of each frame: `0x1` text (our JSON events), `0x2` binary, `0x8` close, `0x9` ping, `0xA` pong. | Filter `websocket` -> expand `WebSocket` frame header. |
| `mask` bit | 1-bit flag in byte 1: RFC 6455 requires `1` on client-to-server frames (payload XORed with a 4-byte masking key) and `0` on server-to-client broadcasts. | Compare a server broadcast (`Mask: False`) with a client Pong (`Mask: True`) under `websocket`. |
| `payload length` | 7-bit length (`0–125`), or `126` + 2-byte length, or `127` + 8-byte length (`status_feed.py` caps incoming messages at 64 KiB via `max_size=65536`). | Expand `WebSocket` -> `Payload length` on any event frame. |
| `ping` and `pong` | Every 15 seconds the server sends a `Ping` (`0x9`) frame; the client automatically replies with `Pong` (`0xA`), or the server drops dead peers after 15 seconds. | Leave a client connected for 15+ seconds and filter `websocket.opcode == 9 || websocket.opcode == 10`. |

## Wireshark guide

1. **Select the loopback interface**:
   - **macOS**: choose `Loopback: lo0` (install Wireshark's `ChmodBPF` helper if `/dev/bpf*` permissions are needed).
   - **Windows**: install Wireshark with **Npcap** ("Support loopback traffic" ticked) and choose `Adapter for loopback traffic capture` (Npcap loopback adapter).
2. **Capture filters** (entered before starting capture):
   - SMTP: `tcp port 2525` (or `tcp port 2525 or tcp port 2526 or tcp port 2527` for the proxy chain)
   - Status feed: `tcp port 9099`
3. **Display filters** (entered in the filter bar after capture):
   - `smtp`, `tls`, `websocket`, `tcp.port == 2525`, `tcp.port == 9099`
   - Because port `2525` is non-standard for SMTP, right-click a packet on port `2525` -> **Analyze -> Decode As...** -> set TCP port `2525` to `SMTP`.
4. **What to look for in each capture**:
   - **TCP three-way handshake**: `SYN` -> `SYN, ACK` -> `ACK` opening each connection.
   - **Clear-text SMTP**: `220` banner, `EHLO`, `MAIL FROM`, `RCPT TO`, `DATA`, message headers/body, `.`, `250 OK`, `QUIT`, `221`.
   - **Encrypted bytes after STARTTLS**: plaintext up to `220 Ready to start TLS`, then `Client Hello`, `Server Hello`, and opaque `TLS Application Data` hiding `AUTH` and `DATA`.
   - **HTTP Upgrade and WebSocket frames**: `GET /` -> `101 Switching Protocols`, unmasked server text frames carrying JSON, and masked client `Pong` frames every 15 seconds.
   - **Clean teardown (`FIN`)**: `FIN, ACK` in both directions when a client quits (`tcp.flags.fin == 1`).

> **Capture safety**: Capture only traffic on your own machine (`127.0.0.1`) using throwaway test credentials. Inspect every `.pcapng` with *Follow -> TCP Stream* before saving it, and **never commit captures containing real credentials, keys, or personal email addresses**.

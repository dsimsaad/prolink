# ProLink Computer Networks Modules (`network/`)

## Purpose
This directory contains standalone networking modules, packet captures, and network architecture designs for the Computer Networks (CN) curriculum. These modules operate **beside** the core platform and demonstrate fundamental protocols (TCP, UDP, SMTP, DNS, ICMP, TLS). The main ProLink application operates independently even if these networking modules are disabled or offline.

> **Hosting Constraint**: Raw TCP/UDP sockets cannot run on Vercel's serverless environment. These modules are run locally or on a standalone VM / container host. The implementation language (e.g., Python, C#, or Go) will be finalized during Phase 3.

## Planned Owner
- **Lead**: P1 (Product / Data / SRS Lead)
- **Reviewer**: P3 (C# Engine Lead)

## Planned Structure & Files
```text
network/
├── smtp-client/                 Custom RFC 5321 SMTP client implemented directly over raw TCP sockets
├── health-monitor/              UDP heartbeat listener, ICMP ping latency monitor, DNS lookup and TLS handshake timing
├── tcp-relay/                   Optional lightweight TCP broadcast relay for real-time status fan-out
├── packet-tracer/               Cisco Packet Tracer (.pkt) network topology and IP addressing schemes
├── captures/                    Wireshark packet captures (.pcapng / .pcap) with protocol analysis annotations
└── report/                      Network design documentation, Wireshark analysis findings, and CN lab report
```

## What Will Go Inside
- **`smtp-client/`**: Socket-level implementation of the SMTP protocol communicating with mail transfer agents without high-level helper libraries.
- **`health-monitor/`**: Diagnostics tooling measuring service availability via UDP heartbeats, DNS resolution delays, TLS negotiation overhead, and ICMP ping times.
- **`tcp-relay/`**: Low-level TCP socket server for live status event dissemination.
- **`packet-tracer/`**: Enterprise network topology simulations including VLANs, subnets, NAT, and firewall rules for ProLink's hosting infrastructure.
- **`captures/`**: Annotated packet captures illustrating handshake sequences (TCP 3-way handshake, TLS 1.3 key exchange, SMTP envelope commands).
- **`report/`**: Final Computer Networks project report and protocol benchmarks.

## How to Run: TODO
Run these commands when ready to test the networking tools (exact commands will depend on chosen language):

```bash
# Example if implemented in Python:
# Run SMTP client test
python3 network/smtp-client/client.py --recipient test@example.com

# Run UDP / DNS / TLS health monitor
python3 network/health-monitor/monitor.py --target api.prolink.local

# View Wireshark captures
wireshark network/captures/smtp_handshake.pcapng
```
*(Cisco Packet Tracer topologies should be opened in Cisco Packet Tracer 8.x+).*

"""Relay mode: accept mail for other domains and forward it with the SMTP client.

Messages wait in a small on-disk queue. A background worker tries to
deliver them and retries temporary failures with exponential backoff.
"""

import json
import logging
import os
import threading
import time
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path

from .client import send_mail
from .errors import ConnectionClosedError, SmtpError, TemporaryError
from .message import domain_of
from .server import MailboxHandler

log = logging.getLogger("prolink_net.smtp.relay")

DEFAULT_QUEUE_DIR = Path(__file__).resolve().parents[2] / "queue"


def parse_route(text):
    """Turn 'domain=host:port' into (domain, (host, port))."""
    domain, separator, target = text.partition("=")
    host, colon, port = target.rpartition(":")
    if not (separator and colon and domain and host and port.isdigit()):
        raise ValueError(f"route must look like domain=host:port, got {text!r}")
    return domain.lower(), (host, int(port))


@dataclass
class QueueItem:
    id: str
    sender: str
    recipients: list
    host: str
    port: int
    attempts: int = 0
    next_attempt: float = 0.0
    last_error: str = ""


class MailQueue:
    """One .json file with the envelope and one .eml file with the message per queued item."""

    def __init__(self, directory):
        self.directory = Path(directory)
        self.failed_directory = self.directory / "failed"
        self.failed_directory.mkdir(parents=True, exist_ok=True)

    def add(self, sender, recipients, host, port, data):
        item = QueueItem(uuid.uuid4().hex, sender, list(recipients), host, port)
        self._data_path(item).write_bytes(data)
        self.save(item)
        return item

    def save(self, item):
        """Write to a temporary name and rename, so the worker never reads a half-written file."""
        temporary = self.directory / f"{item.id}.tmp"
        temporary.write_text(json.dumps(asdict(item)), encoding="utf-8")
        os.replace(temporary, self._meta_path(item))

    def due_items(self, now):
        items = []
        for path in sorted(self.directory.glob("*.json")):
            item = QueueItem(**json.loads(path.read_text(encoding="utf-8")))
            if item.next_attempt <= now:
                items.append(item)
        return items

    def read_data(self, item):
        return self._data_path(item).read_bytes()

    def remove(self, item):
        self._meta_path(item).unlink(missing_ok=True)
        self._data_path(item).unlink(missing_ok=True)

    def write_failure_note(self, item, reason):
        """Keep a short note instead of the message body, then drop the queue files."""
        note = (
            f"Delivery failed for queue item {item.id}\n"
            f"Sender: {item.sender}\nRecipients: {', '.join(item.recipients)}\n"
            f"Next hop: {item.host}:{item.port}\nAttempts: {item.attempts}\nReason: {reason}\n"
        )
        (self.failed_directory / f"{item.id}.txt").write_text(note, encoding="utf-8")
        self.remove(item)

    def _meta_path(self, item):
        return self.directory / f"{item.id}.json"

    def _data_path(self, item):
        return self.directory / f"{item.id}.eml"


class RelayHandler(MailboxHandler):
    """Local domains go to the mailbox, routed domains go to the queue, everything else is refused."""

    def __init__(self, queue, routes, mailbox_dir, local_domains):
        super().__init__(mailbox_dir, local_domains)
        self.queue = queue
        self.routes = routes

    def check_recipient(self, address):
        if self.is_local(address) or domain_of(address) in self.routes:
            return None
        return 550, "5.7.1 Relaying denied"

    def deliver(self, envelope):
        by_domain = {}
        for recipient in envelope.recipients:
            if self.is_local(recipient):
                self.store_message(recipient, envelope.data)
            else:
                by_domain.setdefault(domain_of(recipient), []).append(recipient)
        for domain, recipients in by_domain.items():
            host, port = self.routes[domain]
            item = self.queue.add(envelope.sender, recipients, host, port, envelope.data)
            log.info("queued %s for %s via %s:%d", item.id[:8], domain, host, port)
        return 250, "2.0.0 Message accepted"


class RetryPolicy:
    def __init__(self, max_attempts=5, base_delay=1.0, max_delay=300.0):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay

    def delay_after(self, attempts):
        """Wait base, 2x base, 4x base ... but never more than max_delay."""
        return min(self.max_delay, self.base_delay * 2 ** (attempts - 1))


class RelayWorker:
    def __init__(self, queue, policy, local_name, send=send_mail, poll_interval=0.2):
        self.queue = queue
        self.policy = policy
        self.local_name = local_name
        self.send = send
        self.poll_interval = poll_interval
        self.stop_event = threading.Event()
        self.thread = None

    def start(self):
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.stop_event.set()
        if self.thread is not None:
            self.thread.join(timeout=2)

    def _loop(self):
        while not self.stop_event.wait(self.poll_interval):
            self.run_once(time.time())

    def run_once(self, now):
        for item in self.queue.due_items(now):
            self._attempt(item, now)

    def _attempt(self, item, now):
        try:
            data = self.queue.read_data(item)
            self.send(item.host, item.port, item.sender, item.recipients, data,
                      local_name=self.local_name)
        except (TemporaryError, ConnectionClosedError, OSError) as error:
            self._retry_later(item, now, error)
        except SmtpError as error:
            self.queue.write_failure_note(item, f"permanent failure: {error}")
        else:
            self.queue.remove(item)
            log.info("delivered %s", item.id[:8])

    def _retry_later(self, item, now, error):
        item.attempts += 1
        item.last_error = str(error)
        if item.attempts >= self.policy.max_attempts:
            self.queue.write_failure_note(item, f"gave up after {item.attempts} attempts: {error}")
            return
        item.next_attempt = now + self.policy.delay_after(item.attempts)
        self.queue.save(item)
        log.info("temporary failure for %s, retry in %.1fs", item.id[:8],
                 self.policy.delay_after(item.attempts))

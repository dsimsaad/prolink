"""Where job status events come from.

An EventSource is an async iterator of dictionaries with the keys
job_id, from_status, to_status and at.
"""

import asyncio
import os
import random
from datetime import datetime, timezone

STATUS_FLOW = ["Open", "Assigned", "In-Progress", "Completed", "Reviewed"]
DB_POLL_SECONDS = 3.0
DB_BATCH_LIMIT = 100


class SourceError(Exception):
    """The chosen event source cannot start; the message says why."""


class EventSource:
    async def events(self):
        raise NotImplementedError
        yield


def utc_now_text():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class FakeEventSource(EventSource):
    """Makes up a status change every few seconds for a few pretend jobs."""

    def __init__(self, interval=3.0, job_count=5, rng=None):
        self.interval = interval
        self.rng = rng or random.Random()
        self.progress = {f"demo-job-{number:03d}": 0 for number in range(1, job_count + 1)}

    def next_event(self):
        job_id = self.rng.choice(list(self.progress))
        step = self.progress[job_id]
        if step == len(STATUS_FLOW) - 1:
            self.progress[job_id] = step = 0
            return self._event(job_id, None, STATUS_FLOW[0])
        self.progress[job_id] = step + 1
        return self._event(job_id, STATUS_FLOW[step], STATUS_FLOW[step + 1])

    @staticmethod
    def _event(job_id, from_status, to_status):
        return {"job_id": job_id, "from_status": from_status, "to_status": to_status,
                "at": utc_now_text()}

    async def events(self):
        while True:
            await asyncio.sleep(self.interval)
            yield self.next_event()


class PollingDbEventSource(EventSource):
    """Reads new rows of job_events every 3 seconds. Read-only and off by default."""

    # Parameters are passed separately from the SQL text, never formatted into it.
    LATEST_QUERY = "SELECT max(at) FROM public.job_events"
    NEW_ROWS_QUERY = (
        "SELECT job_id::text, from_status, to_status, at FROM public.job_events "
        "WHERE at > %s ORDER BY at ASC LIMIT %s"
    )

    def __init__(self, environ=None, poll_seconds=DB_POLL_SECONDS):
        environ = os.environ if environ is None else environ
        self.database_url = environ.get("DATABASE_URL")
        if not self.database_url:
            raise SourceError("the db source needs the DATABASE_URL environment variable")
        try:
            import psycopg
        except ImportError:
            raise SourceError("the db source needs psycopg: pip install psycopg[binary]") from None
        self.psycopg = psycopg
        self.poll_seconds = poll_seconds

    def _connect(self):
        connection = self.psycopg.connect(self.database_url, connect_timeout=10)
        connection.read_only = True
        return connection

    def read_new_events(self, connection, last_seen):
        with connection.cursor() as cursor:
            cursor.execute(self.NEW_ROWS_QUERY, (last_seen, DB_BATCH_LIMIT))
            return cursor.fetchall()

    def _newest_timestamp(self, connection):
        with connection.cursor() as cursor:
            cursor.execute(self.LATEST_QUERY)
            return cursor.fetchone()[0] or datetime.now(timezone.utc)

    async def events(self):
        """Poll in a worker thread so the blocking database driver never stalls the event loop."""
        try:
            connection = await asyncio.to_thread(self._connect)
        except Exception as error:
            # The error type is enough; the message could contain the connection string.
            raise SourceError(f"could not connect to the database ({type(error).__name__})") from None
        try:
            last_seen = await asyncio.to_thread(self._newest_timestamp, connection)
            while True:
                await asyncio.sleep(self.poll_seconds)
                rows = await asyncio.to_thread(self.read_new_events, connection, last_seen)
                for job_id, from_status, to_status, at in rows:
                    last_seen = at
                    yield {"job_id": job_id, "from_status": from_status, "to_status": to_status,
                           "at": at.isoformat(timespec="seconds")}
        finally:
            await asyncio.to_thread(connection.close)


def create_source(name, environ=None):
    if name == "fake":
        return FakeEventSource()
    if name == "db":
        return PollingDbEventSource(environ)
    raise SourceError(f"unknown source {name!r}")

"""Server-only Supabase access and root-level environment configuration."""

import logging
import os
from functools import lru_cache
from pathlib import Path

from dotenv import dotenv_values
from pydantic import ValidationError
from supabase import Client, create_client
from supabase.client import ClientOptions

from app.schemas import TrainingJob

LOGGER = logging.getLogger(__name__)
ROOT_DIR = Path(__file__).resolve().parents[2]


def load_environment(root: Path = ROOT_DIR) -> None:
    """Load .env, then .env.local; process environment always takes priority."""
    values = {
        **dotenv_values(root / ".env"),
        **dotenv_values(root / ".env.local"),
    }
    for name, value in values.items():
        if value is not None:
            os.environ.setdefault(name, value)


@lru_cache(maxsize=1)
def get_supabase_client() -> Client | None:
    """Create one service-role client per process, or None if unconfigured.

    Never expose this key to the frontend. No network query happens until a
    database operation is executed. Client errors are handled by the caller.
    """
    load_environment()
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not url or not key:
        LOGGER.warning("Supabase credentials missing; synthetic training is available.")
        return None
    return create_client(
        url,
        key,
        options=ClientOptions(
            postgrest_client_timeout=10,
            persist_session=False,
            auto_refresh_token=False,
        ),
    )


def fetch_training_jobs(*, page_size: int = 500, max_records: int = 10_000) -> list[TrainingJob]:
    """Read labeled jobs with pagination and the schema's categories join.

    Missing credentials, query failures, and an empty table return an empty
    list so startup can use synthetic data. Invalid rows are skipped. The
    query is read-only and never logs credentials or private job content.
    """
    if not 1 <= page_size <= 1000 or max_records < 1:
        raise ValueError("page_size must be 1..1000 and max_records must be positive")
    jobs: list[TrainingJob] = []
    try:
        client = get_supabase_client()
        if client is None:
            return []
        offset = 0
        while offset < max_records:
            batch_size = min(page_size, max_records - offset)
            rows = (
                client.table("jobs")
                .select("title,description,categories!inner(name)")
                .order("id")
                .range(offset, offset + batch_size - 1)
                .execute()
                .data
            )
            if not rows:
                break
            for row in rows:
                category = row.get("categories")
                if not isinstance(category, dict):
                    continue
                try:
                    jobs.append(TrainingJob(
                        title=row.get("title"),
                        description=row.get("description"),
                        category=category.get("name"),
                    ))
                except ValidationError:
                    continue
            offset += len(rows)
            # Continue after short pages: the server may impose a lower row cap.
    except Exception as exc:
        # A sanitized warning distinguishes database failure from an empty table.
        LOGGER.warning("Supabase training fetch failed (%s); using synthetic data.", type(exc).__name__)
        return []
    LOGGER.info("Fetched %d valid training jobs from Supabase.", len(jobs))
    return jobs

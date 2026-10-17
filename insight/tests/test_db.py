"""Verify Supabase integration against a fake client; never use real credentials."""

from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from app import db


def test_environment_precedence(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    (tmp_path / ".env").write_text("INSIGHT_TEST_FILE=base\nINSIGHT_TEST_PROCESS=base\n")
    (tmp_path / ".env.local").write_text("INSIGHT_TEST_FILE=local\nINSIGHT_TEST_PROCESS=local\n")
    monkeypatch.delenv("INSIGHT_TEST_FILE", raising=False)
    monkeypatch.setenv("INSIGHT_TEST_PROCESS", "process")
    db.load_environment(tmp_path)
    assert db.os.environ["INSIGHT_TEST_FILE"] == "local"
    assert db.os.environ["INSIGHT_TEST_PROCESS"] == "process"


def test_missing_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(db, "load_environment", lambda: None)
    monkeypatch.setenv("SUPABASE_URL", "")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "")
    db.get_supabase_client.cache_clear()
    try:
        assert db.get_supabase_client() is None
    finally:
        db.get_supabase_client.cache_clear()


def test_join_pagination_and_invalid_rows(monkeypatch: pytest.MonkeyPatch) -> None:
    client = Mock()
    query = client.table.return_value
    query.select.return_value = query
    query.order.return_value = query
    query.range.return_value = query
    query.execute.side_effect = [
        SimpleNamespace(data=[
            {"title": "tap leak", "description": "water leaking", "categories": {"name": "Plumbing"}},
            {"title": "  ", "description": "invalid", "categories": {"name": "Electrical"}},
        ]),
        SimpleNamespace(data=[
            {"title": "socket", "description": "sparking outlet", "categories": {"name": "Electrical"}},
        ]),
        SimpleNamespace(data=[]),
    ]
    monkeypatch.setattr(db, "get_supabase_client", lambda: client)
    jobs = db.fetch_training_jobs(page_size=2)
    assert [job.category for job in jobs] == ["Plumbing", "Electrical"]
    query.select.assert_called_with("title,description,categories!inner(name)")
    assert [call.args for call in query.range.call_args_list] == [(0, 1), (2, 3), (3, 4)]


def test_database_failure_is_sanitized(monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
    monkeypatch.setattr(db, "get_supabase_client", Mock(side_effect=RuntimeError("secret-credential")))
    assert db.fetch_training_jobs() == []
    assert "secret-credential" not in caplog.text
    assert "RuntimeError" in caplog.text

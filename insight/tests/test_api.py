"""Exercise the real FastAPI lifecycle and inference without network access."""

from pathlib import Path
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

import app.classifier as classifier_module
import main
from app.classifier import JobClassifier


@pytest.fixture
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    monkeypatch.setattr(classifier_module, "fetch_training_jobs", lambda: [])
    monkeypatch.setattr(main, "JobClassifier", lambda: JobClassifier(tmp_path / "classifier.pkl"))
    with TestClient(main.app) as test_client:
        yield test_client


def test_classify_endpoint(client: TestClient) -> None:
    response = client.post("/classify", json={
        "title": "Leaking pipe", "description": "Need a plumber for a bathroom water leak.",
    })
    assert response.status_code == 200
    result = response.json()
    assert set(result) == {"suggested_category", "confidence", "is_fallback"}
    assert result["suggested_category"] == "Plumbing"
    assert 0.35 <= result["confidence"] <= 1
    assert result["is_fallback"] is False


@pytest.mark.parametrize("payload", [
    {}, {"title": "missing description"}, {"title": "   ", "description": "test"},
    {"title": "test", "description": ""}, {"title": 123, "description": "test"},
    {"title": "x" * 201, "description": "test"},
    {"title": "test", "description": "x" * 10_001},
])
def test_invalid_requests(client: TestClient, payload: dict[str, object]) -> None:
    assert client.post("/classify", json=payload).status_code == 422


def test_fallback_endpoint(client: TestClient) -> None:
    result = client.post("/classify", json={"title": "qzxvbnm", "description": "asdfghjkl"}).json()
    assert result == {"suggested_category": "General / Uncategorized", "confidence": 0.0, "is_fallback": True}


def test_cors_preflight(client: TestClient) -> None:
    response = client.options("/classify", headers={
        "Origin": main.origins[0], "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type",
    })
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == main.origins[0]


def test_unlisted_origin_is_rejected(client: TestClient) -> None:
    response = client.options("/classify", headers={
        "Origin": "https://unlisted.example", "Access-Control-Request-Method": "POST",
    })
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_existing_endpoints(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok", "service": "insight"}
    response = client.post("/match", json={"category": "Plumbing", "professionals": [
        {"name": "Ali", "category": "Plumbing", "rating": 5, "distance_km": 1},
        {"name": "Sara", "category": "Electrical", "rating": 5, "distance_km": 0},
    ]})
    assert response.status_code == 200
    assert response.json()["matches"][0]["name"] == "Ali"
    assert len(response.json()["matches"]) == 1

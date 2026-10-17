"""Offline tests for training, persistence, confidence, and corrupt artifacts."""

from pathlib import Path
from unittest.mock import Mock

import numpy as np
import pytest

import app.classifier as module
from app.classifier import FALLBACK_CATEGORY, JobClassifier
from app.schemas import TrainingJob
from generator.synthetic_data import SERVICE_EXAMPLES, generate_synthetic_jobs


@pytest.fixture
def classifier(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> JobClassifier:
    """Train in a temporary directory without accessing a live database."""
    monkeypatch.setattr(module, "fetch_training_jobs", lambda: [])
    model = JobClassifier(tmp_path / "classifier.pkl")
    model.load_or_train()
    return model


@pytest.mark.parametrize(("title", "description", "category"), [
    ("Leaking sink pipe", "Need a plumber to fix the bathroom tap and water drain.", "Plumbing"),
    ("AC not cooling", "Air conditioner needs gas refill and compressor service.", "AC repair and installation"),
    ("Circuit breaker tripping", "Electrical wiring sparks at the power socket.", "Electrical"),
])
def test_known_jobs(classifier: JobClassifier, title: str, description: str, category: str) -> None:
    result = classifier.classify(title, description)
    assert result.suggested_category == category
    assert result.confidence >= 0.35
    assert result.is_fallback is False


def test_unknown_vocabulary(classifier: JobClassifier) -> None:
    result = classifier.classify("qzxvbnm", "asdfghjkl")
    assert result.suggested_category == FALLBACK_CATEGORY
    assert result.confidence == 0.0
    assert result.is_fallback is True


@pytest.mark.parametrize(("confidence", "expected_fallback"), [(0.349, True), (0.35, False)])
def test_exact_confidence_boundary(
    classifier: JobClassifier, confidence: float, expected_fallback: bool,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    estimator = classifier.pipeline.named_steps["classifier"]
    remainder = (1 - confidence) / (len(estimator.classes_) - 1)
    scores = np.full((1, len(estimator.classes_)), remainder)
    scores[0, 0] = confidence
    monkeypatch.setattr(estimator, "predict_proba", lambda _: scores)
    result = classifier.classify("plumbing", "leaking tap")
    assert result.is_fallback is expected_fallback
    assert (result.suggested_category == FALLBACK_CATEGORY) is expected_fallback


def test_reload_skips_database_and_training(classifier: JobClassifier, monkeypatch: pytest.MonkeyPatch) -> None:
    database = Mock(side_effect=AssertionError("A saved model should avoid the database"))
    monkeypatch.setattr(module, "fetch_training_jobs", database)
    reloaded = JobClassifier(classifier.model_path)
    reloaded.load_or_train()
    assert reloaded.classify("Leaking tap", "plumber needed") == classifier.classify("Leaking tap", "plumber needed")
    database.assert_not_called()


def test_corrupt_model_retrains(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    path = tmp_path / "classifier.pkl"
    path.write_bytes(b"not a pickle")
    monkeypatch.setattr(module, "fetch_training_jobs", lambda: [])
    model = JobClassifier(path)
    model.load_or_train()
    assert model.training_source == "synthetic"
    assert model.classify("leaking pipe", "plumbing repair").is_fallback is False


def test_database_records_are_used(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    records = [
        TrainingJob(title="tap leak", description="plumbing water pipe repair", category="Plumbing"),
        TrainingJob(title="power socket", description="electric wiring breaker repair", category="Electrical"),
    ] * 5
    monkeypatch.setattr(module, "fetch_training_jobs", lambda: records)
    model = JobClassifier(tmp_path / "classifier.pkl")
    model.load_or_train()
    assert model.training_source == "supabase"
    assert set(model.pipeline.classes_) == {"Plumbing", "Electrical"}


def test_one_class_is_augmented(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    record = TrainingJob(title="tap", description="plumbing repair", category="Plumbing")
    monkeypatch.setattr(module, "fetch_training_jobs", lambda: [record])
    model = JobClassifier(tmp_path / "classifier.pkl")
    model.load_or_train()
    assert model.training_source == "supabase+synthetic"


def test_unusable_database_text_falls_back(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    records = [
        TrainingJob(title="!!!", description="...", category="Plumbing"),
        TrainingJob(title="???", description="...", category="Electrical"),
    ]
    monkeypatch.setattr(module, "fetch_training_jobs", lambda: records)
    model = JobClassifier(tmp_path / "classifier.pkl")
    model.load_or_train()
    assert model.training_source == "synthetic"


def test_read_only_storage_serves_from_memory(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(module, "fetch_training_jobs", lambda: [])
    monkeypatch.setattr(module.os, "replace", Mock(side_effect=PermissionError))
    model = JobClassifier(tmp_path / "classifier.pkl")
    model.load_or_train()
    assert model.pipeline is not None
    assert not model.model_path.exists()
    assert not list(tmp_path.glob("*.tmp"))


def test_generator_is_balanced_and_reproducible() -> None:
    first = generate_synthetic_jobs(4, seed=7)
    assert first == generate_synthetic_jobs(4, seed=7)
    assert len(first) == 4 * len(SERVICE_EXAMPLES)
    assert {job.category for job in first} == set(SERVICE_EXAMPLES)

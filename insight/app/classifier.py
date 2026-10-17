"""TF-IDF / logistic regression classification with local model persistence."""

import logging
import os
import tempfile
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.utils.validation import check_is_fitted

from app.db import fetch_training_jobs
from app.schemas import ClassifyResponse
from generator.synthetic_data import generate_synthetic_jobs

LOGGER = logging.getLogger(__name__)
MODEL_PATH = Path(__file__).resolve().parents[1] / "models/classifier.pkl"
FALLBACK_CATEGORY = "General / Uncategorized"
CONFIDENCE_THRESHOLD = 0.35
ARTIFACT_VERSION = 1


class JobClassifier:
    """Load once at startup and perform read-only inference in request threads.

    Only load artifacts created by this service from a trusted local directory:
    joblib/pickle files can execute code. Model probabilities are baseline scores,
    not an accuracy guarantee, particularly when trained on synthetic data.
    """

    def __init__(self, model_path: Path = MODEL_PATH) -> None:
        self.model_path = model_path
        self.pipeline: Pipeline | None = None
        self.training_source: str | None = None

    def load_or_train(self) -> None:
        """Load a compatible fitted artifact; otherwise train and persist it."""
        if self.pipeline is not None:
            return
        if self.model_path.is_file():
            try:
                artifact: Any = joblib.load(self.model_path)
                if (
                    not isinstance(artifact, dict)
                    or artifact.get("artifact_version") != ARTIFACT_VERSION
                    or artifact.get("sklearn_version") != sklearn.__version__
                ):
                    raise ValueError("Unsupported model artifact version")
                pipeline = artifact.get("pipeline")
                if not isinstance(pipeline, Pipeline):
                    raise ValueError("Model artifact is not a pipeline")
                check_is_fitted(pipeline.named_steps["tfidf"])
                check_is_fitted(pipeline.named_steps["classifier"])
                # Probe inference to detect incompatible/corrupt pipeline contents.
                pipeline.predict_proba(["model readiness check"])
                self.pipeline = pipeline
                self.training_source = artifact.get("training_source", "unknown")
                LOGGER.info("Loaded classifier trained from %s.", self.training_source)
                return
            except Exception as exc:
                LOGGER.warning("Classifier artifact could not be loaded (%s); retraining.", type(exc).__name__)

        jobs = fetch_training_jobs()
        self.training_source = "supabase"
        if not jobs:
            jobs = generate_synthetic_jobs()
            self.training_source = "synthetic"
        elif len({job.category for job in jobs}) < 2:
            # Logistic regression requires at least two distinct target classes.
            jobs = jobs + generate_synthetic_jobs()
            self.training_source = "supabase+synthetic"
        LOGGER.info("Training classifier on %d jobs (%s).", len(jobs), self.training_source)
        pipeline = Pipeline([
            ("tfidf", TfidfVectorizer(
                lowercase=True, strip_accents="unicode", ngram_range=(1, 2),
                sublinear_tf=True, max_features=30_000,
            )),
            ("classifier", LogisticRegression(
                max_iter=1000, class_weight="balanced", random_state=42,
            )),
        ])
        try:
            pipeline.fit(
                [f"{job.title} {job.description}" for job in jobs],
                [job.category for job in jobs],
            )
        except ValueError:
            if self.training_source == "synthetic":
                raise
            # Valid text fields can still contain no usable tokens (e.g. "!!!").
            LOGGER.warning("Database training text was unusable; using synthetic data.")
            jobs = generate_synthetic_jobs()
            self.training_source = "synthetic"
            pipeline.fit(
                [f"{job.title} {job.description}" for job in jobs],
                [job.category for job in jobs],
            )
        self.pipeline = pipeline
        self._save()

    def _save(self) -> None:
        """Atomically replace the artifact; stay usable if storage is read-only."""
        temporary_path: Path | None = None
        try:
            self.model_path.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(
                dir=self.model_path.parent, prefix="classifier-", suffix=".tmp", delete=False,
            ) as temporary:
                temporary_path = Path(temporary.name)
            joblib.dump({
                "artifact_version": ARTIFACT_VERSION,
                "sklearn_version": sklearn.__version__,
                "training_source": self.training_source,
                "pipeline": self.pipeline,
            }, temporary_path, compress=3)
            os.replace(temporary_path, self.model_path)
        except OSError as exc:
            LOGGER.warning("Could not persist classifier (%s); serving from memory.", type(exc).__name__)
        finally:
            if temporary_path is not None:
                try:
                    temporary_path.unlink(missing_ok=True)
                except OSError:
                    LOGGER.warning("Could not remove a temporary classifier artifact.")

    def classify(self, title: str, description: str) -> ClassifyResponse:
        """Return the best category, abstaining below 0.35 or on unknown text."""
        if self.pipeline is None:
            raise RuntimeError("Classifier must be initialized before inference")
        text = f"{title} {description}"
        features = self.pipeline.named_steps["tfidf"].transform([text])
        if features.nnz == 0:
            return ClassifyResponse(
                suggested_category=FALLBACK_CATEGORY, confidence=0.0, is_fallback=True,
            )
        probabilities = self.pipeline.named_steps["classifier"].predict_proba(features)[0]
        index = int(np.argmax(probabilities))
        confidence = float(probabilities[index])
        is_fallback = confidence < CONFIDENCE_THRESHOLD
        category = str(self.pipeline.classes_[index])
        return ClassifyResponse(
            suggested_category=FALLBACK_CATEGORY if is_fallback else category,
            confidence=confidence,
            is_fallback=is_fallback,
        )

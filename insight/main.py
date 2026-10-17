"""ProLink Insight API. Run from insight/ with uvicorn main:app --port 8000."""

import asyncio
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.classifier import JobClassifier
from app.db import load_environment
from app.schemas import ClassifyRequest, ClassifyResponse


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    """Initialize the shared model before requests, without blocking the event loop."""
    classifier = JobClassifier()
    await asyncio.to_thread(classifier.load_or_train)
    application.state.classifier = classifier
    try:
        yield
    finally:
        del application.state.classifier


load_environment()
app = FastAPI(title="ProLink Insight Service", version="0.1.0", lifespan=lifespan)

origins = [
    origin.strip()
    for origin in (os.getenv("ALLOWED_ORIGINS") or "http://localhost:3000").split(",")
    if origin.strip()
] or ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


class Professional(BaseModel):
    """An existing candidate supplied to the matching endpoint."""

    name: str
    category: str
    rating: float
    distance_km: float


class Job(BaseModel):
    """The existing matching request contract."""

    category: str
    professionals: list[Professional]


@app.get("/health")
def health() -> dict[str, str]:
    """Report readiness after the classifier's startup initialization."""
    return {"status": "ok", "service": "insight"}


@app.post("/classify", response_model=ClassifyResponse)
def classify_job(job: ClassifyRequest, request: Request) -> ClassifyResponse:
    """Suggest a job category, abstaining when the confidence is below 0.35."""
    classifier: JobClassifier = request.app.state.classifier
    return classifier.classify(job.title, job.description)


@app.post("/match")
def match_professionals(job: Job) -> dict[str, Any]:
    """Preserve the existing category, rating, and distance matching behavior."""
    results = []

    for professional in job.professionals:
        # Ignore professionals from unrelated categories.
        if professional.category.lower() != job.category.lower():
            continue

        # Give higher ratings and shorter distances better scores.
        rating_score = (professional.rating / 5) * 70
        distance_score = max(0, 30 - professional.distance_km * 3)

        score = round(rating_score + distance_score, 2)

        results.append({
            "name": professional.name,
            "rating": professional.rating,
            "distance_km": professional.distance_km,
            "match_score": score,
        })

    results.sort(
        key=lambda professional: professional["match_score"],
        reverse=True,
    )

    return {
        "job_category": job.category,
        "matches": results,
    }


import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="ProLink Insight Service")

origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000"
    ).split(",")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


class Professional(BaseModel):
    name: str
    category: str
    rating: float
    distance_km: float


class Job(BaseModel):
    category: str
    professionals: list[Professional]


@app.get("/health")
def health():
    return {"status": "ok", "service": "insight"}


@app.post("/match")
def match_professionals(job: Job):
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

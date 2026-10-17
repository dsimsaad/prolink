"""Validated API contracts and internal training records."""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

NonEmptyText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class ClassifyRequest(BaseModel):
    """A job's user-supplied text; blank or oversized fields are rejected."""

    model_config = ConfigDict(extra="forbid")

    title: NonEmptyText = Field(max_length=200)
    description: NonEmptyText = Field(max_length=10_000)


class ClassifyResponse(BaseModel):
    """Top model probability and the category, or an explicit fallback."""

    suggested_category: str
    confidence: float = Field(ge=0.0, le=1.0)
    is_fallback: bool


class TrainingJob(BaseModel):
    """Normalized job text paired with the database's category name."""

    title: NonEmptyText
    description: NonEmptyText
    category: NonEmptyText

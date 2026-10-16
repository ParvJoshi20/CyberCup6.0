"""In-memory review workflow for security events."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from threading import RLock
from uuid import uuid4


class ReviewStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


@dataclass(frozen=True)
class ReviewCase:
    review_id: str
    request_id: str
    category: str
    summary: str
    status: ReviewStatus
    created_at: str
    decided_at: str | None = None
    decided_by: str | None = None
    decision_note: str | None = None


class ReviewService:
    """Manage review cases in memory.

    Store only safe summaries, not raw prompts, credentials, or model output.
    This store is temporary and is cleared when the process restarts.
    """

    def __init__(self) -> None:
        self._cases: dict[str, ReviewCase] = {}
        self._lock = RLock()

    def create_case(
        self,
        *,
        request_id: str,
        category: str,
        summary: str,
    ) -> ReviewCase:
        """Create a pending case using a safe, pre-approved summary."""
        if not request_id.strip():
            raise ValueError("request_id must not be empty.")
        if not category.strip():
            raise ValueError("category must not be empty.")
        if not summary.strip():
            raise ValueError("summary must not be empty.")

        case = ReviewCase(
            review_id=str(uuid4()),
            request_id=request_id,
            category=category,
            summary=summary,
            status=ReviewStatus.PENDING,
            created_at=datetime.now(timezone.utc).isoformat(),
        )

        with self._lock:
            self._cases[case.review_id] = case

        return case

    def list_pending(self) -> list[ReviewCase]:
        """Return pending cases, oldest first."""
        with self._lock:
            return sorted(
                (
                    case for case in self._cases.values()
                    if case.status == ReviewStatus.PENDING
                ),
                key=lambda case: case.created_at,
            )

    def get_case(self, review_id: str) -> ReviewCase:
        """Return a case or raise KeyError when it does not exist."""
        with self._lock:
            case = self._cases.get(review_id)
            if case is None:
                raise KeyError("Review case not found.")
            return case

    def decide(
        self,
        *,
        review_id: str,
        decision: ReviewStatus,
        reviewer_id: str,
        note: str | None = None,
    ) -> ReviewCase:
        """Approve or reject a pending case exactly once."""
        if decision not in (ReviewStatus.APPROVED, ReviewStatus.REJECTED):
            raise ValueError("Decision must be approved or rejected.")
        if not reviewer_id.strip():
            raise ValueError("reviewer_id must not be empty.")
        if note is not None and len(note) > 1000:
            raise ValueError("Decision note must not exceed 1000 characters.")

        with self._lock:
            case = self._cases.get(review_id)
            if case is None:
                raise KeyError("Review case not found.")
            if case.status != ReviewStatus.PENDING:
                raise ValueError("Review case has already been decided.")

            updated = ReviewCase(
                review_id=case.review_id,
                request_id=case.request_id,
                category=case.category,
                summary=case.summary,
                status=decision,
                created_at=case.created_at,
                decided_at=datetime.now(timezone.utc).isoformat(),
                decided_by=reviewer_id,
                decision_note=note,
            )
            self._cases[review_id] = updated
            return updated


_review_service = ReviewService()


def get_review_service() -> ReviewService:
    """Return the process-wide review service."""
    return _review_service

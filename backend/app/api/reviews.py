"""Authorized API endpoints for human review of security events."""

from dataclasses import dataclass
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from app.audit.audit import AuditLogger, get_audit_logger
from app.reviews.service import (
    ReviewCase,
    ReviewService,
    ReviewStatus,
    get_review_service,
)
from app.security.authorization import Permission
from app.security.dependencies import Principal, require_authorization


router = APIRouter(prefix="/reviews", tags=["Security Reviews"])


class ReviewCaseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    review_id: str
    request_id: str
    category: str
    summary: str
    status: ReviewStatus
    created_at: str
    decided_at: str | None = None
    decided_by: str | None = None
    decision_note: str | None = None


class ReviewDecisionRequest(BaseModel):
    decision: Literal["approved", "rejected"]
    note: str | None = Field(default=None, max_length=1000)


@router.get(
    "",
    response_model=list[ReviewCaseResponse],
    summary="List pending security reviews",
)
def list_reviews(
    principal: Principal = Depends(
        require_authorization(Permission.REVIEW_READ)
    ),
    service: ReviewService = Depends(get_review_service),
) -> list[ReviewCase]:
    """List pending cases for an authorized reviewer."""
    return service.list_pending()


@router.get(
    "/{review_id}",
    response_model=ReviewCaseResponse,
    summary="Get a security review",
)
def get_review(
    review_id: str,
    principal: Principal = Depends(
        require_authorization(Permission.REVIEW_READ)
    ),
    service: ReviewService = Depends(get_review_service),
) -> ReviewCase:
    """Get one review case by its ID."""
    try:
        return service.get_case(review_id)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review case not found.",
        ) from None


@router.post(
    "/{review_id}/decision",
    response_model=ReviewCaseResponse,
    summary="Approve or reject a security review",
)
def decide_review(
    review_id: str,
    body: ReviewDecisionRequest,
    principal: Principal = Depends(
        require_authorization(Permission.REVIEW_DECIDE)
    ),
    service: ReviewService = Depends(get_review_service),
    audit_logger: AuditLogger = Depends(get_audit_logger),
) -> ReviewCase:
    """Record a review decision and audit the authenticated reviewer."""
    try:
        updated_case = service.decide(
            review_id=review_id,
            decision=ReviewStatus(body.decision),
            reviewer_id=principal.user_id,
            note=body.note,
        )
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review case not found.",
        ) from None
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from None

    audit_logger.log_event(
        request_id=updated_case.request_id,
        provider_id=None,
        categories=[updated_case.category],
        policy_action="REVIEW",
        provider_invoked=False,
        final_outcome=f"REVIEW_{updated_case.status.value.upper()}",
        actor_id=principal.user_id,
    )

    return updated_case

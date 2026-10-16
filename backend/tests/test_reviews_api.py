"""API tests for review authorization and audit attribution."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.reviews import router as reviews_router
from app.audit.audit import AuditLogger, get_audit_logger
from app.reviews.service import ReviewService, get_review_service
from app.security.authorization import Role
from app.security.dependencies import Principal


@pytest.fixture
def review_api():
    app = FastAPI()
    service = ReviewService()
    audit_logger = AuditLogger()

    app.include_router(reviews_router)

    # Test-only identity simulation. Never add this middleware to production.
    @app.middleware("http")
    async def inject_test_principal(request, call_next):
        role_value = request.headers.get("x-test-role")
        user_id = request.headers.get("x-test-user")

        if role_value:
            try:
                role = Role(role_value)
            except ValueError:
                role = None

            if role is not None:
                request.state.principal = Principal(
                    user_id=user_id or "test-user",
                    role=role,
                )

        return await call_next(request)

    app.dependency_overrides[get_review_service] = lambda: service
    app.dependency_overrides[get_audit_logger] = lambda: audit_logger

    with TestClient(app) as client:
        yield client, service, audit_logger


def reviewer_headers(role="reviewer", user="reviewer-123"):
    return {
        "x-test-role": role,
        "x-test-user": user,
    }


def create_case(service):
    return service.create_case(
        request_id="request-001",
        category="prompt_injection",
        summary="A prompt injection attempt requires review.",
    )


def test_unauthenticated_review_list_returns_401(review_api):
    client, _, _ = review_api

    response = client.get("/reviews")

    assert response.status_code == 401


def test_regular_user_cannot_read_reviews(review_api):
    client, _, _ = review_api

    response = client.get(
        "/reviews",
        headers=reviewer_headers(role="user"),
    )

    assert response.status_code == 403


def test_reviewer_can_list_pending_reviews(review_api):
    client, service, _ = review_api
    case = create_case(service)

    response = client.get("/reviews", headers=reviewer_headers())

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["review_id"] == case.review_id


def test_reviewer_can_get_a_case(review_api):
    client, service, _ = review_api
    case = create_case(service)

    response = client.get(
        f"/reviews/{case.review_id}",
        headers=reviewer_headers(),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "pending"


def test_missing_case_returns_404(review_api):
    client, _, _ = review_api

    response = client.get(
        "/reviews/not-a-real-id",
        headers=reviewer_headers(),
    )

    assert response.status_code == 404


def test_user_cannot_decide_review(review_api):
    client, service, _ = review_api
    case = create_case(service)

    response = client.post(
        f"/reviews/{case.review_id}/decision",
        headers=reviewer_headers(role="user"),
        json={"decision": "approved"},
    )

    assert response.status_code == 403
    assert service.get_case(case.review_id).status.value == "pending"


def test_decision_uses_authenticated_reviewer_and_audits(review_api):
    client, service, audit_logger = review_api
    case = create_case(service)

    response = client.post(
        f"/reviews/{case.review_id}/decision",
        headers=reviewer_headers(user="trusted-reviewer"),
        json={
            "decision": "approved",
            "note": "Reviewed and approved.",
            "reviewer_id": "forged-reviewer",
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    assert response.json()["decided_by"] == "trusted-reviewer"

    assert len(audit_logger.events) == 1
    event = audit_logger.events[0]
    assert event.actor_id == "trusted-reviewer"
    assert event.request_id == case.request_id
    assert event.final_outcome == "REVIEW_APPROVED"


def test_invalid_decision_is_rejected(review_api):
    client, service, audit_logger = review_api
    case = create_case(service)

    response = client.post(
        f"/reviews/{case.review_id}/decision",
        headers=reviewer_headers(),
        json={"decision": "pending"},
    )

    assert response.status_code == 422
    assert service.get_case(case.review_id).status.value == "pending"
    assert audit_logger.events == []


def test_duplicate_decision_returns_409(review_api):
    client, service, audit_logger = review_api
    case = create_case(service)
    url = f"/reviews/{case.review_id}/decision"
    headers = reviewer_headers()

    first = client.post(url, headers=headers, json={"decision": "approved"})
    second = client.post(url, headers=headers, json={"decision": "rejected"})

    assert first.status_code == 200
    assert second.status_code == 409
    assert service.get_case(case.review_id).status.value == "approved"
    assert len(audit_logger.events) == 1


def test_decision_note_over_limit_is_rejected(review_api):
    client, service, audit_logger = review_api
    case = create_case(service)

    response = client.post(
        f"/reviews/{case.review_id}/decision",
        headers=reviewer_headers(),
        json={"decision": "rejected", "note": "x" * 1001},
    )

    assert response.status_code == 422
    assert service.get_case(case.review_id).status.value == "pending"
    assert audit_logger.events == []

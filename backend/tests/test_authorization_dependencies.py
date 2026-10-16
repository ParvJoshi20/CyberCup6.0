from dataclasses import dataclass

import pytest
from fastapi import Depends, FastAPI, Request
from fastapi.testclient import TestClient

from app.security.authorization import Permission, Role
from app.security.dependencies import (
    Principal,
    get_current_principal,
    require_authorization,
)


def create_test_app():
    app = FastAPI()

    @app.middleware("http")
    async def test_identity_middleware(request: Request, call_next):
        # Test-only identity injection. Never use this middleware in production.
        principal = getattr(app.state, "test_principal", None)
        if principal is not None:
            request.state.principal = principal
        return await call_next(request)

    @app.get("/review")
    def review_endpoint(
        principal: Principal = Depends(
            require_authorization(Permission.REVIEW_DECIDE)
        ),
    ):
        return {"user_id": principal.user_id}

    return app


def test_missing_identity_returns_401():
    app = create_test_app()

    with TestClient(app) as client:
        response = client.get("/review")

    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication required."


def test_reviewer_can_access_review_endpoint():
    app = create_test_app()
    app.state.test_principal = Principal(
        user_id="test-reviewer",
        role=Role.REVIEWER,
    )

    with TestClient(app) as client:
        response = client.get("/review")

    assert response.status_code == 200
    assert response.json() == {"user_id": "test-reviewer"}


def test_regular_user_gets_403_for_review_endpoint():
    app = create_test_app()
    app.state.test_principal = Principal(
        user_id="test-user",
        role=Role.USER,
    )

    with TestClient(app) as client:
        response = client.get("/review")

    assert response.status_code == 403
    assert response.json()["detail"] == (
        "You do not have permission to perform this action."
    )

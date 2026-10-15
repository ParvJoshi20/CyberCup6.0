"""
test_errors.py
--------------
Integration tests for the standardised error-handling behaviour.

These tests go through the FastAPI TestClient (the HTTP layer) so they verify
that the error handlers are wired up correctly in main.py.

What is tested
--------------
* Unknown routes return HTTP 404 with the standard error envelope.
* A validation error on a real route returns HTTP 422 with the standard envelope.
* An unexpected (unhandled) exception returns HTTP 500 with a safe, generic message.
* Every error response contains a ``request_id`` field.
* The 500 response body does NOT contain the raw exception text or any
  "planted secret" string that was injected into the exception.
* The 422 response body does NOT echo back the submitted message.

The "unexpected exception" test uses a temporary route added via dependency
override so we do not pollute the production route table with a debug endpoint.
"""

from __future__ import annotations

import logging

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import app

# ---------------------------------------------------------------------------
# Helper: a client that does NOT raise server exceptions so we can inspect
# 500-level responses directly.
# ---------------------------------------------------------------------------

_NO_RAISE_CLIENT = TestClient(app, raise_server_exceptions=False)

# A synthetic secret string planted into a fake exception.  We assert it does
# NOT appear anywhere in the client-visible 500 response.
_SYNTHETIC_SECRET = "SUPER_SECRET_KEY_XYZ_98765"


# ---------------------------------------------------------------------------
# Helper: inject a crashing route for the duration of one test.
# ---------------------------------------------------------------------------

class TestNotFoundRoute:
    """Unknown routes must return HTTP 404 with the standard error envelope."""

    def test_unknown_route_returns_404(self) -> None:
        response = _NO_RAISE_CLIENT.get("/this/route/does/not/exist")
        assert response.status_code == 404

    def test_404_body_has_error_envelope(self) -> None:
        body = _NO_RAISE_CLIENT.get("/nonexistent").json()
        assert "error" in body, "Response must have an 'error' key."
        assert "code" in body["error"]
        assert "message" in body["error"]

    def test_404_has_request_id(self) -> None:
        body = _NO_RAISE_CLIENT.get("/nonexistent").json()
        assert body["error"].get("request_id"), "404 response must include a request_id."

    def test_404_code_is_not_found(self) -> None:
        body = _NO_RAISE_CLIENT.get("/nonexistent").json()
        assert body["error"]["code"] == "NOT_FOUND"


class TestValidationError:
    """Validation errors must return HTTP 422 with the standard error envelope."""

    # We POST to /health (method not allowed → 405) but to get a proper 422 we
    # need a real route that accepts a body.  We'll POST an invalid body to a
    # route that doesn't exist (404) — but that doesn't give us 422.
    #
    # Instead, we test the validation envelope by wiring a minimal extra route
    # directly on the app for this test module only.

    @pytest.fixture(autouse=True, scope="class")
    @classmethod
    def register_validate_route(cls):
        """Temporarily add a POST /test-validate route that parses ChatRequest."""
        from app.schemas import ChatRequest

        @app.post("/test-validate")
        def _validate(body: ChatRequest):
            return {"ok": True}

        yield

        # Clean up: remove the route after the test class runs.
        app.routes[:] = [r for r in app.routes if getattr(r, "path", None) != "/test-validate"]

    def test_empty_message_returns_422(self) -> None:
        response = _NO_RAISE_CLIENT.post("/test-validate", json={"message": ""})
        assert response.status_code == 422

    def test_422_has_standard_envelope(self) -> None:
        response = _NO_RAISE_CLIENT.post("/test-validate", json={"message": ""})
        body = response.json()
        assert "error" in body
        assert body["error"]["code"] == "VALIDATION_ERROR"

    def test_422_has_request_id(self) -> None:
        response = _NO_RAISE_CLIENT.post("/test-validate", json={"message": ""})
        body = response.json()
        assert body["error"].get("request_id"), "422 response must include a request_id."

    def test_422_does_not_echo_submitted_message(self) -> None:
        """Validation error responses must NOT echo back submitted field values.

        Strategy: submit a whitespace-only message (triggers 422) and also
        include a synthetic sentinel string in the model_id field.  We assert
        the sentinel is absent from the error body so we know no field value
        is being reflected.
        """
        sentinel = "SENTINEL_DO_NOT_ECHO_XK7"
        response = _NO_RAISE_CLIENT.post(
            "/test-validate",
            # Empty message triggers 422; sentinel is in model_id to check
            # that no submitted field value bleeds into the response.
            json={"message": "   ", "model_id": sentinel},
        )
        # Ensure we actually got a validation error, not a 200.
        assert response.status_code == 422, (
            f"Expected 422 but got {response.status_code}; test setup may be wrong."
        )
        response_text = response.text
        assert sentinel not in response_text, (
            "Error response must not echo back submitted field values."
        )


class TestUnhandledException:
    """Unexpected exceptions must return HTTP 500 with a safe generic message."""

    @pytest.fixture(autouse=True, scope="class")
    @classmethod
    def register_crash_route(cls):
        """Temporarily add a GET /test-crash route that always raises."""

        @app.get("/test-crash")
        def _crash():
            raise RuntimeError(
                f"Something went wrong: {_SYNTHETIC_SECRET}"
            )

        yield

        app.routes[:] = [r for r in app.routes if getattr(r, "path", None) != "/test-crash"]

    def test_crash_returns_500(self) -> None:
        response = _NO_RAISE_CLIENT.get("/test-crash")
        assert response.status_code == 500

    def test_500_has_standard_envelope(self) -> None:
        body = _NO_RAISE_CLIENT.get("/test-crash").json()
        assert "error" in body
        assert body["error"]["code"] == "INTERNAL_SERVER_ERROR"

    def test_500_has_request_id(self) -> None:
        body = _NO_RAISE_CLIENT.get("/test-crash").json()
        assert body["error"].get("request_id"), "500 response must include a request_id."

    def test_500_does_not_expose_exception_text(self) -> None:
        """The synthetic secret planted in the RuntimeError must NOT reach the client."""
        response = _NO_RAISE_CLIENT.get("/test-crash")
        assert _SYNTHETIC_SECRET not in response.text, (
            "Internal exception text must not be reflected in the 500 response body."
        )

    def test_500_server_logs_exception(self, caplog) -> None:
        """The server SHOULD log the exception so developers can debug it.

        We only check that the error-level log was emitted (not the exact
        message) so that future log format changes don't break this test.
        """
        with caplog.at_level(logging.ERROR, logger="app.errors"):
            _NO_RAISE_CLIENT.get("/test-crash")
        assert any(r.levelno >= logging.ERROR for r in caplog.records), (
            "An error-level log entry must be emitted for unhandled exceptions."
        )


class TestRequestIdHeader:
    """Clients may supply X-Request-ID; invalid or missing ones are replaced."""

    def test_valid_client_request_id_is_echoed(self) -> None:
        """A well-formed X-Request-ID should be used in the error response."""
        custom_id = "my-req-123"
        body = _NO_RAISE_CLIENT.get(
            "/nonexistent", headers={"X-Request-ID": custom_id}
        ).json()
        assert body["error"]["request_id"] == custom_id

    def test_overlong_client_request_id_is_replaced(self) -> None:
        """An X-Request-ID > 64 chars must be ignored and a new UUID used."""
        bad_id = "x" * 65
        body = _NO_RAISE_CLIENT.get(
            "/nonexistent", headers={"X-Request-ID": bad_id}
        ).json()
        assert body["error"]["request_id"] != bad_id
        assert len(body["error"]["request_id"]) > 0  # A generated UUID is present.

    def test_special_char_request_id_is_replaced(self) -> None:
        """An X-Request-ID with invalid characters must be ignored."""
        body = _NO_RAISE_CLIENT.get(
            "/nonexistent", headers={"X-Request-ID": "<script>alert(1)</script>"}
        ).json()
        assert "<script>" not in body["error"]["request_id"]

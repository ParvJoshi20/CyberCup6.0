"""
test_health.py
--------------
Tests for the GET /health endpoint.

What is tested
--------------
* The endpoint returns HTTP 200.
* The response body matches the HealthResponse schema fields exactly.
* The ``status`` field is always the string ``"ok"``.
"""

from __future__ import annotations

from fastapi.testclient import TestClient


class TestHealthEndpoint:
    """Group all /health tests into a single class for clarity."""

    def test_health_returns_200(self, client: TestClient) -> None:
        """Liveness check should always return HTTP 200."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_content_type_is_json(self, client: TestClient) -> None:
        """Response must be JSON."""
        response = client.get("/health")
        assert "application/json" in response.headers.get("content-type", "")

    def test_health_status_field_is_ok(self, client: TestClient) -> None:
        """The ``status`` field must equal the string 'ok'."""
        body = client.get("/health").json()
        assert body["status"] == "ok"

    def test_health_service_field_present(self, client: TestClient) -> None:
        """The ``service`` field must be the expected service name."""
        body = client.get("/health").json()
        assert body["service"] == "aegisgate-backend"

    def test_health_version_field_present(self, client: TestClient) -> None:
        """The ``version`` field must be present and non-empty."""
        body = client.get("/health").json()
        assert body.get("version"), "version field must be present and non-empty"

    def test_health_response_has_all_schema_fields(self, client: TestClient) -> None:
        """Response must contain exactly the keys defined in HealthResponse."""
        body = client.get("/health").json()
        assert set(body.keys()) == {"status", "service", "version"}

"""
conftest.py
-----------
Shared pytest fixtures for the AegisGate test suite.

Placing fixtures here makes them automatically available to all test modules
in the ``tests/`` directory without explicit imports.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Return a TestClient wrapping the FastAPI application.

    ``scope="session"`` means the client is created once per test session,
    which is fine because the app has no per-test mutable global state.
    """
    return TestClient(app, raise_server_exceptions=False)

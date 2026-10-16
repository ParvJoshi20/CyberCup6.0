"""
main.py
-------
AegisGate FastAPI application entry point.

Start the development server from the ``backend/`` directory:

    python -m uvicorn app.main:app --reload

Interactive API docs are then available at:
    http://127.0.0.1:8000/docs

OpenAPI schema:
    http://127.0.0.1:8000/openapi.json
"""

from __future__ import annotations

import logging

from fastapi import FastAPI

from app.api.chat import router as chat_router
from app.api.reviews import router as reviews_router
from app.errors import register_error_handlers
from app.schemas import HealthResponse

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
# Configure the root logger so that uvicorn's --reload and our own log calls
# both appear in the console during development.
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AegisGate API",
    description=(
        "AI Data Leakage Security Gateway.\n\n"
        "This service acts as a security layer that inspects messages sent to "
        "and received from AI models, detecting and blocking data-leakage "
        "attempts in real time.  "
        "**Milestone 1** establishes the foundation: health check, "
        "request validation, and standardised error handling."
    ),
    version="0.1.0",
    # Disable the default validation-error handler so our custom one takes over.
    # See errors.py for the full explanation.
)

# Attach standardised error handlers (422, 404, 500, and general HTTP errors).
register_error_handlers(app)
app.include_router(chat_router)
app.include_router(reviews_router)

logger.info("AegisGate backend initialised (version %s).", app.version)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Liveness check",
    description=(
        "Returns a simple JSON object confirming the service is running.  "
        "This endpoint checks only that the Python process is alive; it does "
        "**not** verify databases, AI providers, or any other dependencies."
    ),
    tags=["Infrastructure"],
)
def health() -> HealthResponse:
    """Basic liveness check — always returns HTTP 200 while the process is up."""
    return HealthResponse(
        status="ok",
        service="aegisgate-backend",
        version=app.version,
    )

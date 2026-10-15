"""`
Centralised FastAPI exception handlers for AegisGate.

Every error returned to the client uses the same ErrorResponse envelope
(defined in schemas.py) so consumers can always parse errors the same way.

Design notes
------------
* A unique request_id is attached to every error response.
* Raw submitted input, stack traces, file paths, environment variables, and
  API keys are never included in client-visible error bodies.
* Unexpected exceptions are logged with safe diagnostic metadata.
* FastAPI's RequestValidationError handling is customized to return a
  standardized 422 response without logging submitted validation details.
"""

from __future__ import annotations

import logging
import re
import uuid
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.schemas import ErrorDetail, ErrorResponse

logger = logging.getLogger(__name__)


class AegisGateClientError(Exception):
    """Application-level client error with a safe code and HTTP status."""

    def __init__(self, code: str, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


# ---------------------------------------------------------------------------
# Request-ID helpers
# ---------------------------------------------------------------------------

_REQUEST_ID_HEADER = "X-Request-ID"

# Allow alphanumeric characters, hyphens, and underscores, up to 64 chars.
_REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9\-_]{1,64}$")


def _resolve_request_id(request: Request) -> str:
    """Return a validated client request ID or generate a fresh UUID."""
    client_id = request.headers.get(_REQUEST_ID_HEADER, "")

    if client_id and _REQUEST_ID_PATTERN.fullmatch(client_id):
        return client_id

    return str(uuid.uuid4())


def _build_error_response(
    code: str,
    message: str,
    request_id: str,
) -> dict[str, Any]:
    """Construct the standardized error envelope."""
    return ErrorResponse(
        error=ErrorDetail(
            code=code,
            message=message,
            request_id=request_id,
        )
    ).model_dump()


# ---------------------------------------------------------------------------
# Individual handlers
# ---------------------------------------------------------------------------


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Handle request-validation failures without logging submitted values."""
    request_id = _resolve_request_id(request)

    # Validation details may contain user-supplied values.
    # Log only safe diagnostic metadata.
    logger.warning(
        "request_validation_failed request_id=%s",
        request_id,
    )

    return JSONResponse(
        status_code=422,
        content=_build_error_response(
            code="VALIDATION_ERROR",
            message=(
                "The request contains invalid or missing fields. "
                "Check the API documentation for the expected format."
            ),
            request_id=request_id,
        ),
    )


async def client_error_handler(
    request: Request,
    exc: AegisGateClientError,
) -> JSONResponse:
    """Handle application-level client errors with a standardized envelope."""
    request_id = _resolve_request_id(request)

    return JSONResponse(
        status_code=exc.status_code,
        content=_build_error_response(
            code=exc.code,
            message=exc.message,
            request_id=request_id,
        ),
    )


async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    """Handle HTTP exceptions without exposing arbitrary exception details."""
    request_id = _resolve_request_id(request)

    if exc.status_code == 404:
        code = "NOT_FOUND"
        message = "The requested resource was not found."

    elif exc.status_code == 405:
        code = "METHOD_NOT_ALLOWED"
        message = "This HTTP method is not allowed on the requested resource."

    elif exc.status_code == 401:
        code = "UNAUTHORIZED"
        message = "Authentication is required for this request."

    elif exc.status_code == 403:
        code = "FORBIDDEN"
        message = "You are not permitted to perform this action."

    elif exc.status_code == 429:
        code = "RATE_LIMITED"
        message = "Too many requests. Please try again later."

    else:
        code = "HTTP_ERROR"
        message = "The request could not be processed."

    return JSONResponse(
        status_code=exc.status_code,
        content=_build_error_response(
            code=code,
            message=message,
            request_id=request_id,
        ),
    )


async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    """Handle unexpected exceptions without exposing internal details.

    The handler logs a generic event, request ID, and exception type.
    The client receives a safe message and request ID. Raw exception
    messages and tracebacks are not explicitly included by this handler.
    """
    request_id = _resolve_request_id(request)

    logger.error(
        "security_unhandled_exception event=%s request_id=%s exception_type=%s",
        "unhandled_exception",
        request_id,
        type(exc).__name__,
    )

    return JSONResponse(
        status_code=500,
        content=_build_error_response(
            code="INTERNAL_SERVER_ERROR",
            message=(
                "An unexpected error occurred. "
                "Please try again later or contact support with the request ID."
            ),
            request_id=request_id,
        ),
    )


# ---------------------------------------------------------------------------
# Registration helper
# ---------------------------------------------------------------------------


def register_error_handlers(application: FastAPI) -> None:
    """Register the application's centralized exception handlers."""
    application.add_exception_handler(
        RequestValidationError,
        validation_exception_handler,
    )  # type: ignore[arg-type]

    application.add_exception_handler(
        AegisGateClientError,
        client_error_handler,
    )  # type: ignore[arg-type]

    application.add_exception_handler(
        StarletteHTTPException,
        http_exception_handler,
    )  # type: ignore[arg-type]

    application.add_exception_handler(
        Exception,
        unhandled_exception_handler,
    )  # type: ignore[arg-type]
"""
schemas.py
----------
Pydantic v2 data models (schemas) shared across the AegisGate API.

Keeping schemas in one place makes it easy to see what the API accepts and
returns without hunting through route handlers.  Future milestones can import
these models directly or extend them.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field, field_validator

# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


class HealthResponse(BaseModel):
    """Response body for GET /health."""

    status: str = Field(..., description="Always 'ok' when the service is running.")
    service: str = Field(..., description="Human-readable service name.")
    version: str = Field(..., description="Application version string (semver).")

    model_config = {"json_schema_extra": {"example": {"status": "ok", "service": "aegisgate-backend", "version": "0.1.0"}}}


# ---------------------------------------------------------------------------
# Standardised error envelope
# ---------------------------------------------------------------------------


class ErrorDetail(BaseModel):
    """The nested object inside every error response."""

    code: str = Field(..., description="Machine-readable error code, e.g. 'VALIDATION_ERROR'.")
    message: str = Field(..., description="Human-readable explanation safe to show to clients.")
    request_id: str = Field(..., description="Unique identifier for this request, useful for log correlation.")


class ErrorResponse(BaseModel):
    """Standardised error envelope returned by all error handlers.

    Example::

        {
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "The request contains invalid fields.",
                "request_id": "abc123"
            }
        }
    """

    error: ErrorDetail


class SecuritySummary(BaseModel):
    """Safe security summary returned with any chat response."""

    action: str = Field(..., description="Policy action, such as ALLOW, WARN, SANITIZE, or BLOCK.")
    output_action: str = Field(default="ALLOW", description="Output-inspection action taken before returning the response.")
    findings: list[str] = Field(default_factory=list, description="Safe-to-display explanations only.")


class ChatResponse(BaseModel):
    """Structured response body for a chat request after security checks."""

    request_id: str = Field(..., description="Unique request identifier, useful for correlation.")
    provider: Optional[str] = Field(default=None, description="Provider identifier selected for the request, if any.")
    model_id: str = Field(..., description="Model identifier requested by the client.")
    response: str = Field(..., description="Final safe response text to return to the client.")
    security: SecuritySummary = Field(..., description="Security decision summary for the request.")
    safe_findings: list[str] = Field(default_factory=list, description="Safe-to-display security findings.")
    audit_event: dict = Field(default_factory=dict, description="Minimal privacy-conscious audit metadata.")


# ---------------------------------------------------------------------------
# Chat request
# ---------------------------------------------------------------------------

# Maximum character limits — chosen to be generous but not unbounded.
_MAX_MESSAGE_LEN = 8_000
_MAX_MODEL_ID_LEN = 128
_MAX_CONVERSATION_ID_LEN = 128


class ChatRequest(BaseModel):
    """Incoming request body for the future POST /chat endpoint.

    Fields
    ------
    message:
        The user's text prompt.  Must be non-empty after stripping leading/
        trailing whitespace.  Maximum 8 000 characters (after stripping).

    model_id:
        Which backend model to route the request to.  Defaults to 'echo'
        (a no-op stub used during development and testing).

    use_rag:
        When True the pipeline will augment the prompt with retrieved context.
        Defaults to False.

    conversation_id:
        Opaque string used to group messages into a session.  May be None for
        a brand-new conversation.  The server never treats this value as proof
        of identity or as authorisation.
    """

    message: str = Field(
        ...,
        description="User prompt. Non-empty, max 8 000 characters after stripping whitespace.",
    )
    model_id: str = Field(
        default="echo",
        max_length=_MAX_MODEL_ID_LEN,
        description="Target model identifier. Defaults to 'echo'.",
    )
    use_rag: bool = Field(
        default=False,
        description="Whether to augment the prompt with retrieved context.",
    )
    conversation_id: Optional[str] = Field(
        default=None,
        max_length=_MAX_CONVERSATION_ID_LEN,
        description="Opaque session identifier. Null for a new conversation.",
    )

    @field_validator("message", mode="before")
    @classmethod
    def strip_and_validate_message(cls, value: object) -> str:
        """Strip surrounding whitespace, then reject empty or overlong values."""
        if not isinstance(value, str):
            # Let Pydantic's type coercion raise its own error for non-strings.
            return value  # type: ignore[return-value]

        stripped = value.strip()

        if not stripped:
            raise ValueError("message must not be empty or consist only of whitespace.")

        if len(stripped) > _MAX_MESSAGE_LEN:
            raise ValueError(
                f"message must not exceed {_MAX_MESSAGE_LEN} characters "
                f"(got {len(stripped)})."
            )

        return stripped

    model_config = {
        "json_schema_extra": {
            "example": {
                "message": "What is the capital of France?",
                "model_id": "echo",
                "use_rag": False,
                "conversation_id": None,
            }
        }
    }

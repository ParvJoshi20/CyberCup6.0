
from __future__ import annotations

import logging

from fastapi import APIRouter, Request

from app.audit.audit import get_audit_logger
from app.errors import AegisGateClientError, _resolve_request_id
from app.providers.registry import get_provider_registry
from app.schemas import ChatRequest, ChatResponse, SecuritySummary
from app.security import detectors
from app.security.detectors import SecurityFinding
from app.security.policy import decide_policy
from app.security.sanitization import (
    redact_sensitive_fields,
    sanitize_prompt_injection,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    http_request: Request,
) -> ChatResponse:
    request_id = _resolve_request_id(http_request)
    registry = get_provider_registry()
    audit_logger = get_audit_logger()

    findings: list[SecurityFinding] = []
    output_findings: list[SecurityFinding] = []

    policy_action = "BLOCK"
    provider_id = request.model_id
    provider_invoked = False
    provider_result = ""
    response_text = "Request blocked by security policy."
    output_action = "BLOCK"
    safe_findings: list[str] = []

    # Inspect the incoming prompt. If inspection fails, fail closed.
    try:
        findings = detectors.validate_findings(
            detectors.inspect_message(request.message)
        )
    except Exception as exc:
        logger.error(
            "security_input_inspection_failed event=%s request_id=%s exception_type=%s",
            "input_inspection_failure",
            request_id,
            type(exc).__name__,
        )

        final_event = audit_logger.log_event(
            request_id=request_id,
            provider_id=provider_id,
            categories=["input_inspection_failure"],
            policy_action="BLOCK",
            provider_invoked=False,
            final_outcome="BLOCKED",
        )

        return ChatResponse(
            request_id=request_id,
            provider=None,
            model_id=provider_id,
            response="Request blocked by security policy.",
            security=SecuritySummary(
                action="BLOCK",
                output_action="BLOCK",
                findings=[
                    "Input inspection failed and the provider was not called."
                ],
            ),
            safe_findings=[
                "Input inspection failed and the provider was not called."
            ],
            audit_event=final_event.model_dump(),
        )

    # Evaluate detected input findings. Malformed findings must not bypass policy.
    try:
        decision = decide_policy(request.message, findings)
    except Exception as exc:
        logger.error(
            "security_policy_evaluation_failed event=%s request_id=%s exception_type=%s",
            "policy_evaluation_failure",
            request_id,
            type(exc).__name__,
        )

        final_event = audit_logger.log_event(
            request_id=request_id,
            provider_id=provider_id,
            categories=["policy_evaluation_failure"],
            policy_action="BLOCK",
            provider_invoked=False,
            final_outcome="BLOCKED",
        )

        return ChatResponse(
            request_id=request_id,
            provider=None,
            model_id=provider_id,
            response="Request blocked by security policy.",
            security=SecuritySummary(
                action="BLOCK",
                output_action="BLOCK",
                findings=[
                    "Policy evaluation failed and the provider was not called."
                ],
            ),
            safe_findings=[
                "Policy evaluation failed and the provider was not called."
            ],
            audit_event=final_event.model_dump(),
        )

    policy_action = decision.action
    safe_message = decision.sanitized_message

    if policy_action == "BLOCK":
        safe_findings = [
            finding.safe_explanation for finding in findings
        ]

        final_event = audit_logger.log_event(
            request_id=request_id,
            provider_id=provider_id,
            categories=[finding.category for finding in findings],
            policy_action=policy_action,
            provider_invoked=False,
            final_outcome="BLOCKED",
        )

        return ChatResponse(
            request_id=request_id,
            provider=None,
            model_id=provider_id,
            response="Request blocked by security policy.",
            security=SecuritySummary(
                action=policy_action,
                output_action="BLOCK",
                findings=safe_findings
                or ["Request blocked by security policy."],
            ),
            safe_findings=safe_findings
            or ["Request blocked by security policy."],
            audit_event=final_event.model_dump(),
        )

    if policy_action == "SANITIZE":
        if any(
            finding.category == "prompt_injection"
            for finding in findings
        ):
            safe_message = sanitize_prompt_injection(safe_message)

        safe_message = redact_sensitive_fields(safe_message)
    else:
        # Apply the existing sensitive-field sanitization to allowed input.
        safe_message = redact_sensitive_fields(safe_message)

    # Resolve the selected provider before invoking it.
    provider = registry.get(provider_id)

    if provider is None:
        raise AegisGateClientError(
            "INVALID_PROVIDER",
            "Unknown provider selection.",
            status_code=400,
        )

    # Invoke the provider only after input inspection and policy enforcement.
    try:
        provider_result = provider.generate(
            safe_message,
            model_id=provider_id,
        )
        provider_invoked = True
    except Exception as exc:
        logger.error(
            "security_provider_failed event=%s request_id=%s provider_id=%s exception_type=%s",
            "provider_failure",
            request_id,
            provider_id,
            type(exc).__name__,
        )

        audit_logger.log_event(
            request_id=request_id,
            provider_id=provider_id,
            categories=[finding.category for finding in findings],
            policy_action=policy_action,
            provider_invoked=True,
            final_outcome="ERROR",
        )

        raise RuntimeError("Provider request failed") from exc

    # Inspect provider output before releasing it to the client.
    try:
        from app.security.output_inspection import inspect_provider_output

        output_result = inspect_provider_output(provider_result)

        # Retain the findings from the inspection already performed.
        output_findings = output_result.findings or []

        if output_result.action == "ALLOW":
            response_text = output_result.sanitized_output
            output_action = "ALLOW"

        elif output_result.action == "REDACT":
            # Use only the output returned by the inspection component.
            # The current implementation returns a generic blocked message.
            response_text = output_result.sanitized_output
            output_action = "REDACT"

        else:
            response_text = "Response blocked by output inspection."
            output_action = "BLOCK"

        if output_findings:
            safe_findings = [
                finding.safe_explanation
                for finding in output_findings
            ]
        elif findings:
            safe_findings = [
                finding.safe_explanation for finding in findings
            ]

    except Exception as exc:
        logger.error(
            "security_output_inspection_failed event=%s request_id=%s exception_type=%s",
            "output_inspection_failure",
            request_id,
            type(exc).__name__,
        )

        # Never release provider output if output inspection fails.
        response_text = "Response blocked by output inspection."
        output_action = "BLOCK"
        safe_findings = [
            "Output inspection failed and the provider output was not released."
        ]

    # Build audit categories from the findings already collected.
    # Do not re-run detectors on provider output here.
    audit_categories = [
        finding.category for finding in findings + output_findings
    ]

    blocked_output = output_action in {"BLOCK", "REDACT"}

    final_event = audit_logger.log_event(
        request_id=request_id,
        provider_id=provider_id,
        categories=audit_categories,
        policy_action=policy_action,
        provider_invoked=provider_invoked,
        final_outcome="BLOCKED" if blocked_output else "ALLOW",
    )

    if not safe_findings:
        safe_findings = ["No unsafe content detected."]

    return ChatResponse(
        request_id=request_id,
        provider=provider_id,
        model_id=provider_id,
        response=response_text,
        security=SecuritySummary(
            action=policy_action,
            output_action=output_action,
            findings=safe_findings,
        ),
        safe_findings=safe_findings,
        audit_event=final_event.model_dump(),
    )

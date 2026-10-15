"""Policy decisions for sensitive-data detection in AegisGate.

This module supports allow, mask, and block actions. It does not call
AI providers, log input, or persist sensitive data.
"""

from dataclasses import dataclass
from typing import Literal, TypedDict

from backend.app.security.detector import detect_sensitive_data


PolicyAction = Literal["allow", "mask", "block"]

class Finding(TypedDict):
    type: str
    start: int
    end: int
    match: str


@dataclass(frozen=True)
class PolicyDecision:
    """Result of applying a policy to input text."""

    action: PolicyAction
    allowed: bool
    safe_text: str | None
    findings: tuple[Finding, ...]
    reason: str


_PLACEHOLDERS = {
    "email": "[REDACTED_EMAIL]",
    "phone_candidate": "[REDACTED_PHONE]",
    "payment_card_candidate": "[REDACTED_PAYMENT_CARD]",
    "pan_candidate": "[REDACTED_PAN]",
    "aadhaar_candidate": "[REDACTED_AADHAAR]",
    "api_key_candidate": "[REDACTED_API_KEY]",
}


def apply_policy(
    text: str,
    action: PolicyAction = "mask",
) -> PolicyDecision:
    """Apply an allow, mask, or block policy to text."""
    if not isinstance(text, str):
        raise TypeError("text must be a string")

    if action not in ("allow", "mask", "block"):
        raise ValueError("action must be 'allow', 'mask', or 'block'")

    detected: list[Finding] = detect_sensitive_data(text)
    findings: tuple[Finding, ...] = tuple(detected)

    if action == "block":
        return PolicyDecision(
            action="block",
            allowed=False,
            safe_text=None,
            findings=findings,
            reason="Input blocked by policy.",
        )

    if action == "allow":
        return PolicyDecision(
            action="allow",
            allowed=True,
            safe_text=text,
            findings=findings,
            reason="Input allowed by policy.",
        )

        # Merge overlapping matches so each sensitive region is replaced once.
    spans: list[tuple[int, int, set[str]]] = []

    for finding in findings:
        start: int = finding["start"]
        end: int = finding["end"]
        category: str = finding["type"]

        if not spans or start >= spans[-1][1]:
            spans.append((start, end, {category}))
        else:
            previous_start, previous_end, categories = spans[-1]
            spans[-1] = (
                previous_start,
                max(previous_end, end),
                categories | {category},
            )

    masked_text = text

    # Replace from right to left to preserve the original offsets.
    for start, end, categories in reversed(spans):
        if len(categories) == 1:
            category = next(iter(categories))
            replacement = _PLACEHOLDERS.get(
                category, "[REDACTED_SENSITIVE_DATA]"
            )
        else:
            replacement = "[REDACTED_SENSITIVE_DATA]"

        masked_text = masked_text[:start] + replacement + masked_text[end:]
    return PolicyDecision(
        action="mask",
        allowed=True,
        safe_text=masked_text,
        findings=findings,
        reason=(
            "Sensitive-data candidates masked."
            if findings
            else "No sensitive-data candidates detected."
        ),
    )

from __future__ import annotations

import re

_EMAIL_RE = re.compile(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b")
_PHONE_RE = re.compile(r"(?<!\d)(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})(?!\d)")
_KEY_RE = re.compile(r"(?i)\b(?:sk|rk|AKIA|ASIA|AIza|ghp|github_pat|xox[baprs]-)[A-Za-z0-9_\-]{10,}\b")


def redact_sensitive_fields(message: str) -> str:
    """Replace contact or secret-like data with non-sensitive placeholders."""
    sanitized = _KEY_RE.sub("[REDACTED_SECRET]", message)
    sanitized = _EMAIL_RE.sub("[REDACTED_EMAIL]", sanitized)
    sanitized = _PHONE_RE.sub("[REDACTED_PHONE]", sanitized)
    return sanitized


def sanitize_prompt_injection(message: str) -> str:
    """Strip instruction-taking phrases to keep the prompt safer."""
    cleaned = re.sub(
        r"(?i)ignore\s+(?:all\s+)?previous\s+instructions|reveal\s+(?:the\s+)?hidden\s+(?:system|prompt)|override\s+(?:the\s+)?instructions",
        "[PROMPT_INJECTION_REDACTED]",
        message,
    )
    return cleaned

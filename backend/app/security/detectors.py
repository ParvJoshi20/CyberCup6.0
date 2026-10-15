from __future__ import annotations

from dataclasses import dataclass
import re

from app.security.detector import detect_sensitive_data


@dataclass(frozen=True)
class SecurityFinding:
    category: str
    safe_explanation: str
    start: int = 0
    end: int = 0
    match: str = ""
    severity: str = "medium"


_INJECTION_PATTERNS = (
    re.compile(r"ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions", re.I),
    re.compile(r"reveal\s+(?:the\s+)?hidden\s+(?:system|prompt)", re.I),
    re.compile(r"override\s+(?:the\s+)?instructions", re.I),
)

_SECRET_TOKEN = re.compile(
    r"(?i)(?<![A-Za-z0-9])(?:sk|rk|AKIA|ASIA|AIza|ghp|github_pat|xox[baprs]-)"
    r"[A-Za-z0-9_-]{10,}(?![A-Za-z0-9_-])"
)

_CREDENTIAL_REQUEST = re.compile(
    r"\b(?:secret|private|hidden)\s+(?:api\s+key|access\s+token|credential)s?\b",
    re.I,
)

_ALLOWED_CATEGORIES = {
    "email", "phone_candidate", "payment_card_candidate",
    "pan_candidate", "aadhaar_candidate", "api_key_candidate",
    "prompt_injection", "credential_request",
    "output_email", "output_phone", "output_payment_card",
    "output_pan", "output_aadhaar", "output_api_key",
}


def _finding(category: str, start: int, end: int, match: str) -> SecurityFinding:
    explanations = {
        "prompt_injection": "Potential prompt injection detected.",
        "credential_request": "Potential request for secret credentials detected.",
    }
    explanation = explanations.get(
        category, f"Potential sensitive data detected: {category}."
    )
    return SecurityFinding(category, explanation, start, end, match)


def inspect_message(message: str) -> list[SecurityFinding]:
    if not isinstance(message, str):
        raise TypeError("message must be a string")

    findings = [
        _finding(item["type"], item["start"], item["end"], item["match"])
        for item in detect_sensitive_data(message)
    ]

    for pattern, category in (
        (_SECRET_TOKEN, "api_key_candidate"),
        (_CREDENTIAL_REQUEST, "credential_request"),
    ):
        for match in pattern.finditer(message):
            findings.append(
                _finding(category, match.start(), match.end(), match.group(0))
            )

    for pattern in _INJECTION_PATTERNS:
        for match in pattern.finditer(message):
            findings.append(
                _finding(
                    "prompt_injection", match.start(), match.end(), match.group(0)
                )
            )

    # Deduplicate overlapping duplicate detections of the same span/category.
    unique = {
        (f.category, f.start, f.end): f for f in findings
    }
    return sorted(unique.values(), key=lambda f: (f.start, f.end, f.category))


def validate_findings(findings) -> list[SecurityFinding]:
    if not isinstance(findings, list):
        raise ValueError("Findings must be a list")

    for finding in findings:
        if not isinstance(finding, SecurityFinding):
            raise ValueError("Invalid security finding")
        if finding.category not in _ALLOWED_CATEGORIES:
            raise ValueError("Invalid security finding category")
        if (
            not isinstance(finding.start, int)
            or not isinstance(finding.end, int)
            or finding.start < 0
            or finding.end < finding.start
            or not isinstance(finding.match, str)
            or not isinstance(finding.safe_explanation, str)
        ):
            raise ValueError("Malformed security finding")

    return findings


def inspect_output(output: str) -> list[SecurityFinding]:
    if not isinstance(output, str):
        raise TypeError("output must be a string")

    category_map = {
        "email": "output_email",
        "phone_candidate": "output_phone",
        "payment_card_candidate": "output_payment_card",
        "pan_candidate": "output_pan",
        "aadhaar_candidate": "output_aadhaar",
        "api_key_candidate": "output_api_key",
    }

    findings = [
        _finding(category_map[item["type"]], item["start"], item["end"], item["match"])
        for item in detect_sensitive_data(output)
    ]
    findings.extend(
        _finding("output_api_key", m.start(), m.end(), m.group(0))
        for m in _SECRET_TOKEN.finditer(output)
    )

    unique = {(f.category, f.start, f.end): f for f in findings}
    return sorted(unique.values(), key=lambda f: (f.start, f.end, f.category))

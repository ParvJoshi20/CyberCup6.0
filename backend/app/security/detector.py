"""Deterministic detection of potentially sensitive data for AegisGate.

This module detects format-based candidates. Detection does not prove identity,
validate the issuance of a government identifier, or establish that a credential
is active.

Aadhaar checksum validation is provided separately and is not an identity check.

No network requests, logging, persistence, or input mutation are performed.
"""

from __future__ import annotations

import re
from typing import TypedDict


class Finding(TypedDict):
    """A detected candidate and its span in the original input string."""

    type: str
    start: int
    end: int
    match: str


# ---------------------------------------------------------------------------
# Detection patterns
# ---------------------------------------------------------------------------

_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    (
        "email",
        re.compile(
            r"(?<![\w.+-])"
            r"[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+"
            r"@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
            r"(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+"
            r"(?![\w.-])"
        ),
    ),
    (
        "phone_candidate",
        # Candidate only: country and national numbering rules vary.
        # Word boundaries prevent matching digits embedded in identifiers.
        re.compile(
            r"(?<!\w)"
            r"(?:\+\d{1,3}[\s.-]?)?"
            r"(?:\(?\d{2,5}\)?[\s.-]?)?"
            r"\d(?:[\s.-]?\d){7,12}"
            r"(?!\w)"
        ),
    ),
    (
        "payment_card_candidate",
        # 13-19 digits, optionally separated by spaces or hyphens.
        # This does not establish issuer validity or pass a Luhn check.
        re.compile(
            r"(?<!\d)"
            r"\d(?:[ -]?\d){12,18}"
            r"(?!\d)"
        ),
    ),
    (
        "pan_candidate",
        # Indian PAN format: five letters, four digits, one letter.
        # This is a format match, not identity or issuance verification.
        re.compile(
            r"(?<![A-Za-z0-9])"
            r"[A-Z]{5}\d{4}[A-Z]"
            r"(?![A-Za-z0-9])",
            re.IGNORECASE,
        ),
    ),
    (
        "aadhaar_candidate",
        # 12 digits, optionally grouped as 4-4-4 with spaces or hyphens.
        # Checksum validation is a separate operation below.
        re.compile(
            r"(?<!\d)"
            r"\d{4}(?:[ -]?\d{4}){2}"
            r"(?!\d)"
        ),
    ),
    (
        "api_key_candidate",
        # Recognizable key/token assignments. The complete assignment is
        # matched so policy masking can replace the key and its value.
        re.compile(
            r"(?i)\b(?:api[_-]?key|access[_-]?token|secret[_-]?key|"
            r"client[_-]?secret|auth[_-]?token|key)\b"
            r"\s*[:=]\s*"
            r"""(?:"[^"\r\n]{4,}"|'[^'\r\n]{4,}'|[^\s,;]{4,})"""
        ),
    ),
    (
        "api_key_candidate",
        # Common sk-prefixed token shape; not a complete provider-token list.
        re.compile(
            r"(?<![A-Za-z0-9])"
            r"sk-[A-Za-z0-9_-]{16,}"
            r"(?![A-Za-z0-9_-])"
        ),
    ),
)


# ---------------------------------------------------------------------------
# Aadhaar checksum helper
# ---------------------------------------------------------------------------

def is_aadhaar_checksum_valid(value: str) -> bool:
    """Check an Aadhaar-format candidate using the Verhoeff checksum.

    Accepts 12 digits either ungrouped or in strict 4-4-4 groups separated
    consistently by spaces or hyphens.

    Returns False for invalid input, formatting, or checksum.

    IMPORTANT:
    A successful result only means that the format and checksum are
    consistent. It does not verify issuance, ownership, identity, or status
    with UIDAI.
    """
    if not isinstance(value, str):
        return False

    value = value.strip()

    valid_format = re.fullmatch(
        r"(?:[2-9]\d{11}|[2-9]\d{3}([ -])\d{4}\1\d{4})",
        value,
    )
    if valid_format is None:
        return False

    digits = re.sub(r"[ -]", "", value)

    multiplication_table = (
        (0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
        (1, 2, 3, 4, 0, 6, 7, 8, 9, 5),
        (2, 3, 4, 0, 1, 7, 8, 9, 5, 6),
        (3, 4, 0, 1, 2, 8, 9, 5, 6, 7),
        (4, 0, 1, 2, 3, 9, 5, 6, 7, 8),
        (5, 9, 2, 7, 8, 0, 4, 3, 1, 6),
        (6, 0, 8, 1, 9, 4, 3, 5, 2, 7),
        (7, 1, 9, 5, 3, 2, 6, 8, 4, 0),
        (8, 5, 3, 9, 7, 2, 0, 6, 1, 4),
        (9, 8, 7, 6, 5, 4, 3, 2, 1, 0),
    )

    permutation_table = (
        (0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
        (1, 5, 7, 6, 2, 8, 3, 0, 9, 4),
        (5, 8, 0, 3, 7, 9, 6, 1, 4, 2),
        (8, 9, 1, 6, 0, 4, 3, 5, 2, 7),
        (9, 4, 5, 3, 1, 2, 6, 8, 7, 0),
        (4, 2, 8, 6, 5, 7, 3, 9, 0, 1),
        (2, 7, 9, 3, 8, 0, 6, 4, 1, 5),
        (7, 0, 4, 6, 9, 1, 3, 2, 5, 8),
    )

    checksum = 0
    for position, character in enumerate(reversed(digits)):
        digit = int(character)
        checksum = multiplication_table[checksum][
            permutation_table[position % 8][digit]
        ]

    return checksum == 0


# ---------------------------------------------------------------------------
# Public detector
# ---------------------------------------------------------------------------

def detect_sensitive_data(text: str) -> list[Finding]:
    """Find potential sensitive-data patterns in text.

    Each finding contains:
      - type: stable category identifier
      - start: inclusive character offset in the original string
      - end: exclusive character offset in the original string
      - match: matched substring

    Findings are ordered by start, end, and type. Duplicate findings with
    the same category and span are removed.

    Aadhaar matches are reported as candidates regardless of checksum result.
    This is intentional: security policy may still choose to mask them.
    """
    if not isinstance(text, str):
        raise TypeError("text must be a string")

    if not text:
        return []

    findings: list[Finding] = []
    seen: set[tuple[str, int, int]] = set()

    for category, pattern in _PATTERNS:
        for match in pattern.finditer(text):
            start, end = match.span()
            key = (category, start, end)

            if key in seen:
                continue

            seen.add(key)
            findings.append(
                {
                    "type": category,
                    "start": start,
                    "end": end,
                    "match": match.group(0),
                }
            )

    findings.sort(
        key=lambda finding: (
            finding["start"],
            finding["end"],
            finding["type"],
        )
    )

    return findings

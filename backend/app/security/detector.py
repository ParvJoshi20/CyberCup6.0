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




# Spoken / obfuscated digit sequences. These are intentionally bounded to
# contiguous digit-word runs; ordinary prose is not converted wholesale.
_DIGIT_TOKEN = re.compile(
    r"(?i)(?<![a-z])"
    r"(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)"
    r"(?![a-z])"
    r"|[0-9]"
)
_DIGIT_GAP = re.compile(r"^[\s,;:.\-–—…]*$")


def _spoken_digit_findings(text: str) -> list[Finding]:
    """Find long runs of digit words/digits while retaining original spans.

    12 tokens are treated as an Aadhaar candidate, 13–19 as a payment-card
    candidate, and 10 as a phone candidate. These are format candidates only.
    """
    tokens = list(_DIGIT_TOKEN.finditer(text))
    if not tokens:
        return []

    runs: list[list[re.Match[str]]] = []
    current = [tokens[0]]
    for token in tokens[1:]:
        previous = current[-1]
        gap = text[previous.end():token.start()]
        if _DIGIT_GAP.fullmatch(gap):
            current.append(token)
        else:
            runs.append(current)
            current = [token]
    runs.append(current)

    findings: list[Finding] = []
    for run in runs:
        # Avoid converting incidental short number words in ordinary prose.
        count = len(run)
        if count not in (10, 12) and not 13 <= count <= 19:
            continue

        start, end = run[0].start(), run[-1].end()
        if count == 12:
            category = "aadhaar_candidate"
        elif count == 10:
            category = "phone_candidate"
        else:
            category = "payment_card_candidate"

        findings.append({
            "type": category,
            "start": start,
            "end": end,
            "match": text[start:end],
        })

    return findings


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
    """Detect sensitive-data candidates and resolve overlapping numeric matches."""
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
            findings.append({
                "type": category,
                "start": start,
                "end": end,
                "match": match.group(0),
            })

    # Also recognize digit sequences spoken as words (e.g. "one nine two...").
    for finding in _spoken_digit_findings(text):
        key = (finding["type"], finding["start"], finding["end"])
        if key not in seen:
            seen.add(key)
            findings.append(finding)

    # First, remove Aadhaar candidates contained within a longer card match.
    card_findings = [
        f for f in findings
        if f["type"] == "payment_card_candidate"
    ]

    filtered = []
    for finding in findings:
        if finding["type"] == "aadhaar_candidate":
            contained_in_card = any(
                card["start"] <= finding["start"]
                and finding["end"] <= card["end"]
                and (
                    card["start"] < finding["start"]
                    or finding["end"] < card["end"]
                )
                for card in card_findings
            )
            if contained_in_card:
                continue

        filtered.append(finding)

    # Then suppress phone candidates overlapping Aadhaar or card candidates.
    priority_findings = [
        f for f in filtered
        if f["type"] in {
            "aadhaar_candidate",
            "payment_card_candidate",
        }
    ]

    result = []
    for finding in filtered:
        if finding["type"] == "phone_candidate":
            overlaps_priority = any(
                finding["start"] < priority["end"]
                and priority["start"] < finding["end"]
                for priority in priority_findings
            )
            if overlaps_priority:
                continue

        result.append(finding)

    result.sort(
        key=lambda f: (f["start"], f["end"], f["type"])
    )
    return result
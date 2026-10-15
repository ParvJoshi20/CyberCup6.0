
"""Regression tests for the AegisGate security engine.

To be run from the repository root:
    python -m pytest backend/tests/test_security_engine.py -v
"""

import pytest

from backend.app.security.detector import detect_sensitive_data
from backend.app.security.policy import apply_policy


# -------------------------------------------------------------------
# 1. Sensitive-data detection
# -------------------------------------------------------------------

def test_detect_email():
    text = "Contact alice@example.com for details."

    findings = detect_sensitive_data(text)

    assert any(f["type"] == "email" for f in findings)
    email = next(f for f in findings if f["type"] == "email")
    assert email["match"] == "alice@example.com"


def test_detect_phone_candidate():
    text = "Call +91 98765 43210."

    findings = detect_sensitive_data(text)

    assert any(f["type"] == "phone_candidate" for f in findings)


def test_detect_payment_card_candidate():
    text = "Test card: 4111 1111 1111 1111"

    findings = detect_sensitive_data(text)

    assert any(
        f["type"] == "payment_card_candidate"
        for f in findings
    )


def test_detect_pan_candidate():
    text = "PAN: ABCDE1234F"

    findings = detect_sensitive_data(text)

    assert any(f["type"] == "pan_candidate" for f in findings)


def test_detect_aadhaar_candidate():
    # Synthetic test data only; this does not represent a real identity.
    text = "ID candidate: 2345 6789 0123"

    findings = detect_sensitive_data(text)

    assert any(f["type"] == "aadhaar_candidate" for f in findings)


def test_detect_key_assignment():
    text = "key=abcd123456789"

    findings = detect_sensitive_data(text)

    assert any(f["type"] == "api_key_candidate" for f in findings)


def test_detect_sk_prefixed_token():
    text = "Token: sk-abcdefghijklmnop123456"

    findings = detect_sensitive_data(text)

    assert any(f["type"] == "api_key_candidate" for f in findings)


# -------------------------------------------------------------------
# 2. Finding structure and locations
# -------------------------------------------------------------------

def test_findings_have_valid_spans():
    text = "Email alice@example.com"

    findings = detect_sensitive_data(text)

    assert findings

    for finding in findings:
        assert finding["start"] >= 0
        assert finding["end"] > finding["start"]
        assert finding["end"] <= len(text)
        assert text[finding["start"]:finding["end"]] == finding["match"]


def test_findings_are_ordered_by_position():
    text = "alice@example.com then bob@example.com"

    findings = detect_sensitive_data(text)

    positions = [
        (finding["start"], finding["end"], finding["type"])
        for finding in findings
    ]

    assert positions == sorted(positions)


def test_empty_and_ordinary_text_have_no_findings():
    assert detect_sensitive_data("") == []
    assert detect_sensitive_data("Hello, how are you?") == []


def test_detector_rejects_non_string_input():
    with pytest.raises(TypeError):
        detect_sensitive_data(None)


# -------------------------------------------------------------------
# 3. Policy behavior
# -------------------------------------------------------------------

def test_mask_policy_redacts_email():
    result = apply_policy("Contact alice@example.com", "mask")

    assert result.action == "mask"
    assert result.allowed is True
    assert result.safe_text == "Contact [REDACTED_EMAIL]"
    assert result.findings


def test_mask_policy_redacts_multiple_emails():
    result = apply_policy(
        "Email alice@example.com and bob@example.com",
        "mask",
    )

    assert result.allowed is True
    assert result.safe_text == (
        "Email [REDACTED_EMAIL] and [REDACTED_EMAIL]"
    )
    assert "alice@example.com" not in result.safe_text
    assert "bob@example.com" not in result.safe_text


def test_block_policy_denies_sensitive_input():
    result = apply_policy("Contact alice@example.com", "block")

    assert result.action == "block"
    assert result.allowed is False
    assert result.safe_text is None
    assert result.findings


def test_allow_policy_preserves_ordinary_text():
    text = "Hello, how are you?"

    result = apply_policy(text, "allow")

    assert result.action == "allow"
    assert result.allowed is True
    assert result.safe_text == text


def test_mask_policy_preserves_ordinary_text():
    text = "The weather is pleasant today."

    result = apply_policy(text, "mask")

    assert result.allowed is True
    assert result.safe_text == text
    assert result.findings == ()


def test_mask_policy_handles_empty_input():
    result = apply_policy("", "mask")

    assert result.allowed is True
    assert result.safe_text == ""
    assert result.findings == ()


def test_policy_rejects_invalid_action():
    with pytest.raises(ValueError):
        apply_policy("Hello", "delete")


def test_policy_rejects_non_string_input():
    with pytest.raises(TypeError):
        apply_policy(None, "mask")


# -------------------------------------------------------------------
# 4. Overlap and regression checks
# -------------------------------------------------------------------

def test_overlapping_findings_do_not_leak_sensitive_digits():
    # Synthetic numeric test data only.
    text = "Data: 123456789012"

    result = apply_policy(text, "mask")

    assert isinstance(result.safe_text, str)
    assert "123456789012" not in result.safe_text
    assert result.findings


def test_policy_masks_api_key_assignment():
    text = "Use key=abcd123456789 for testing."

    result = apply_policy(text, "mask")

    assert result.allowed is True
    assert "abcd123456789" not in result.safe_text


def test_policy_masks_sk_prefixed_token():
    text = "Token: sk-abcdefghijklmnop123456"

    result = apply_policy(text, "mask")

    assert result.allowed is True
    assert "sk-abcdefghijklmnop123456" not in result.safe_text

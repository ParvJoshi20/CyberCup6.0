from app.security.detector import detect_sensitive_data


def test_detects_obfuscated_aadhaar_like_sequence():
    text = (
        "Please inspect this test message for sensitive information: "
        "test identifier one234 5678 901two"
    )

    findings = detect_sensitive_data(text)

    matches = [
        finding for finding in findings
        if finding["type"] == "aadhaar_candidate"
    ]

    assert matches
    assert matches[0]["match"] == "one234 5678 901two"


def test_detects_regular_grouped_numeric_candidate():
    findings = detect_sensitive_data("Test: 1234 5678 9012")

    assert any(
        finding["type"] == "aadhaar_candidate"
        for finding in findings
    )


def test_does_not_detect_digit_words_inside_ordinary_words():
    findings = detect_sensitive_data(
        "Someone is doing something wonderful today."
    )

    assert not any(
        finding["type"] in {
            "aadhaar_candidate",
            "payment_card_candidate",
            "phone_candidate",
        }
        for finding in findings
    )


def test_finding_span_preserves_original_text():
    text = "identifier one234 5678 901two"

    findings = detect_sensitive_data(text)
    candidate = next(
        finding for finding in findings
        if finding["type"] == "aadhaar_candidate"
    )

    assert text[candidate["start"]:candidate["end"]] == candidate["match"]

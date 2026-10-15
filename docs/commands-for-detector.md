
@'
from backend.app.security.detector import detect_sensitive_data

passed = 0
failed = 0

def test(name, text, expected_type=None, expected_match=None):
    global passed, failed
    print(f"\n{'=' * 60}")
    print(f"TEST: {name}")
    print(f"INPUT: {text!r}")

    try:
        findings = detect_sensitive_data(text)

        for f in findings:
            print(
                f"  Type:  {f['type']}\n"
                f"  Match: {f['match']}\n"
                f"  Span:  {f['start']}:{f['end']}"
            )

            assert text[f["start"]:f["end"]] == f["match"], (
                "Finding offsets do not match the input"
            )

        if expected_type is not None:
            assert any(
                f["type"] == expected_type
                and (
                    expected_match is None
                    or f["match"] == expected_match
                )
                for f in findings
            ), f"Expected {expected_type} was not detected"

        print("RESULT: PASS")
        passed += 1

    except Exception as exc:
        print(f"RESULT: FAIL - {exc}")
        failed += 1


print("\nAEGISGATE — SENSITIVE DATA DETECTOR DEMO")

test(
    "Email detection",
    "Contact alice@example.com",
    "email",
    "alice@example.com",
)

test(
    "Phone candidate detection",
    "Call +91 98765 43210",
    "phone_candidate",
)

test(
    "Payment card candidate detection",
    "Test card: 4111 1111 1111 1111",
    "payment_card_candidate",
)

test(
    "PAN candidate detection",
    "PAN: ABCDE1234F",
    "pan_candidate",
)

test(
    "Aadhaar candidate detection",
    "ID candidate: 2345 6789 0123",
    "aadhaar_candidate",
)

test(
    "API key assignment detection",
    "key=abcd123456789",
    "api_key_candidate",
    "key=abcd123456789",
)

test(
    "sk-prefixed token detection",
    "Token: sk-abcdefghijklmnop123456",
    "api_key_candidate",
    "sk-abcdefghijklmnop123456",
)

test(
    "Multiple findings",
    "Email alice@example.com and bob@example.com",
    "email",
)

test(
    "Ordinary text",
    "Hello, welcome to AegisGate",
)

test(
    "Empty input",
    "",
)

test(
    "Phone-like digits embedded in an identifier",
    "Reference ABC123456789XYZ",
)

print(f"\n{'=' * 60}")
print(f"SUMMARY: {passed} PASSED | {failed} FAILED")
print("DETECTOR DEMO: " + ("ALL CHECKS PASSED" if failed == 0 else "FAILURES FOUND"))
'@ | python -

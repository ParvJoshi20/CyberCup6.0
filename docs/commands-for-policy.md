AegisGate — Policy Engine Live Demonstration


@'
from backend.app.security.policy import apply_policy

passed = 0
failed = 0

def demo(name, check):
    global passed, failed
    print("\n" + "=" * 65)
    print(f"TEST: {name}")

    try:
        check()
        print("RESULT: PASS")
        passed += 1
    except Exception as exc:
        print(f"RESULT: FAIL - {type(exc).__name__}: {exc}")
        failed += 1

def show_result(result):
    print(f"Action:   {result.action}")
    print(f"Allowed:  {result.allowed}")
    print(f"Safe text: {result.safe_text}")
    print(f"Findings: {len(result.findings)}")
    print(f"Reason:   {result.reason}")

def test_mask():
    result = apply_policy("Contact alice@example.com", "mask")
    show_result(result)
    assert result.allowed is True
    assert result.safe_text == "Contact [REDACTED_EMAIL]"

def test_block():
    result = apply_policy("Contact alice@example.com", "block")
    show_result(result)
    assert result.allowed is False
    assert result.safe_text is None

def test_allow():
    result = apply_policy("Hello, welcome to AegisGate", "allow")
    show_result(result)
    assert result.allowed is True
    assert result.safe_text == "Hello, welcome to AegisGate"

def test_multiple_findings():
    result = apply_policy(
        "Email alice@example.com and bob@example.com", "mask"
    )
    show_result(result)
    assert result.allowed is True
    assert result.safe_text == (
        "Email [REDACTED_EMAIL] and [REDACTED_EMAIL]"
    )

def test_overlapping_findings():
    # Synthetic numeric data used only for testing.
    text = "Data: 123456789012"
    result = apply_policy(text, "mask")
    show_result(result)
    assert result.allowed is True
    assert isinstance(result.safe_text, str)
    assert "123456789012" not in result.safe_text

def test_empty_input():
    result = apply_policy("", "mask")
    show_result(result)
    assert result.allowed is True
    assert result.safe_text == ""

def test_ordinary_text():
    text = "The weather is pleasant today."
    result = apply_policy(text, "mask")
    show_result(result)
    assert result.allowed is True
    assert result.safe_text == text
    assert len(result.findings) == 0

def test_api_key_masking():
    result = apply_policy("key=abcd123456789", "mask")
    show_result(result)
    assert result.allowed is True
    assert result.safe_text is not None
    assert "abcd123456789" not in result.safe_text

def test_sk_token_masking():
    result = apply_policy(
        "Token: sk-abcdefghijklmnop123456", "mask"
    )
    show_result(result)
    assert result.allowed is True
    assert result.safe_text is not None
    assert "sk-abcdefghijklmnop123456" not in result.safe_text

def test_invalid_action():
    try:
        apply_policy("Hello", "delete")
    except ValueError:
        print("Unsupported action correctly rejected.")
        return
    raise AssertionError("Unsupported action was accepted")

def test_invalid_input():
    try:
        apply_policy(None, "mask")
    except TypeError:
        print("Non-string input correctly rejected.")
        return
    raise AssertionError("Non-string input was accepted")

print("\nAEGISGATE — POLICY ENGINE DEMO")

demo("MASK SENSITIVE DATA", test_mask)
demo("BLOCK SENSITIVE INPUT", test_block)
demo("ALLOW ORDINARY REQUEST", test_allow)
demo("MASK MULTIPLE FINDINGS", test_multiple_findings)
demo("HANDLE OVERLAPPING FINDINGS", test_overlapping_findings)
demo("HANDLE EMPTY INPUT", test_empty_input)
demo("PRESERVE ORDINARY TEXT", test_ordinary_text)
demo("MASK API KEY ASSIGNMENT", test_api_key_masking)
demo("MASK SK-PREFIXED TOKEN", test_sk_token_masking)
demo("REJECT INVALID POLICY ACTION", test_invalid_action)
demo("REJECT INVALID INPUT TYPE", test_invalid_input)

print("\n" + "=" * 65)
print(f"SUMMARY: {passed} PASSED | {failed} FAILED")
print("POLICY DEMO: " + (
    "ALL CHECKS PASSED" if failed == 0 else "FAILURES FOUND"
))
'@ | python -

from __future__ import annotations

from dataclasses import dataclass
from app.security.detectors import SecurityFinding, inspect_output


@dataclass(frozen=True)
class OutputInspectionResult:
    action: str
    sanitized_output: str
    findings: list[SecurityFinding]


def inspect_provider_output(output: str) -> OutputInspectionResult:
    findings = inspect_output(output)

    if not findings:
        return OutputInspectionResult("ALLOW", output, [])

    # Never return output containing a detected credential-like token.
    if any(f.category == "output_api_key" for f in findings):
        return OutputInspectionResult(
            "BLOCK", "Response blocked by output inspection.", findings
        )

    placeholders = {
        "output_email": "[REDACTED_EMAIL]",
        "output_phone": "[REDACTED_PHONE]",
        "output_payment_card": "[REDACTED_PAYMENT_CARD]",
        "output_pan": "[REDACTED_PAN]",
        "output_aadhaar": "[REDACTED_AADHAAR]",
    }

    sanitized = output
    # Replace from right to left so earlier offsets remain valid.
    for finding in sorted(findings, key=lambda f: (f.start, f.end), reverse=True):
        replacement = placeholders.get(
            finding.category, "[REDACTED_SENSITIVE_DATA]"
        )
        sanitized = sanitized[:finding.start] + replacement + sanitized[finding.end:]

    return OutputInspectionResult("REDACT", sanitized, findings)

from __future__ import annotations

from dataclasses import dataclass

from app.security.detectors import inspect_output


@dataclass(frozen=True)
class OutputInspectionResult:
    action: str
    sanitized_output: str
    findings: list


def inspect_provider_output(output: str) -> OutputInspectionResult:
    """Inspect the model output and fail closed on secret-like output."""
    findings = inspect_output(output)
    if not findings:
        return OutputInspectionResult(action="ALLOW", sanitized_output=output, findings=[])

    if any(finding.category in {"output_api_key"} for finding in findings):
        return OutputInspectionResult(
            action="BLOCK",
            sanitized_output="Response blocked by output inspection.",
            findings=findings,
        )

    sanitized_output = output
    for finding in findings:
        if finding.category in {"output_email", "output_phone"}:
            sanitized_output = sanitized_output.replace(" ", " ")
    return OutputInspectionResult(action="REDACT", sanitized_output="Response blocked by output inspection.", findings=findings)

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class AuditEvent:
    request_id: str
    provider_id: str | None
    categories: list[str] = field(default_factory=list)
    policy_action: str = "ALLOW"
    provider_invoked: bool = False
    final_outcome: str = "ALLOW"
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def model_dump(self) -> dict[str, Any]:
        return {
            "request_id": self.request_id,
            "provider_id": self.provider_id,
            "categories": self.categories,
            "policy_action": self.policy_action,
            "provider_invoked": self.provider_invoked,
            "final_outcome": self.final_outcome,
            "timestamp": self.timestamp,
        }


class AuditLogger:
    def __init__(self) -> None:
        self.events: list[AuditEvent] = []

    def log_event(self, *, request_id: str, provider_id: str | None, categories: list[str], policy_action: str, provider_invoked: bool, final_outcome: str) -> AuditEvent:
        event = AuditEvent(
            request_id=request_id,
            provider_id=provider_id,
            categories=categories,
            policy_action=policy_action,
            provider_invoked=provider_invoked,
            final_outcome=final_outcome,
        )
        self.events.append(event)
        return event


_audit_logger = AuditLogger()


def get_audit_logger() -> AuditLogger:
    return _audit_logger

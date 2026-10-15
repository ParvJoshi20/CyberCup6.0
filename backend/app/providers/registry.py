from __future__ import annotations

from app.audit.audit import get_audit_logger
from app.providers.echo import EchoProvider
from app.providers.scripted_leaky import ScriptedLeakyProvider


class ProviderRegistry:
    def __init__(self) -> None:
        self.providers = {
            "echo": EchoProvider(),
            "scripted_leaky": ScriptedLeakyProvider(),
        }
        self.audit_logger = get_audit_logger()

    def get(self, provider_id: str):
        return self.providers.get(provider_id)

    def invoke(self, provider_id: str, message: str, *, model_id: str | None = None) -> str:
        provider = self.get(provider_id)
        if provider is None:
            raise KeyError(f"Unknown provider: {provider_id}")
        return provider.generate(message, model_id=model_id)


_registry: ProviderRegistry | None = None


def get_provider_registry() -> ProviderRegistry:
    global _registry
    if _registry is None:
        _registry = ProviderRegistry()
    return _registry

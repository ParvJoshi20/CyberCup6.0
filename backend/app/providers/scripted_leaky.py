from __future__ import annotations

from app.providers.base import BaseProvider


class ScriptedLeakyProvider(BaseProvider):
    provider_id = "scripted_leaky"

    def __init__(self) -> None:
        super().__init__()
        self.response_text = "The demo secret is sk_live_7890 and the internal token is no longer valid."

    def generate(self, message: str, *, model_id: str | None = None) -> str:
        self.call_count += 1
        self.last_message = message
        self.last_model_id = model_id
        return self.response_text

    def reset(self) -> None:
        super().reset()
        self.response_text = "The demo secret is sk_live_7890 and the internal token is no longer valid."

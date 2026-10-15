from __future__ import annotations

from app.providers.base import BaseProvider


class EchoProvider(BaseProvider):
    provider_id = "echo"

    def generate(self, message: str, *, model_id: str | None = None) -> str:
        self.call_count += 1
        self.last_message = message
        self.last_model_id = model_id
        return message

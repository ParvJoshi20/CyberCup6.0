from __future__ import annotations

from abc import ABC, abstractmethod


class BaseProvider(ABC):
    provider_id: str = "base"

    def __init__(self) -> None:
        self.call_count = 0
        self.last_message: str | None = None
        self.last_model_id: str | None = None

    def reset(self) -> None:
        self.call_count = 0
        self.last_message = None
        self.last_model_id = None

    @abstractmethod
    def generate(self, message: str, *, model_id: str | None = None) -> str:
        raise NotImplementedError

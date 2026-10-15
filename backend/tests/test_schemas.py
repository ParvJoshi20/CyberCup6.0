"""
test_schemas.py
---------------
Unit tests for the Pydantic schemas defined in app/schemas.py.

These tests instantiate model objects directly — no HTTP layer — so they run
fast and do not depend on a running server.

What is tested
--------------
* A valid ChatRequest can be constructed.
* Optional fields default to the expected values.
* Empty message is rejected.
* Whitespace-only message is rejected.
* Overlong message is rejected.
* Stripping of surrounding whitespace happens transparently.
* model_id that exceeds the max length is rejected.
* conversation_id that exceeds the max length is rejected.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas import ChatRequest

# The character limit declared in schemas.py.
_MAX_MESSAGE_LEN = 8_000
_MAX_MODEL_ID_LEN = 128
_MAX_CONVERSATION_ID_LEN = 128


class TestChatRequestValid:
    """Happy-path construction of ChatRequest objects."""

    def test_valid_minimal_request(self) -> None:
        """Only ``message`` is required; everything else has a default."""
        req = ChatRequest(message="Hello, world!")
        assert req.message == "Hello, world!"

    def test_default_model_id(self) -> None:
        """model_id defaults to 'echo'."""
        req = ChatRequest(message="test")
        assert req.model_id == "echo"

    def test_default_use_rag_is_false(self) -> None:
        """use_rag defaults to False."""
        req = ChatRequest(message="test")
        assert req.use_rag is False

    def test_default_conversation_id_is_none(self) -> None:
        """conversation_id defaults to None."""
        req = ChatRequest(message="test")
        assert req.conversation_id is None

    def test_explicit_optional_fields(self) -> None:
        """Explicit values for all optional fields are stored correctly."""
        req = ChatRequest(
            message="Explain quantum entanglement.",
            model_id="gpt-4o",
            use_rag=True,
            conversation_id="session-abc-123",
        )
        assert req.model_id == "gpt-4o"
        assert req.use_rag is True
        assert req.conversation_id == "session-abc-123"

    def test_message_surrounding_whitespace_is_stripped(self) -> None:
        """Leading and trailing whitespace must be stripped automatically."""
        req = ChatRequest(message="  hello  ")
        assert req.message == "hello"

    def test_message_at_exact_max_length_is_accepted(self) -> None:
        """A message of exactly _MAX_MESSAGE_LEN characters is valid."""
        req = ChatRequest(message="x" * _MAX_MESSAGE_LEN)
        assert len(req.message) == _MAX_MESSAGE_LEN


class TestChatRequestInvalid:
    """Rejection cases for ChatRequest."""

    def test_empty_message_is_rejected(self) -> None:
        """An empty string must raise ValidationError."""
        with pytest.raises(ValidationError):
            ChatRequest(message="")

    def test_whitespace_only_message_is_rejected(self) -> None:
        """A message consisting solely of whitespace must be rejected."""
        with pytest.raises(ValidationError):
            ChatRequest(message="     ")

    def test_tab_only_message_is_rejected(self) -> None:
        """Tabs-only content is whitespace and must be rejected."""
        with pytest.raises(ValidationError):
            ChatRequest(message="\t\n\r")

    def test_overlong_message_is_rejected(self) -> None:
        """A message longer than the limit must raise ValidationError."""
        with pytest.raises(ValidationError):
            ChatRequest(message="x" * (_MAX_MESSAGE_LEN + 1))

    def test_overlong_model_id_is_rejected(self) -> None:
        """model_id longer than the limit must raise ValidationError."""
        with pytest.raises(ValidationError):
            ChatRequest(message="hello", model_id="m" * (_MAX_MODEL_ID_LEN + 1))

    def test_overlong_conversation_id_is_rejected(self) -> None:
        """conversation_id longer than the limit must raise ValidationError."""
        with pytest.raises(ValidationError):
            ChatRequest(message="hello", conversation_id="c" * (_MAX_CONVERSATION_ID_LEN + 1))

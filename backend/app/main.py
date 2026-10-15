"""FastAPI application entry point. Endpoint implementation is intentionally pending."""

from fastapi import FastAPI

app = FastAPI(title="AegisGate API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    """Basic liveness endpoint for local development."""
    return {"status": "ok"}

from __future__ import annotations
from .utils import now_iso

TRANSIENT = {"timeout","api_error","temporary_failure","rate_limited","connection_reset"}

def decide_retry(status: str, attempt: int, max_attempts: int = 3) -> dict:
    normalized = str(status or "").strip().lower()
    retryable = normalized in TRANSIENT and attempt < max_attempts
    delay_seconds = min(300, 2 ** max(0, attempt) * 5) if retryable else 0
    return {
        "status": normalized,
        "attempt": int(attempt),
        "max_attempts": int(max_attempts),
        "retry": retryable,
        "delay_seconds": delay_seconds,
        "reason": (
            "transient_failure" if retryable
            else "max_attempts_reached" if normalized in TRANSIENT
            else "non_retryable_status"
        ),
        "created_at": now_iso(),
    }

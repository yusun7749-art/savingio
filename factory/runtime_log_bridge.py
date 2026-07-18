from __future__ import annotations

from argparse import Namespace
from .MASTER_LOG.master_log_manager import record


def write_runtime_log(
    *,
    summary: str,
    status: str = "IMPLEMENTED",
    files: str = "",
    tests: str = "",
    next_step: str = "",
    blocker: str = "",
) -> None:
    """Single runtime bridge for Factory execution records."""
    record(
        Namespace(
            summary=summary,
            status=status,
            files=files,
            tests=tests,
            next=next_step,
            blocker=blocker,
        )
    )

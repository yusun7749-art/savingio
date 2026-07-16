from __future__ import annotations

from pathlib import Path
from typing import Callable, TypeVar

from .controller_log import ControllerLogger
from .controller_progress import show
from .controller_status import ControllerStatusStore
from .utils import now_iso, save_json

T = TypeVar("T")


class FactoryController:
    """Small orchestration shell for visible state, logs, and final proof."""

    def __init__(self, root: Path, operation: str) -> None:
        self.root = root.resolve()
        self.operation = operation
        self.status = ControllerStatusStore(self.root)
        self.log = ControllerLogger(self.root)
        self.report_path = self.root / "factory" / "output" / "controller_report.json"
        self.events: list[dict] = []

    def run_stage(self, step: int, total: int, department: str, fn: Callable[[], T]) -> T:
        self.status.set(department, "running", step)
        self.log.write(f"{department}:START", self.operation)
        show(step, total, department, "RUNNING")
        started_at = now_iso()
        try:
            result = fn()
        except Exception as exc:
            self.status.set(department, "failed", step, f"{type(exc).__name__}: {exc}")
            self.log.write(f"{department}:FAIL", f"{type(exc).__name__}: {exc}")
            self.events.append({"department": department, "status": "failed", "started_at": started_at, "finished_at": now_iso(), "error": f"{type(exc).__name__}: {exc}"})
            self._flush(False)
            raise
        self.status.set(department, "completed", step)
        self.log.write(f"{department}:PASS")
        show(step, total, department, "PASS")
        self.events.append({"department": department, "status": "completed", "started_at": started_at, "finished_at": now_iso()})
        self._flush(True)
        return result

    def _flush(self, passed: bool) -> None:
        save_json(self.report_path, {
            "operation": self.operation,
            "updated_at": now_iso(),
            "pass": passed,
            "events": self.events,
        })

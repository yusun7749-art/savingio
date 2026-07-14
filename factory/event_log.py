from __future__ import annotations

from pathlib import Path
from typing import Any
import json

from .utils import now_iso


class DepartmentEventLog:
    def __init__(self, project_root: Path):
        self.path = project_root.resolve() / "factory" / "history" / "department_events.jsonl"
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def append(self, department: str, event: str, payload: dict[str, Any] | None = None, workflow_id: str | None = None) -> dict[str, Any]:
        row = {
            "department": department,
            "event": event,
            "workflow_id": workflow_id,
            "payload": payload or {},
            "created_at": now_iso(),
        }
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
        return row

    def read(self, limit: int = 200) -> list[dict[str, Any]]:
        if not self.path.exists():
            return []
        lines = self.path.read_text(encoding="utf-8").splitlines()
        return [json.loads(line) for line in lines[-limit:] if line.strip()]

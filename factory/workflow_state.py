from __future__ import annotations

from pathlib import Path
from typing import Any
import json

from .utils import now_iso


VALID_TRANSITIONS = {
    "created": {"running", "cancelled"},
    "running": {"rework_required", "waiting_approval", "failed"},
    "rework_required": {"running", "failed"},
    "waiting_approval": {"approved", "rejected"},
    "approved": {"deploying"},
    "deploying": {"completed", "failed"},
    "rejected": {"rework_required", "cancelled"},
    "failed": {"running", "cancelled"},
    "completed": set(),
    "cancelled": set(),
}


class WorkflowStateManager:
    def __init__(self, project_root: Path):
        self.dir = project_root.resolve() / "factory" / "state" / "workflows"
        self.dir.mkdir(parents=True, exist_ok=True)

    def create(self, workflow_id: str, topic: str) -> dict[str, Any]:
        state = {
            "workflow_id": workflow_id,
            "topic": topic,
            "status": "created",
            "history": [{"from": None, "to": "created", "at": now_iso()}],
            "updated_at": now_iso(),
        }
        self._save(state)
        return state

    def transition(self, workflow_id: str, new_status: str, detail: dict[str, Any] | None = None) -> dict[str, Any]:
        state = self.load(workflow_id)
        current = state["status"]
        allowed = VALID_TRANSITIONS.get(current, set())
        if new_status not in allowed:
            raise ValueError(f"invalid transition: {current} -> {new_status}")
        state["status"] = new_status
        state["history"].append({"from": current, "to": new_status, "detail": detail or {}, "at": now_iso()})
        state["updated_at"] = now_iso()
        self._save(state)
        return state

    def load(self, workflow_id: str) -> dict[str, Any]:
        path = self.dir / f"{workflow_id}.json"
        if not path.exists():
            raise FileNotFoundError(path)
        return json.loads(path.read_text(encoding="utf-8"))

    def list_states(self) -> list[dict[str, Any]]:
        return [json.loads(path.read_text(encoding="utf-8")) for path in sorted(self.dir.glob("*.json"))]

    def _save(self, state: dict[str, Any]) -> None:
        (self.dir / f"{state['workflow_id']}.json").write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")

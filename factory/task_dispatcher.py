from __future__ import annotations

from pathlib import Path
from typing import Any, Callable
import json
import uuid

from .message_bus import DepartmentMessageBus
from .utils import now_iso


DEPARTMENT_ORDER = [
    "planning", "research", "writing", "seo", "image",
    "qa_primary", "qa_final", "cms", "git", "deploy",
]


class TaskDispatcher:
    """Creates and routes workflow tasks through the department message bus."""

    def __init__(self, project_root: Path):
        self.project_root = project_root.resolve()
        self.bus = DepartmentMessageBus(self.project_root)
        self.task_dir = self.project_root / "factory" / "state" / "tasks"
        self.task_dir.mkdir(parents=True, exist_ok=True)

    def create_workflow(self, topic: str) -> dict[str, Any]:
        workflow_id = uuid.uuid4().hex
        task = {
            "workflow_id": workflow_id,
            "topic": topic,
            "status": "created",
            "current_department": "planning",
            "completed_departments": [],
            "failed_departments": [],
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        self._save(task)
        self.bus.publish("operations", "planning", "task.assigned", task, workflow_id)
        return task

    def advance(self, workflow_id: str, completed_department: str, packet: dict[str, Any]) -> dict[str, Any]:
        task = self.load(workflow_id)
        if completed_department not in DEPARTMENT_ORDER:
            raise ValueError(f"unknown department: {completed_department}")
        if completed_department not in task["completed_departments"]:
            task["completed_departments"].append(completed_department)
        index = DEPARTMENT_ORDER.index(completed_department)
        if index + 1 >= len(DEPARTMENT_ORDER):
            task["status"] = "completed"
            task["current_department"] = None
        else:
            next_department = DEPARTMENT_ORDER[index + 1]
            task["status"] = "running"
            task["current_department"] = next_department
            self.bus.publish(completed_department, next_department, "task.handoff", packet, workflow_id)
        task["updated_at"] = now_iso()
        self._save(task)
        return task

    def fail(self, workflow_id: str, department: str, issues: list[str]) -> dict[str, Any]:
        task = self.load(workflow_id)
        if department not in task["failed_departments"]:
            task["failed_departments"].append(department)
        task["status"] = "rework_required"
        task["current_department"] = department
        task["last_issues"] = issues
        task["updated_at"] = now_iso()
        self._save(task)
        self.bus.publish("qa_final", department, "task.rework", {"issues": issues}, workflow_id)
        return task

    def load(self, workflow_id: str) -> dict[str, Any]:
        path = self.task_dir / f"{workflow_id}.json"
        if not path.exists():
            raise FileNotFoundError(path)
        return json.loads(path.read_text(encoding="utf-8"))

    def list_tasks(self) -> list[dict[str, Any]]:
        return [json.loads(path.read_text(encoding="utf-8")) for path in sorted(self.task_dir.glob("*.json"))]

    def _save(self, task: dict[str, Any]) -> None:
        path = self.task_dir / f"{task['workflow_id']}.json"
        path.write_text(json.dumps(task, ensure_ascii=False, indent=2), encoding="utf-8")

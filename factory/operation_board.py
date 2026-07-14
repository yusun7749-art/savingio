from __future__ import annotations

from pathlib import Path
from typing import Any

from .department_board import status as department_status
from .message_bus import DepartmentMessageBus
from .task_dispatcher import TaskDispatcher
from .workflow_state import WorkflowStateManager
from .event_log import DepartmentEventLog
from .utils import save_json, now_iso


def build_operation_board(project_root: Path) -> dict[str, Any]:
    project_root = project_root.resolve()
    bus = DepartmentMessageBus(project_root)
    dispatcher = TaskDispatcher(project_root)
    workflows = WorkflowStateManager(project_root)
    events = DepartmentEventLog(project_root)
    report = {
        "departments": department_status(),
        "message_bus": bus.summary(),
        "tasks": dispatcher.list_tasks(),
        "workflows": workflows.list_states(),
        "recent_events": events.read(limit=100),
        "updated_at": now_iso(),
    }
    save_json(project_root / "factory" / "output" / "operation_board.json", report)
    return report

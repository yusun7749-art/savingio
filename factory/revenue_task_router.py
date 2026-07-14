from __future__ import annotations
from pathlib import Path
import json
from .task_dispatcher import TaskDispatcher
from .utils import save_json, now_iso

def route_revenue_actions(project_root: Path, actions_path: Path | None = None) -> dict:
    path = actions_path or project_root/"factory"/"output"/"revenue"/"revenue_ai_actions.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    dispatcher = TaskDispatcher(project_root)
    routed = []
    for action in payload.get("actions", []):
        workflow = dispatcher.create_workflow(f"revenue:{action['page']}")
        department = action.get("department", "revenue")
        task = dispatcher.fail(
            workflow["workflow_id"],
            department,
            [action["action"], action["reason"]],
        )
        routed.append({
            "workflow_id":workflow["workflow_id"],
            "page":action["page"],
            "department":department,
            "action":action["action"],
            "priority":action["priority"],
            "task_status":task["status"],
        })
    result = {"routed_count":len(routed),"items":routed,"created_at":now_iso()}
    save_json(project_root/"factory"/"output"/"revenue"/"routed_tasks.json", result)
    return result

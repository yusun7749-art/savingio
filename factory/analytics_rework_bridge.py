from __future__ import annotations
from pathlib import Path
import json
from .task_dispatcher import TaskDispatcher
from .utils import save_json, now_iso

ACTION_DEPARTMENT = {
    "rewrite_title_meta":"seo",
    "improve_indexability_internal_links":"seo",
    "check_analytics_tracking":"analytics",
}

def dispatch_optimization_actions(project_root: Path, actions_path: Path | None = None) -> dict:
    path = actions_path or project_root/"factory"/"output"/"analytics"/"optimization_actions.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    dispatcher = TaskDispatcher(project_root)
    dispatched = []
    for action in payload.get("actions",[]):
        workflow = dispatcher.create_workflow(f"analytics:{action['page']}")
        department = ACTION_DEPARTMENT.get(action["action"],"operations")
        dispatcher.fail(workflow["workflow_id"],department,[action["action"],action["reason"]])
        dispatched.append({
            "workflow_id":workflow["workflow_id"],
            "department":department,
            "page":action["page"],
            "action":action["action"],
        })
    result = {"dispatched_count":len(dispatched),"items":dispatched,"created_at":now_iso()}
    save_json(project_root/"factory"/"output"/"analytics"/"rework_dispatch.json",result)
    return result

from __future__ import annotations
from pathlib import Path
import json, shutil
from .utils import save_json, now_iso

def update_cms_manifest(project_root: Path, rewrite_result: dict, qa_result: dict, action: dict) -> dict:
    passed = bool(qa_result.get("qa",{}).get("pass"))
    target = project_root/rewrite_result["target"]
    rollback = False
    status = "qa_passed"
    if not passed and rewrite_result.get("backup"):
        backup = project_root/rewrite_result["backup"]
        if backup.exists():
            shutil.copy2(backup,target)
            rollback = True
            status = "rolled_back_qa_failed"
    manifest = {"status":status,"qa_pass":passed,"qa_score":qa_result.get("qa",{}).get("score"),"target":rewrite_result.get("target"),"backup":rewrite_result.get("backup"),"rollback":rollback,"action":action,"updated_at":now_iso()}
    save_json(project_root/"factory"/"output"/"revenue"/"cms_rework_manifest.json",manifest)
    return manifest

def append_rework_history(project_root: Path, item: dict) -> dict:
    path = project_root/"factory"/"output"/"revenue"/"rework_history.json"
    history = []
    if path.exists():
        payload = json.loads(path.read_text(encoding="utf-8"))
        history = payload if isinstance(payload,list) else payload.get("items",[])
    history.append(item)
    history = history[-500:]
    save_json(path,history)
    return {"history_count":len(history),"path":path.relative_to(project_root).as_posix()}

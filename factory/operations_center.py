from __future__ import annotations
from pathlib import Path
from .operations_snapshot import build_operations_snapshot
from .incident_detector import detect_incidents
from .recovery_planner import build_recovery_plan
from .utils import save_json, now_iso

def run_operations_center(project_root: Path) -> dict:
    snapshot = build_operations_snapshot(project_root)
    incidents = detect_incidents(project_root)
    recovery = build_recovery_plan(project_root)
    result = {
        "status":"completed",
        "overall_status":snapshot["overall_status"],
        "snapshot":snapshot,
        "incidents":incidents,
        "recovery":recovery,
        "created_at":now_iso(),
    }
    save_json(project_root/"factory"/"output"/"operations_center_report.json",result)
    return result

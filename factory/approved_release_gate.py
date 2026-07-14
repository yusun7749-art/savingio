from __future__ import annotations
from pathlib import Path
import json
from .deployment_gate import evaluate_deployment_gate
from .utils import now_iso

def _read(path: Path) -> dict:
    if not path.exists():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload if isinstance(payload, dict) else {}

def evaluate_approved_release(project_root: Path, files: list[str]) -> dict:
    approval = _read(project_root/"factory"/"output"/"approval_request.json")
    rework = _read(project_root/"factory"/"output"/"revenue"/"cms_rework_manifest.json")
    deployment = evaluate_deployment_gate(project_root)

    normalized = [value.strip().replace("\\","/") for value in dict.fromkeys(files) if value.strip()]
    missing_files = [value for value in normalized if not (project_root/value).is_file()]
    unsafe_files = [
        value for value in normalized
        if value.startswith("/") or ".." in Path(value).parts or value == "."
    ]

    checks = {
        "approval_present": bool(approval),
        "user_approved": approval.get("status") == "approved",
        "rework_manifest_present": bool(rework),
        "rework_qa_pass": rework.get("qa_pass") is True,
        "rework_not_rolled_back": rework.get("rollback") is not True,
        "deployment_gate_pass": deployment.get("pass") is True,
        "selected_files_present": bool(normalized) and not missing_files,
        "selected_files_safe": not unsafe_files,
    }
    blockers = [name for name, passed in checks.items() if not passed]
    return {
        "pass": not blockers,
        "checks": checks,
        "blockers": blockers,
        "selected_files": normalized,
        "missing_files": missing_files,
        "unsafe_files": unsafe_files,
        "approval": approval,
        "rework": rework,
        "deployment_gate": deployment,
        "checked_at": now_iso(),
    }

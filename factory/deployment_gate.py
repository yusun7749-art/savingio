from __future__ import annotations
from pathlib import Path
import json
from .utils import now_iso, save_json
from .deployment_integrity import verify_deployment_integrity
from .runtime_log_bridge import write_runtime_log


def evaluate_deployment_gate(project_root: Path, repair: bool = False) -> dict:
    project_root = project_root.resolve()
    integrity = verify_deployment_integrity(project_root, repair=repair)
    output = project_root / "factory" / "output"
    required_files = {
        "qa": output / "qa_report.json",
        "research": output / "research" / "research_qa.json",
        "approval": output / "approval_request.json",
        "image": output / "image_manifest.json",
    }
    loaded = {}
    missing = []
    for name, path in required_files.items():
        if path.exists():
            try:
                loaded[name] = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                loaded[name] = {}
        else:
            missing.append(name)

    checks = {
        "deployment_integrity_pass": bool(integrity.get("pass")),
        "doctor_pass": bool(integrity.get("doctor", {}).get("pass")),
        "adsense_lock_pass": bool(integrity.get("publisher_lock", {}).get("pass")),
        "required_reports_present": not missing,
        "qa_pass": bool(loaded.get("qa", {}).get("pass")),
        "research_pass": bool(loaded.get("research", {}).get("pass")),
        "user_approved": loaded.get("approval", {}).get("status") == "approved",
        "image_ready": bool(loaded.get("image", {}).get("ready")),
    }
    blockers = [name for name, passed in checks.items() if not passed]
    result = {
        "pass": not blockers,
        "status": "pass" if not blockers else "blocked",
        "checks": checks,
        "missing_reports": missing,
        "blockers": blockers,
        "integrity": integrity,
        "adsense_lock": integrity.get("publisher_lock"),
        "doctor": integrity.get("doctor"),
        "checked_at": now_iso(),
    }
    save_json(output / "deployment_gate_report.json", result)
    write_runtime_log(summary="deployment gate completed",files="factory/deployment_gate.py",tests="deployment gate execution",status="IMPLEMENTED" if not blockers else "FAILED",blocker=','.join(blockers))
    return result

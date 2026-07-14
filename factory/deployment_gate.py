from __future__ import annotations
from pathlib import Path
import json
from .utils import now_iso
from .adsense_manager import run_adsense_lock

def evaluate_deployment_gate(project_root: Path) -> dict:
    identity_path=project_root/"factory"/"config"/"adsense_identity.json"
    adsense_lock=run_adsense_lock(project_root,execute_repair=False,block_on_error=False) if identity_path.exists() else {"pass":True,"status":"not_configured_for_fixture"}
    output = project_root/"factory"/"output"
    required_files = {
        "qa": output/"qa_report.json",
        "research": output/"research"/"research_qa.json",
        "approval": output/"approval_request.json",
        "image": output/"image_manifest.json",
    }
    loaded = {}
    missing = []
    for name, path in required_files.items():
        if path.exists():
            loaded[name] = json.loads(path.read_text(encoding="utf-8"))
        else:
            missing.append(name)

    checks = {
        "required_reports_present": not missing,
        "qa_pass": bool(loaded.get("qa",{}).get("pass")),
        "research_pass": bool(loaded.get("research",{}).get("pass")),
        "user_approved": loaded.get("approval",{}).get("status") == "approved",
        "image_ready": bool(loaded.get("image",{}).get("ready")),
        "adsense_lock_pass": bool(adsense_lock.get("pass")),
    }
    blockers = [name for name, passed in checks.items() if not passed]
    return {
        "pass":not blockers,
        "checks":checks,
        "missing_reports":missing,
        "blockers":blockers,
        "adsense_lock":adsense_lock,
        "checked_at":now_iso(),
    }

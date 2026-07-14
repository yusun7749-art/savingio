from __future__ import annotations
from pathlib import Path
import json
from .utils import now_iso

def evaluate_deployment_gate(project_root: Path) -> dict:
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
    }
    blockers = [name for name, passed in checks.items() if not passed]
    return {
        "pass":not blockers,
        "checks":checks,
        "missing_reports":missing,
        "blockers":blockers,
        "checked_at":now_iso(),
    }

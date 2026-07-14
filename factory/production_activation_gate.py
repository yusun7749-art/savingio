from __future__ import annotations
from pathlib import Path
import json
from .credential_onboarding import build_credential_checklist, validate_service_account_json
from .connector_verification_receipt import verify_history
from .utils import save_json, now_iso

def _read(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}

def evaluate_production_activation(project_root: Path) -> dict:
    credentials = build_credential_checklist(project_root)
    verification = _read(project_root/"factory"/"output"/"connector_verification_report.json")
    production = _read(project_root/"factory"/"output"/"production_readiness_board.json")
    history = verify_history(project_root)
    service_account = validate_service_account_json()

    checks = {
        "required_credentials_configured": not credentials["missing_required"],
        "connector_verification_report_present": bool(verification),
        "connector_verification_all_passed": (
            verification.get("passed_count") == verification.get("total_count")
            and verification.get("total_count",0) > 0
        ),
        "production_readiness_present": bool(production),
        "verification_history_integrity": history["pass"],
        "google_service_account_valid": service_account.get("valid") is True,
    }
    blockers = [name for name,passed in checks.items() if not passed]
    result = {
        "pass": not blockers,
        "checks": checks,
        "blockers": blockers,
        "credential_summary": credentials,
        "verification_history": history,
        "service_account": service_account,
        "created_at": now_iso(),
    }
    save_json(project_root/"factory"/"output"/"production_activation_gate.json", result)
    return result

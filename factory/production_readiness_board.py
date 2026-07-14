from __future__ import annotations
from pathlib import Path
import json
from .integration_preflight import run_integration_preflight
from .end_to_end_audit import run_end_to_end_audit
from .master_checklist import build_master_checklist
from .utils import save_json, now_iso

def _read(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}

def build_production_readiness_board(project_root: Path) -> dict:
    integrations=run_integration_preflight(project_root)
    e2e=run_end_to_end_audit(project_root)
    checklist=build_master_checklist(project_root)
    adsense=_read(project_root/"factory"/"output"/"adsense_summary.json")
    final_release=_read(project_root/"factory"/"output"/"final_release_report.json")

    checks={
        "factory_modules_complete":checklist["completed_count"]==checklist["total_count"],
        "end_to_end_audit_pass":e2e["pass"],
        "final_release_report_present":bool(final_release),
        "git_repository_ready":integrations["git_repository_ready"],
        "all_external_integrations_ready":integrations["all_required_integrations_ready"],
        "adsense_audit_present":bool(adsense),
        "adsense_ready_to_apply":adsense.get("ready_to_apply") is True,
    }
    blockers=[name for name,passed in checks.items() if not passed]
    result={
        "pass":not blockers,
        "checks":checks,
        "blockers":blockers,
        "integration_ready_count":integrations["ready_count"],
        "integration_total_count":integrations["total_count"],
        "checklist":checklist,
        "adsense":adsense,
        "created_at":now_iso(),
    }
    save_json(project_root/"factory"/"output"/"production_readiness_board.json",result)
    return result

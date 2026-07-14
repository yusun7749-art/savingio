from __future__ import annotations
from pathlib import Path
import json
from .utils import save_json, now_iso

SOURCES = {
    "integration_preflight": "factory/output/integration_preflight.json",
    "production_readiness": "factory/output/production_readiness_board.json",
    "final_release": "factory/output/final_release_report.json",
    "approved_republish": "factory/output/approved_republish_report.json",
    "cloudflare_monitor": "factory/output/cloudflare_monitor_report.json",
    "analytics_daily": "factory/output/analytics/daily_run.json",
    "revenue_core": "factory/output/revenue/core_run.json",
    "doctor": "factory/output/doctor_report.json",
}

def _read(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}

def build_operations_snapshot(project_root: Path) -> dict:
    source_payloads = {name: _read(project_root/rel) for name, rel in SOURCES.items()}
    status_rows = []
    for name, payload in source_payloads.items():
        raw_status = str(payload.get("status") or "").lower()
        passed = payload.get("pass")
        if passed is True or raw_status in {"ok","success","completed","dry_run"}:
            state = "healthy"
        elif not payload:
            state = "missing"
        elif raw_status in {"blocked","failed","failure","error","timeout","failed_verification"} or passed is False:
            state = "attention"
        else:
            state = "unknown"
        status_rows.append({"source":name,"state":state,"status":raw_status or None})

    snapshot = {
        "healthy_count": sum(1 for row in status_rows if row["state"]=="healthy"),
        "attention_count": sum(1 for row in status_rows if row["state"]=="attention"),
        "missing_count": sum(1 for row in status_rows if row["state"]=="missing"),
        "unknown_count": sum(1 for row in status_rows if row["state"]=="unknown"),
        "sources": status_rows,
        "overall_status": (
            "attention" if any(row["state"]=="attention" for row in status_rows)
            else "ready" if all(row["state"] in {"healthy","missing"} for row in status_rows)
            else "review"
        ),
        "created_at": now_iso(),
    }
    save_json(project_root/"factory"/"output"/"operations_snapshot.json", snapshot)
    return snapshot

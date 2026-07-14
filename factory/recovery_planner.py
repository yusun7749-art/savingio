from __future__ import annotations
from pathlib import Path
import json
from .utils import save_json, now_iso

RECOVERY = {
    "approved_republish": [
        "Check approval_request status",
        "Check revenue CMS rework QA result",
        "Run approved-release-gate",
        "Retry approved-republish in dry-run mode",
    ],
    "final_release": [
        "Run doctor",
        "Run full unit-test suite",
        "Run master-checklist",
        "Run final-release again",
    ],
    "cloudflare_monitor": [
        "Check Cloudflare credentials",
        "Read latest deployment",
        "Verify new deployment ID",
        "Run public site health check",
    ],
    "analytics_daily": [
        "Run integration-preflight",
        "Verify Search Console and GA4 configuration",
        "Run analytics-daily without external execution",
    ],
    "revenue_core": [
        "Validate AdSense report file",
        "Run adsense-report-import",
        "Run adsense-revenue-bridge",
        "Run revenue-core",
    ],
    "integration_preflight": ["Run integration-preflight"],
    "production_readiness": ["Run production-readiness"],
}

def build_recovery_plan(project_root: Path, incidents_path: Path | None = None) -> dict:
    path = incidents_path or project_root/"factory"/"output"/"incidents.json"
    incidents = json.loads(path.read_text(encoding="utf-8"))
    plans = []
    for incident in incidents.get("incidents",[]):
        plans.append({
            "incident_id": incident["incident_id"],
            "source": incident["source"],
            "severity": incident["severity"],
            "steps": RECOVERY.get(incident["source"],["Inspect report","Resolve blocker","Re-run validation"]),
            "automatic_execution": False,
        })
    result = {
        "plan_count": len(plans),
        "plans": plans,
        "created_at": now_iso(),
    }
    save_json(project_root/"factory"/"output"/"recovery_plan.json", result)
    return result

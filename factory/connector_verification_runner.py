from __future__ import annotations
from pathlib import Path
import os
from .integration_preflight import run_integration_preflight
from .search_console_api import fetch_search_analytics
from .ga4_api import fetch_ga4_report
from .cloudflare_deploy_verify import verify_latest_deployment
from .wordpress_publisher import publish_to_wordpress
from .utils import save_json, now_iso

def run_connector_verification(project_root: Path, execute: bool=False) -> dict:
    preflight = run_integration_preflight(project_root)
    results = {}

    results["search_console"] = fetch_search_analytics(project_root, execute=execute)
    results["ga4"] = fetch_ga4_report(project_root, execute=execute)
    results["cloudflare"] = verify_latest_deployment(project_root, execute=execute)
    results["wordpress"] = publish_to_wordpress(project_root, status="draft", execute=execute)
    results["image_provider"] = {
        "status":"ready" if os.getenv("OPENAI_API_KEY") else "blocked",
        "ready":bool(os.getenv("OPENAI_API_KEY")),
        "provider":"openai",
        "required_env":["OPENAI_API_KEY"],
    }

    statuses = []
    for name, payload in results.items():
        status = payload.get("status")
        if status is None:
            status = "ready" if payload.get("ready") else "blocked"
        statuses.append({"name":name,"status":status})

    success_states = {"ok","success","completed","dry_run","ready"}
    result = {
        "execute": execute,
        "preflight": preflight,
        "results": results,
        "statuses": statuses,
        "passed_count": sum(1 for row in statuses if row["status"] in success_states),
        "total_count": len(statuses),
        "created_at": now_iso(),
    }
    save_json(project_root/"factory"/"output"/"connector_verification_report.json", result)
    return result

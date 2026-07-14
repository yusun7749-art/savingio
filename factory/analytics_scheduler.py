from __future__ import annotations
from pathlib import Path
import json, time
from .search_console_api import fetch_search_analytics
from .ga4_api import fetch_ga4_report
from .analytics_dashboard import build_analytics_dashboard
from .content_performance_optimizer import recommend_from_dashboard
from .utils import save_json, now_iso

def run_daily_analytics(project_root: Path, execute_external: bool = False) -> dict:
    started = time.time()
    search_console = fetch_search_analytics(project_root, execute=execute_external)
    ga4 = fetch_ga4_report(project_root, execute=execute_external)
    dashboard = build_analytics_dashboard(project_root)
    optimizer = recommend_from_dashboard(project_root)
    result = {
        "status":"completed",
        "external_execute":execute_external,
        "search_console":search_console,
        "ga4":ga4,
        "dashboard_summary":dashboard.get("summary",{}),
        "optimization_action_count":optimizer.get("action_count",0),
        "elapsed_seconds":round(time.time()-started,3),
        "created_at":now_iso(),
    }
    save_json(project_root/"factory"/"output"/"analytics"/"daily_run.json",result)
    return result

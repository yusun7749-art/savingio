from __future__ import annotations
from pathlib import Path
from .revenue_import import import_revenue
from .revenue_dashboard import build_revenue_dashboard
from .revenue_ai import analyze_revenue
from .revenue_task_router import route_revenue_actions
from .utils import save_json, now_iso

def run_revenue_core(
    project_root: Path,
    input_path: Path | None = None,
    *,
    route_tasks: bool = False,
) -> dict:
    imported = import_revenue(project_root, input_path) if input_path else None
    dashboard = build_revenue_dashboard(project_root)
    analysis = analyze_revenue(project_root)
    routing = route_revenue_actions(project_root) if route_tasks else None
    result = {
        "status":"completed",
        "imported":imported,
        "dashboard_totals":dashboard["totals"],
        "analysis_summary":analysis["summary"],
        "routed":routing,
        "created_at":now_iso(),
    }
    save_json(project_root/"factory"/"output"/"revenue"/"core_run.json", result)
    return result

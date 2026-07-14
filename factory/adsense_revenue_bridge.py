from __future__ import annotations
from pathlib import Path
import json
from .utils import save_json, now_iso
from .revenue_dashboard import build_revenue_dashboard
from .revenue_ai import analyze_revenue

def bridge_adsense_to_revenue(project_root: Path) -> dict:
    source=project_root/"factory"/"output"/"revenue"/"adsense_report.json"
    if not source.exists():
        raise FileNotFoundError(source)
    payload=json.loads(source.read_text(encoding="utf-8"))
    revenue_data={
        "source":"adsense_report",
        "row_count":payload.get("row_count",0),
        "rows":payload.get("rows",[]),
        "totals":payload.get("totals",{}),
        "created_at":now_iso(),
    }
    save_json(project_root/"factory"/"output"/"revenue"/"revenue_data.json",revenue_data)
    dashboard=build_revenue_dashboard(project_root)
    analysis=analyze_revenue(project_root)
    result={
        "status":"completed",
        "revenue_rows":revenue_data["row_count"],
        "dashboard_totals":dashboard.get("totals",{}),
        "analysis_summary":analysis.get("summary",{}),
        "created_at":now_iso(),
    }
    save_json(project_root/"factory"/"output"/"revenue"/"adsense_bridge_report.json",result)
    return result

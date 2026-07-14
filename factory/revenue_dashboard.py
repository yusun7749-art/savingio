from __future__ import annotations
from pathlib import Path
from collections import defaultdict
import json
from .utils import save_json, now_iso

def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}

def build_revenue_dashboard(project_root: Path) -> dict:
    analytics = _load(project_root/"factory"/"output"/"analytics"/"dashboard.json")
    revenue = _load(project_root/"factory"/"output"/"revenue"/"revenue_data.json")
    pages = defaultdict(lambda: {
        "clicks":0.0, "impressions":0.0, "page_views":0.0, "sessions":0.0,
        "earnings":0.0, "ad_impressions":0.0, "ad_clicks":0.0
    })

    for row in analytics.get("pages", []):
        page = row.get("page", "/") or "/"
        pages[page]["clicks"] += float(row.get("clicks", 0))
        pages[page]["impressions"] += float(row.get("impressions", 0))
        pages[page]["page_views"] += float(row.get("page_views", 0))
        pages[page]["sessions"] += float(row.get("sessions", 0))

    for row in revenue.get("rows", []):
        page = row.get("page", "/") or "/"
        pages[page]["earnings"] += float(row.get("earnings", 0))
        pages[page]["ad_impressions"] += float(row.get("ad_impressions", 0))
        pages[page]["ad_clicks"] += float(row.get("ad_clicks", 0))
        if not pages[page]["page_views"]:
            pages[page]["page_views"] += float(row.get("page_views", 0))

    result_pages = []
    for page, values in pages.items():
        item = {"page": page, **{k: round(v, 4) for k, v in values.items()}}
        item["search_ctr"] = round(item["clicks"] / item["impressions"], 4) if item["impressions"] else 0.0
        item["ad_ctr"] = round(item["ad_clicks"] / item["ad_impressions"], 4) if item["ad_impressions"] else 0.0
        item["page_rpm"] = round(item["earnings"] / item["page_views"] * 1000, 4) if item["page_views"] else 0.0
        item["cpc"] = round(item["earnings"] / item["ad_clicks"], 4) if item["ad_clicks"] else 0.0
        result_pages.append(item)

    result_pages.sort(key=lambda x: (-x["earnings"], -x["page_rpm"], x["page"]))
    totals = {
        "earnings": round(sum(x["earnings"] for x in result_pages), 4),
        "page_views": round(sum(x["page_views"] for x in result_pages), 2),
        "ad_impressions": round(sum(x["ad_impressions"] for x in result_pages), 2),
        "ad_clicks": round(sum(x["ad_clicks"] for x in result_pages), 2),
        "search_impressions": round(sum(x["impressions"] for x in result_pages), 2),
        "search_clicks": round(sum(x["clicks"] for x in result_pages), 2),
    }
    totals["page_rpm"] = round(totals["earnings"] / totals["page_views"] * 1000, 4) if totals["page_views"] else 0.0
    totals["ad_ctr"] = round(totals["ad_clicks"] / totals["ad_impressions"], 4) if totals["ad_impressions"] else 0.0

    dashboard = {
        "analytics_loaded": bool(analytics),
        "revenue_loaded": bool(revenue),
        "page_count": len(result_pages),
        "pages": result_pages,
        "totals": totals,
        "created_at": now_iso(),
    }
    save_json(project_root/"factory"/"output"/"revenue"/"dashboard.json", dashboard)
    return dashboard

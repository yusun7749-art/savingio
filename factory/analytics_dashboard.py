from __future__ import annotations
from pathlib import Path
import json
from collections import defaultdict
from .utils import save_json, now_iso

def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}

def build_analytics_dashboard(project_root: Path) -> dict:
    base = project_root/"factory"/"output"/"analytics"
    sc = _load(base/"search_console.json")
    ga = _load(base/"ga4.json")
    page_stats = defaultdict(lambda:{
        "clicks":0.0,"impressions":0.0,"page_views":0.0,"active_users":0.0,"sessions":0.0
    })
    for row in sc.get("rows",[]):
        page=row.get("page","")
        page_stats[page]["clicks"] += float(row.get("clicks",0))
        page_stats[page]["impressions"] += float(row.get("impressions",0))
    for row in ga.get("rows",[]):
        page=row.get("pagePath") or row.get("pageLocation") or ""
        page_stats[page]["page_views"] += float(row.get("screenPageViews",0) or 0)
        page_stats[page]["active_users"] += float(row.get("activeUsers",0) or 0)
        page_stats[page]["sessions"] += float(row.get("sessions",0) or 0)
    pages=[]
    for page,stats in page_stats.items():
        stats={k:round(v,2) for k,v in stats.items()}
        stats["ctr"]=round(stats["clicks"]/stats["impressions"],4) if stats["impressions"] else 0
        pages.append({"page":page,**stats})
    pages.sort(key=lambda x:(-x["clicks"],-x["page_views"],x["page"]))
    dashboard={
        "search_console_loaded":bool(sc),
        "ga4_loaded":bool(ga),
        "page_count":len(pages),
        "pages":pages,
        "summary":{
            "clicks":round(sum(x["clicks"] for x in pages),2),
            "impressions":round(sum(x["impressions"] for x in pages),2),
            "page_views":round(sum(x["page_views"] for x in pages),2),
            "active_users":round(sum(x["active_users"] for x in pages),2),
            "sessions":round(sum(x["sessions"] for x in pages),2),
        },
        "created_at":now_iso(),
    }
    save_json(base/"dashboard.json",dashboard)
    return dashboard

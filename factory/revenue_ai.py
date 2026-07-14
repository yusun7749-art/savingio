from __future__ import annotations
from pathlib import Path
import json
from .utils import load_json, save_json, now_iso

def _priority(base: int, magnitude: float) -> int:
    return min(100, max(1, round(base + magnitude)))

def analyze_revenue(project_root: Path, dashboard_path: Path | None = None) -> dict:
    rules_path = project_root/"factory"/"config"/"revenue_ai_rules.json"
    rules = load_json(rules_path) if rules_path.exists() else {
        "min_search_impressions":100,
        "low_search_ctr":0.02,
        "min_page_views":50,
        "low_page_rpm":1.0,
        "min_ad_impressions":100,
        "low_ad_ctr":0.003,
    }
    path = dashboard_path or project_root/"factory"/"output"/"revenue"/"dashboard.json"
    dashboard = json.loads(path.read_text(encoding="utf-8"))
    actions = []

    for row in dashboard.get("pages", []):
        page = row["page"]
        search_impressions = row.get("impressions", 0)
        search_ctr = row.get("search_ctr", 0)
        page_views = row.get("page_views", 0)
        page_rpm = row.get("page_rpm", 0)
        ad_impressions = row.get("ad_impressions", 0)
        ad_ctr = row.get("ad_ctr", 0)
        earnings = row.get("earnings", 0)

        if search_impressions >= rules["min_search_impressions"] and search_ctr < rules["low_search_ctr"]:
            actions.append({
                "page": page,
                "department": "seo",
                "action": "rewrite_title_meta",
                "priority": _priority(75, min(20, search_impressions / 1000)),
                "reason": "high_search_impressions_low_ctr",
                "metrics": {"impressions":search_impressions,"search_ctr":search_ctr},
            })

        if page_views >= rules["min_page_views"] and page_rpm < rules["low_page_rpm"]:
            actions.append({
                "page": page,
                "department": "revenue",
                "action": "review_ad_layout_and_intent",
                "priority": _priority(65, min(20, page_views / 500)),
                "reason": "traffic_with_low_page_rpm",
                "metrics": {"page_views":page_views,"page_rpm":page_rpm},
            })

        if ad_impressions >= rules["min_ad_impressions"] and ad_ctr < rules["low_ad_ctr"]:
            actions.append({
                "page": page,
                "department": "revenue",
                "action": "review_ad_visibility",
                "priority": _priority(60, min(20, ad_impressions / 1000)),
                "reason": "high_ad_impressions_low_ad_ctr",
                "metrics": {"ad_impressions":ad_impressions,"ad_ctr":ad_ctr},
            })

        if page_views >= rules["min_page_views"] and earnings == 0:
            actions.append({
                "page": page,
                "department": "revenue",
                "action": "check_adsense_coverage",
                "priority": 90,
                "reason": "traffic_without_revenue",
                "metrics": {"page_views":page_views,"earnings":earnings},
            })

    actions.sort(key=lambda x: (-x["priority"], x["page"], x["action"]))
    result = {
        "status":"completed",
        "action_count":len(actions),
        "actions":actions,
        "summary":{
            "seo_actions":sum(1 for x in actions if x["department"]=="seo"),
            "revenue_actions":sum(1 for x in actions if x["department"]=="revenue"),
            "critical_actions":sum(1 for x in actions if x["priority"]>=90),
        },
        "created_at":now_iso(),
    }
    save_json(project_root/"factory"/"output"/"revenue"/"revenue_ai_actions.json", result)
    return result

from __future__ import annotations
from pathlib import Path
import json
from .utils import save_json, now_iso

def recommend_from_dashboard(project_root: Path, dashboard_path: Path | None = None) -> dict:
    path = dashboard_path or project_root/"factory"/"output"/"analytics"/"dashboard.json"
    dashboard = json.loads(path.read_text(encoding="utf-8"))
    actions=[]
    for row in dashboard.get("pages",[]):
        impressions=row.get("impressions",0)
        ctr=row.get("ctr",0)
        clicks=row.get("clicks",0)
        views=row.get("page_views",0)
        if impressions >= 100 and ctr < 0.02:
            actions.append({
                "page":row["page"],"priority":90,"action":"rewrite_title_meta",
                "reason":f"high_impressions_low_ctr:{impressions}/{ctr}"
            })
        if views >= 50 and clicks == 0 and impressions == 0:
            actions.append({
                "page":row["page"],"priority":70,"action":"improve_indexability_internal_links",
                "reason":"traffic_without_search_visibility"
            })
        if clicks >= 10 and views < clicks:
            actions.append({
                "page":row["page"],"priority":60,"action":"check_analytics_tracking",
                "reason":"clicks_exceed_pageviews"
            })
    actions.sort(key=lambda x:(-x["priority"],x["page"]))
    result={"action_count":len(actions),"actions":actions,"created_at":now_iso()}
    save_json(project_root/"factory"/"output"/"analytics"/"optimization_actions.json",result)
    return result

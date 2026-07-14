from __future__ import annotations
from pathlib import Path
import json
from collections import defaultdict
from .utils import save_json, now_iso

def build_keyword_rank_report(project_root: Path, search_console_path: Path | None = None) -> dict:
    path = search_console_path or project_root/"factory"/"output"/"analytics"/"search_console.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    grouped = defaultdict(list)
    for row in payload.get("rows",[]):
        query = row.get("query","").strip()
        if query:
            grouped[query].append(row)
    keywords = []
    for query, rows in grouped.items():
        total_impressions = sum(float(x.get("impressions",0)) for x in rows)
        weighted_position = (
            sum(float(x.get("position",0))*float(x.get("impressions",0)) for x in rows) / total_impressions
            if total_impressions else 0
        )
        keywords.append({
            "query":query,
            "clicks":round(sum(float(x.get("clicks",0)) for x in rows),2),
            "impressions":round(total_impressions,2),
            "position":round(weighted_position,2),
            "pages":sorted({x.get("page","") for x in rows if x.get("page")}),
        })
    keywords.sort(key=lambda x:(x["position"] if x["position"] else 999,-x["impressions"],x["query"]))
    report = {"keyword_count":len(keywords),"keywords":keywords,"created_at":now_iso()}
    save_json(project_root/"factory"/"output"/"analytics"/"keyword_rankings.json",report)
    return report

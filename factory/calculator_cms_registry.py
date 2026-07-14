from __future__ import annotations
from pathlib import Path
import json
from .utils import save_json, now_iso

def register_article_calculators(project_root: Path, package: dict) -> dict:
    path=project_root/"factory"/"output"/"calculator"/"article_calculator_links.json"
    rows=[]
    if path.exists():
        payload=json.loads(path.read_text(encoding="utf-8"))
        rows=payload if isinstance(payload,list) else payload.get("items",[])
    rows=[row for row in rows if row.get("article_slug")!=package["slug"]]
    rows.append({
        "article_slug":package["slug"],
        "article_url":package["article_url"],
        "calculator_ids":[item["calculator_id"] for item in package.get("calculators",[])],
        "calculator_urls":[item["url"] for item in package.get("calculators",[])],
        "status":package["status"],
        "updated_at":now_iso(),
    })
    save_json(path,rows)
    return {"registered":True,"link_count":len(rows[-1]["calculator_ids"]),"path":path.relative_to(project_root).as_posix()}

from __future__ import annotations
from pathlib import Path
from datetime import date, timedelta
import json, os
from .google_service_auth import service_readiness
from .utils import save_json, now_iso

def build_query_request(
    start_date: str,
    end_date: str,
    dimensions: list[str] | None = None,
    row_limit: int = 25000,
    start_row: int = 0,
) -> dict:
    return {
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": dimensions or ["date","page","query"],
        "rowLimit": int(row_limit),
        "startRow": int(start_row),
        "dataState": "final",
    }

def default_date_range(days: int = 28) -> tuple[str, str]:
    end = date.today() - timedelta(days=2)
    start = end - timedelta(days=max(1, days)-1)
    return start.isoformat(), end.isoformat()

def import_search_console_export(project_root: Path, input_path: Path) -> dict:
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    rows = payload.get("rows", payload if isinstance(payload, list) else [])
    if not isinstance(rows, list):
        raise ValueError("Search Console export must be a list or contain rows.")
    normalized = []
    for row in rows:
        keys = row.get("keys", [])
        normalized.append({
            "date": keys[0] if len(keys)>0 else row.get("date",""),
            "page": keys[1] if len(keys)>1 else row.get("page",""),
            "query": keys[2] if len(keys)>2 else row.get("query",""),
            "clicks": float(row.get("clicks",0)),
            "impressions": float(row.get("impressions",0)),
            "ctr": float(row.get("ctr",0)),
            "position": float(row.get("position",0)),
        })
    result = {
        "row_count": len(normalized),
        "rows": normalized,
        "totals": {
            "clicks": round(sum(x["clicks"] for x in normalized), 2),
            "impressions": round(sum(x["impressions"] for x in normalized), 2),
        },
        "created_at": now_iso(),
    }
    save_json(project_root/"factory"/"output"/"analytics"/"search_console.json", result)
    return result

def api_readiness() -> dict:
    readiness = service_readiness("search_console")
    start, end = default_date_range()
    return {
        "readiness": readiness,
        "site_url": os.getenv("SEARCH_CONSOLE_SITE_URL",""),
        "sample_request": build_query_request(start,end),
    }

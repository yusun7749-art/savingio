from __future__ import annotations
from pathlib import Path
from urllib.parse import urlparse
import csv, json, re
from .utils import save_json, now_iso

ALIASES = {
    "date": ["date","day","날짜"],
    "page": ["page","url","page_url","페이지","페이지 url"],
    "earnings": ["estimated earnings","estimated_earnings","earnings","예상 수입","수입"],
    "page_views": ["page views","page_views","페이지뷰"],
    "impressions": ["impressions","ad impressions","ad_impressions","노출수","광고 노출수"],
    "clicks": ["clicks","ad clicks","ad_clicks","클릭수","광고 클릭수"],
}

def _keymap(row: dict) -> dict:
    return {str(k).strip().lower(): v for k,v in row.items()}

def _pick(row: dict, field: str):
    mapped = _keymap(row)
    for alias in ALIASES[field]:
        if alias.lower() in mapped:
            return mapped[alias.lower()]
    return ""

def _number(value) -> float:
    text = str(value or "").strip()
    text = re.sub(r"[^0-9.\-]", "", text.replace(",", ""))
    try:
        return float(text)
    except ValueError:
        return 0.0

def _page(value: str) -> str:
    value = str(value or "").strip()
    if value.startswith(("http://","https://")):
        parsed = urlparse(value)
        return parsed.path or "/"
    return value or "/"

def read_adsense_report(path: Path) -> list[dict]:
    if path.suffix.lower()==".json":
        payload=json.loads(path.read_text(encoding="utf-8"))
        rows=payload.get("rows",payload if isinstance(payload,list) else [])
    elif path.suffix.lower()==".csv":
        with path.open("r",encoding="utf-8-sig",newline="") as handle:
            rows=list(csv.DictReader(handle))
    else:
        raise ValueError("AdSense report must be CSV or JSON.")
    if not isinstance(rows,list):
        raise ValueError("AdSense report rows are missing.")
    return rows

def normalize_adsense_rows(rows: list[dict]) -> list[dict]:
    normalized=[]
    for row in rows:
        earnings=_number(_pick(row,"earnings"))
        views=_number(_pick(row,"page_views"))
        impressions=_number(_pick(row,"impressions"))
        clicks=_number(_pick(row,"clicks"))
        normalized.append({
            "date":str(_pick(row,"date")).strip(),
            "page":_page(_pick(row,"page")),
            "earnings":round(earnings,4),
            "page_views":round(views,2),
            "ad_impressions":round(impressions,2),
            "ad_clicks":round(clicks,2),
            "page_rpm":round(earnings/views*1000,4) if views else 0.0,
            "ad_ctr":round(clicks/impressions,4) if impressions else 0.0,
            "cpc":round(earnings/clicks,4) if clicks else 0.0,
        })
    return normalized

def import_adsense_report(project_root: Path, input_path: Path) -> dict:
    rows=normalize_adsense_rows(read_adsense_report(input_path))
    result={
        "source":str(input_path),
        "row_count":len(rows),
        "rows":rows,
        "totals":{
            "earnings":round(sum(x["earnings"] for x in rows),4),
            "page_views":round(sum(x["page_views"] for x in rows),2),
            "ad_impressions":round(sum(x["ad_impressions"] for x in rows),2),
            "ad_clicks":round(sum(x["ad_clicks"] for x in rows),2),
        },
        "created_at":now_iso(),
    }
    totals=result["totals"]
    totals["page_rpm"]=round(totals["earnings"]/totals["page_views"]*1000,4) if totals["page_views"] else 0.0
    totals["ad_ctr"]=round(totals["ad_clicks"]/totals["ad_impressions"],4) if totals["ad_impressions"] else 0.0
    save_json(project_root/"factory"/"output"/"revenue"/"adsense_report.json",result)
    return result

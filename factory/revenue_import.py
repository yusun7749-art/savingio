from __future__ import annotations
from pathlib import Path
import csv, json
from urllib.parse import urlparse
from .utils import save_json, now_iso

ALIASES = {
    "page": ["page", "url", "page_url", "페이지", "페이지 URL"],
    "date": ["date", "날짜"],
    "earnings": ["earnings", "estimated_earnings", "estimated earnings", "수입", "예상 수입"],
    "impressions": ["ad_impressions", "impressions", "광고 노출수", "노출수"],
    "clicks": ["ad_clicks", "clicks", "클릭수", "광고 클릭수"],
    "page_views": ["page_views", "page views", "페이지뷰"],
}

def _pick(row: dict, field: str, default=""):
    normalized = {str(k).strip().lower(): v for k, v in row.items()}
    for alias in ALIASES[field]:
        key = alias.lower()
        if key in normalized:
            return normalized[key]
    return default

def _number(value) -> float:
    if value is None or value == "":
        return 0.0
    text = str(value).strip().replace(",", "").replace("₩", "").replace("$", "")
    try:
        return float(text)
    except ValueError:
        return 0.0

def _normalize_page(value: str) -> str:
    value = str(value or "").strip()
    if value.startswith(("http://", "https://")):
        parsed = urlparse(value)
        return parsed.path or "/"
    return value or "/"

def normalize_revenue_rows(rows: list[dict]) -> list[dict]:
    normalized = []
    for row in rows:
        page = _normalize_page(_pick(row, "page"))
        impressions = _number(_pick(row, "impressions"))
        clicks = _number(_pick(row, "clicks"))
        earnings = _number(_pick(row, "earnings"))
        page_views = _number(_pick(row, "page_views"))
        normalized.append({
            "date": str(_pick(row, "date")).strip(),
            "page": page,
            "earnings": round(earnings, 4),
            "ad_impressions": round(impressions, 2),
            "ad_clicks": round(clicks, 2),
            "page_views": round(page_views, 2),
            "ad_ctr": round(clicks / impressions, 4) if impressions else 0.0,
            "page_rpm": round(earnings / page_views * 1000, 4) if page_views else 0.0,
            "impression_rpm": round(earnings / impressions * 1000, 4) if impressions else 0.0,
            "cpc": round(earnings / clicks, 4) if clicks else 0.0,
        })
    return normalized

def load_revenue_file(path: Path) -> list[dict]:
    suffix = path.suffix.lower()
    if suffix == ".json":
        payload = json.loads(path.read_text(encoding="utf-8"))
        rows = payload.get("rows", payload if isinstance(payload, list) else [])
    elif suffix == ".csv":
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.DictReader(handle))
    else:
        raise ValueError("지원 형식은 JSON 또는 CSV입니다.")
    if not isinstance(rows, list):
        raise ValueError("수익 데이터에 rows 배열이 없습니다.")
    return normalize_revenue_rows(rows)

def import_revenue(project_root: Path, input_path: Path) -> dict:
    rows = load_revenue_file(input_path)
    result = {
        "source": str(input_path),
        "row_count": len(rows),
        "rows": rows,
        "totals": {
            "earnings": round(sum(x["earnings"] for x in rows), 4),
            "ad_impressions": round(sum(x["ad_impressions"] for x in rows), 2),
            "ad_clicks": round(sum(x["ad_clicks"] for x in rows), 2),
            "page_views": round(sum(x["page_views"] for x in rows), 2),
        },
        "created_at": now_iso(),
    }
    totals = result["totals"]
    totals["ad_ctr"] = round(totals["ad_clicks"] / totals["ad_impressions"], 4) if totals["ad_impressions"] else 0.0
    totals["page_rpm"] = round(totals["earnings"] / totals["page_views"] * 1000, 4) if totals["page_views"] else 0.0
    save_json(project_root / "factory" / "output" / "revenue" / "revenue_data.json", result)
    return result

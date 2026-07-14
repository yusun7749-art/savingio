from __future__ import annotations
from pathlib import Path
import json, os
from .google_service_auth import service_readiness
from .utils import save_json, now_iso

def build_run_report_request(
    start_date: str = "28daysAgo",
    end_date: str = "yesterday",
    dimensions: list[str] | None = None,
    metrics: list[str] | None = None,
) -> dict:
    return {
        "dateRanges": [{"startDate":start_date,"endDate":end_date}],
        "dimensions": [{"name":name} for name in (dimensions or ["date","pagePath"])],
        "metrics": [{"name":name} for name in (metrics or ["screenPageViews","activeUsers","sessions"])],
        "limit": "100000",
    }

def import_ga4_export(project_root: Path, input_path: Path) -> dict:
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    rows = payload.get("rows", [])
    dimension_headers = [x.get("name","") for x in payload.get("dimensionHeaders",[])]
    metric_headers = [x.get("name","") for x in payload.get("metricHeaders",[])]
    normalized = []
    for row in rows:
        dimensions = [x.get("value","") for x in row.get("dimensionValues",[])]
        metrics = [x.get("value","0") for x in row.get("metricValues",[])]
        item = {name:(dimensions[i] if i < len(dimensions) else "") for i,name in enumerate(dimension_headers)}
        for i,name in enumerate(metric_headers):
            value = metrics[i] if i < len(metrics) else "0"
            try:
                item[name] = float(value)
            except ValueError:
                item[name] = value
        normalized.append(item)
    totals = {}
    for name in metric_headers:
        totals[name] = round(sum(float(row.get(name,0) or 0) for row in normalized),2)
    result = {
        "row_count":len(normalized),
        "dimensions":dimension_headers,
        "metrics":metric_headers,
        "rows":normalized,
        "totals":totals,
        "created_at":now_iso(),
    }
    save_json(project_root/"factory"/"output"/"analytics"/"ga4.json",result)
    return result

def api_readiness() -> dict:
    return {
        "readiness":service_readiness("ga4"),
        "property_id":os.getenv("GA4_PROPERTY_ID",""),
        "sample_request":build_run_report_request(),
    }

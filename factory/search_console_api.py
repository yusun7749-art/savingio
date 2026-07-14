from __future__ import annotations
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from pathlib import Path
import json, os
from .search_console_engine import build_query_request, default_date_range
from .utils import save_json, now_iso
from .google_access_token import get_access_token

SEARCH_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"

def readiness() -> dict:
    required = ["SEARCH_CONSOLE_SITE_URL"]
    missing = [name for name in required if not os.getenv(name)]
    return {
        "ready": not missing,
        "missing_env": missing,
        "site_url": os.getenv("SEARCH_CONSOLE_SITE_URL",""),
        "scope": SEARCH_SCOPE,
        "created_at": now_iso(),
    }

def build_endpoint(site_url: str) -> str:
    return "https://www.googleapis.com/webmasters/v3/sites/" + quote(site_url, safe="") + "/searchAnalytics/query"

def fetch_search_analytics(
    project_root: Path,
    *,
    start_date: str | None = None,
    end_date: str | None = None,
    execute: bool = False,
) -> dict:
    state = readiness()
    if not state["ready"]:
        return {"status":"blocked","reason":"search_console_not_configured","readiness":state,"created_at":now_iso()}
    if not start_date or not end_date:
        start_date, end_date = default_date_range()
    payload = build_query_request(start_date,end_date)
    endpoint = build_endpoint(state["site_url"])
    if not execute:
        return {"status":"dry_run","endpoint":endpoint,"payload":payload,"created_at":now_iso()}

    token_result = get_access_token(SEARCH_SCOPE, execute=True)
    if token_result.get("status") != "ok":
        return {"status":"blocked","reason":"google_token_unavailable","token":token_result,"created_at":now_iso()}
    request = Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization":"Bearer " + token_result["access_token"],
            "Content-Type":"application/json",
            "Accept":"application/json",
            "User-Agent":"SavingioFactory/2.034",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8", errors="replace")
            data = json.loads(raw) if raw else {}
            save_json(project_root/"factory"/"output"/"analytics"/"search_console_api_raw.json",data)
            return {"status":"ok","payload":data,"created_at":now_iso()}
    except (HTTPError,URLError,TimeoutError) as exc:
        return {"status":"error","http_status":getattr(exc,"code",None),"error":str(exc),"created_at":now_iso()}

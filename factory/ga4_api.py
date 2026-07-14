from __future__ import annotations
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from pathlib import Path
import json, os
from .ga4_engine import build_run_report_request
from .utils import save_json, now_iso
from .google_access_token import get_access_token

GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly"

def readiness() -> dict:
    required = ["GA4_PROPERTY_ID"]
    missing = [name for name in required if not os.getenv(name)]
    return {
        "ready": not missing,
        "missing_env": missing,
        "property_id": os.getenv("GA4_PROPERTY_ID",""),
        "scope": GA4_SCOPE,
        "created_at": now_iso(),
    }

def fetch_ga4_report(project_root: Path, *, execute: bool = False) -> dict:
    state = readiness()
    if not state["ready"]:
        return {"status":"blocked","reason":"ga4_not_configured","readiness":state,"created_at":now_iso()}
    endpoint = f"https://analyticsdata.googleapis.com/v1beta/properties/{state['property_id']}:runReport"
    payload = build_run_report_request()
    if not execute:
        return {"status":"dry_run","endpoint":endpoint,"payload":payload,"created_at":now_iso()}
    token_result = get_access_token(GA4_SCOPE, execute=True)
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
            save_json(project_root/"factory"/"output"/"analytics"/"ga4_api_raw.json",data)
            return {"status":"ok","payload":data,"created_at":now_iso()}
    except (HTTPError,URLError,TimeoutError) as exc:
        return {"status":"error","http_status":getattr(exc,"code",None),"error":str(exc),"created_at":now_iso()}

from __future__ import annotations
from pathlib import Path
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import json, os, time
from .utils import now_iso

def build_request_url(base_url: str, params: dict) -> str:
    separator = "&" if "?" in base_url else "?"
    return base_url + separator + urlencode({k:v for k,v in params.items() if v is not None})

def call_openapi(
    base_url: str,
    params: dict,
    allowed_domains: list[str],
    api_key_env: str | None = None,
    api_key_param: str = "serviceKey",
    timeout: int = 20,
) -> dict:
    host = (urlparse(base_url).hostname or "").lower().removeprefix("www.")
    allowed = any(host == d.lower().removeprefix("www.") or host.endswith("." + d.lower().removeprefix("www.")) for d in allowed_domains)
    if not allowed:
        return {"status":"blocked_domain","url":base_url,"error":"domain_not_allowed","created_at":now_iso()}

    merged = dict(params)
    if api_key_env:
        key = os.getenv(api_key_env)
        if not key:
            return {
                "status":"missing_api_key",
                "url":base_url,
                "required_env":api_key_env,
                "error":"api_key_not_configured",
                "created_at":now_iso(),
            }
        merged[api_key_param] = key

    url = build_request_url(base_url, merged)
    started = time.perf_counter()
    try:
        req = Request(url, headers={"User-Agent":"SavingioFactory/2.028","Accept":"application/json,application/xml,text/plain"})
        with urlopen(req, timeout=timeout) as response:
            raw = response.read(3_000_000)
            content_type = response.headers.get_content_type()
            charset = response.headers.get_content_charset() or "utf-8"
            body = raw.decode(charset, errors="replace")
            payload = None
            if "json" in content_type or body.lstrip().startswith(("{","[")):
                try:
                    payload = json.loads(body)
                except json.JSONDecodeError:
                    payload = None
            return {
                "status":"ok",
                "url":url,
                "http_status":getattr(response,"status",200),
                "content_type":content_type,
                "payload":payload,
                "raw_text":body if payload is None else "",
                "elapsed_ms":round((time.perf_counter()-started)*1000),
                "created_at":now_iso(),
            }
    except (HTTPError, URLError, TimeoutError) as exc:
        return {
            "status":"error","url":url,"http_status":getattr(exc,"code",None),
            "error":str(exc),"elapsed_ms":round((time.perf_counter()-started)*1000),
            "created_at":now_iso(),
        }

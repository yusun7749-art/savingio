from __future__ import annotations
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from .utils import now_iso

def check_url(url: str, timeout: int = 20, expected_text: str | None = None) -> dict:
    req = Request(url, headers={"User-Agent":"SavingioFactory/2.032","Accept":"text/html,*/*"})
    try:
        with urlopen(req, timeout=timeout) as response:
            raw = response.read(1_000_000)
            charset = response.headers.get_content_charset() or "utf-8"
            text = raw.decode(charset, errors="replace")
            expected_ok = True if expected_text is None else expected_text in text
            return {
                "status":"ok" if expected_ok else "content_mismatch",
                "http_status":getattr(response,"status",200),
                "url":url,
                "expected_text_found":expected_ok,
                "bytes":len(raw),
                "checked_at":now_iso(),
            }
    except (HTTPError,URLError,TimeoutError) as exc:
        return {
            "status":"error","http_status":getattr(exc,"code",None),
            "url":url,"error":str(exc),"checked_at":now_iso()
        }

def check_site(base_url: str, paths: list[str] | None = None) -> dict:
    paths = paths or ["/","/articles/","/robots.txt","/sitemap.xml"]
    results = [check_url(urljoin(base_url.rstrip("/")+"/", path.lstrip("/"))) for path in paths]
    return {
        "base_url":base_url,
        "pass":all(x["status"]=="ok" for x in results),
        "results":results,
        "checked_at":now_iso(),
    }

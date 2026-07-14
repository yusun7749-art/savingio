from __future__ import annotations
from dataclasses import dataclass, asdict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
import json, re, time
from .utils import now_iso

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag.lower() in {"script","style","noscript","svg"}:
            self.skip_depth += 1

    def handle_endtag(self, tag):
        if tag.lower() in {"script","style","noscript","svg"} and self.skip_depth:
            self.skip_depth -= 1

    def handle_data(self, data):
        if not self.skip_depth:
            text = re.sub(r"\s+", " ", data).strip()
            if text:
                self.parts.append(text)

    def text(self):
        return " ".join(self.parts)

@dataclass
class FetchResult:
    url: str
    status: str
    http_status: int | None
    content_type: str
    title: str
    text: str
    error: str | None
    fetched_at: str
    elapsed_ms: int

    def to_dict(self):
        return asdict(self)

def _allowed(url: str, allowed_domains: list[str]) -> bool:
    host = (urlparse(url).hostname or "").lower().removeprefix("www.")
    for domain in allowed_domains:
        d = domain.lower().removeprefix("www.")
        if host == d or host.endswith("." + d):
            return True
    return False

def extract_html(html: str) -> tuple[str, str]:
    title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
    title = re.sub(r"<[^>]+>", "", title_match.group(1)).strip() if title_match else ""
    parser = TextExtractor()
    parser.feed(html)
    return title, parser.text()

def fetch_url(
    url: str,
    allowed_domains: list[str],
    timeout: int = 15,
    user_agent: str = "SavingioFactory/2.028 (+https://savingio.com)",
    max_bytes: int = 2_000_000,
) -> dict:
    if not _allowed(url, allowed_domains):
        return FetchResult(url, "blocked_domain", None, "", "", "", "domain_not_allowed", now_iso(), 0).to_dict()

    started = time.perf_counter()
    request = Request(url, headers={"User-Agent": user_agent, "Accept": "text/html,application/json;q=0.9,*/*;q=0.5"})
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read(max_bytes + 1)
            if len(raw) > max_bytes:
                raise ValueError("response_too_large")
            content_type = response.headers.get_content_type()
            charset = response.headers.get_content_charset() or "utf-8"
            text_raw = raw.decode(charset, errors="replace")
            title, text = extract_html(text_raw) if "html" in content_type else ("", text_raw)
            elapsed = round((time.perf_counter() - started) * 1000)
            return FetchResult(url, "ok", getattr(response, "status", 200), content_type, title, text, None, now_iso(), elapsed).to_dict()
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        elapsed = round((time.perf_counter() - started) * 1000)
        status = getattr(exc, "code", None)
        return FetchResult(url, "error", status, "", "", "", str(exc), now_iso(), elapsed).to_dict()

def fetch_many(urls: list[str], allowed_domains: list[str], timeout: int = 15) -> dict:
    results = [fetch_url(url, allowed_domains, timeout=timeout) for url in urls]
    return {
        "requested": len(urls),
        "succeeded": sum(1 for x in results if x["status"] == "ok"),
        "blocked": sum(1 for x in results if x["status"] == "blocked_domain"),
        "failed": sum(1 for x in results if x["status"] == "error"),
        "results": results,
        "created_at": now_iso(),
    }

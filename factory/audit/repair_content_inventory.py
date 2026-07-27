from __future__ import annotations

import html
import json
import re
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
ARTICLES = ROOT / "articles"
SITEMAP = ROOT / "sitemap.xml"
INDEX = ROOT / "data" / "savingio-search-index.json"


def article_path(value: str) -> str | None:
    value = value.strip()
    if value.startswith(("http://", "https://")):
        value = urlparse(value).path
    if value.startswith("/articles/") and value.endswith(".html"):
        return value
    return None


def text_meta(source: str, name: str) -> str:
    pattern = rf'<meta[^>]+name=["\']{re.escape(name)}["\'][^>]+content=["\']([^"\']*)'
    match = re.search(pattern, source, re.I)
    if not match:
        pattern = rf'<meta[^>]+content=["\']([^"\']*)["\'][^>]+name=["\']{re.escape(name)}["\']'
        match = re.search(pattern, source, re.I)
    return html.unescape(match.group(1).strip()) if match else ""


def title(source: str) -> str:
    h1 = re.search(r"<h1[^>]*>(.*?)</h1>", source, re.I | re.S)
    raw = h1.group(1) if h1 else (re.search(r"<title[^>]*>(.*?)</title>", source, re.I | re.S).group(1) if re.search(r"<title[^>]*>(.*?)</title>", source, re.I | re.S) else "")
    return html.unescape(re.sub(r"<[^>]+>", " ", raw)).strip()


def visible_text(source: str) -> str:
    cleaned = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", source, flags=re.I | re.S)
    cleaned = re.sub(r"<[^>]+>", " ", cleaned)
    return re.sub(r"\s+", " ", html.unescape(cleaned)).strip()


def main() -> None:
    files = sorted(p for p in ARTICLES.glob("*.html") if p.name != "index.html")
    current = {f"/articles/{p.name}": p for p in files}

    sitemap_text = SITEMAP.read_text(encoding="utf-8", errors="replace")
    removed_sitemap: list[str] = []

    def keep_url(match: re.Match[str]) -> str:
        block = match.group(0)
        loc_match = re.search(r"<loc>(.*?)</loc>", block, re.S)
        if not loc_match:
            return block
        path = article_path(loc_match.group(1))
        if path and path not in current:
            removed_sitemap.append(path)
            return ""
        return block

    repaired_sitemap = re.sub(r"\s*<url>.*?</url>", keep_url, sitemap_text, flags=re.S)
    repaired_sitemap = re.sub(r"\n{3,}", "\n\n", repaired_sitemap)
    SITEMAP.write_text(repaired_sitemap, encoding="utf-8")

    data = json.loads(INDEX.read_text(encoding="utf-8"))
    old_items = data.get("items", {})
    new_items: dict[str, dict[str, object]] = {}
    removed_index: list[str] = []
    added_index: list[str] = []

    for path, item in old_items.items():
        normalized = article_path(path)
        if normalized and normalized in current:
            new_items[normalized] = item
        elif normalized:
            removed_index.append(normalized)

    for path, file_path in current.items():
        if path in new_items:
            continue
        source = file_path.read_text(encoding="utf-8", errors="replace")
        page_title = title(source) or file_path.stem.replace("-", " ")
        description = text_meta(source, "description")
        keywords = text_meta(source, "keywords") or visible_text(source)[:1500]
        new_items[path] = {
            "title": page_title,
            "description": description,
            "keywords": keywords,
            "exact_queries": [],
        }
        added_index.append(path)

    data["count"] = len(new_items)
    data["items"] = dict(sorted(new_items.items()))
    INDEX.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    summary = {
        "currentArticleHtml": len(current),
        "removedSitemapMissingHtml": sorted(set(removed_sitemap)),
        "removedSearchIndexMissingHtml": sorted(set(removed_index)),
        "addedSearchIndexMissingEntry": sorted(set(added_index)),
        "finalSearchIndexCount": len(new_items),
    }
    out = ROOT / "factory" / "MASTER_LOG" / "06_QA" / "CONTENT_INVENTORY_REPAIR.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

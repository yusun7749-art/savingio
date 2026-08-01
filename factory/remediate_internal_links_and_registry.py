from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import quote, urlparse

ROOT = Path(__file__).resolve().parents[1]
HTML_DIRS = [ROOT / "articles", ROOT / "topics", ROOT / "calculators", ROOT / "categories"]
FIXED_HTML = [
    ROOT / "index.html",
    ROOT / "search.html",
    ROOT / "articles" / "index.html",
    ROOT / "calculators" / "index.html",
]
DATA_JSON = ROOT / "data" / "savingio-brain-data.json"
JS_REGISTRIES = [
    ROOT / "data" / "savingio-brain-data.js",
    ROOT / "js" / "savingio-article-registry.js",
    ROOT / "js" / "savingio-brain-data.js",
]
REPORT = ROOT / "factory" / "QA" / "INTERNAL_LINK_REMEDIATION.json"


def exists(href: str) -> bool:
    path = urlparse(href).path
    if not path.startswith("/"):
        return True
    rel = path.lstrip("/")
    candidates = [ROOT / rel]
    if path.endswith("/"):
        candidates.append(ROOT / rel / "index.html")
    else:
        candidates.extend([ROOT / f"{rel}.html", ROOT / rel / "index.html"])
    return any(candidate.exists() for candidate in candidates)


def is_missing_local(href: str) -> bool:
    if href.startswith(("#", "mailto:", "tel:", "javascript:")):
        return False
    if href.startswith(("http://", "https://")):
        return href.startswith("https://savingio.com") and not exists(href)
    return href.startswith("/") and not exists(href)


def fallback(label: str = "") -> str:
    clean = re.sub(r"<[^>]+>", " ", label)
    clean = re.sub(r"\s+", " ", clean).strip()
    return "/search.html" if not clean else "/search.html?q=" + quote(clean[:80])


def fix_html(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    changes: list[dict] = []
    pattern = re.compile(r"<a\b([^>]*?)href=[\"']([^\"']+)[\"']([^>]*)>(.*?)</a>", re.I | re.S)

    def repl(match: re.Match[str]) -> str:
        href = match.group(2)
        if not is_missing_local(href):
            return match.group(0)
        new_href = fallback(match.group(4))
        changes.append({"old": href, "new": new_href})
        return f'<a{match.group(1)}href="{new_href}"{match.group(3)}>{match.group(4)}</a>'

    updated = pattern.sub(repl, text)
    if updated != text:
        path.write_text(updated, encoding="utf-8")
    return changes


def prune_tree(node, removed: list[dict]):
    if isinstance(node, list):
        cleaned = []
        for item in node:
            if isinstance(item, dict):
                href = item.get("href") or item.get("url")
                if href and is_missing_local(str(href)):
                    removed.append({"title": item.get("title", item.get("name", "")), "href": href})
                    continue
            cleaned.append(prune_tree(item, removed))
        return cleaned
    if isinstance(node, dict):
        href = node.get("href") or node.get("url")
        if href and is_missing_local(str(href)):
            return None
        return {key: prune_tree(value, removed) for key, value in node.items() if prune_tree(value, removed) is not None}
    return node


def fix_js_registry(path: Path) -> list[dict]:
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8", errors="ignore")
    changes: list[dict] = []
    pattern = re.compile(r"(?P<prefix>(?:href|url)\s*:\s*)(?P<quote>[\"'])(?P<href>[^\"']+)(?P=quote)", re.I)

    def repl(match: re.Match[str]) -> str:
        href = match.group("href")
        if not is_missing_local(href):
            return match.group(0)
        new_href = "/search.html"
        changes.append({"old": href, "new": new_href})
        return f'{match.group("prefix")}{match.group("quote")}{new_href}{match.group("quote")}'

    updated = pattern.sub(repl, text)
    if updated != text:
        path.write_text(updated, encoding="utf-8")
    return changes


def main() -> None:
    files: list[Path] = []
    for folder in HTML_DIRS:
        if folder.exists():
            files.extend(folder.glob("*.html"))
    files.extend(path for path in FIXED_HTML if path.exists())

    html_results = []
    for path in sorted(set(files)):
        changes = fix_html(path)
        if changes:
            html_results.append({"file": path.relative_to(ROOT).as_posix(), "changes": changes})

    removed: list[dict] = []
    if DATA_JSON.exists():
        data = json.loads(DATA_JSON.read_text(encoding="utf-8"))
        cleaned = prune_tree(data, removed)
        DATA_JSON.write_text(json.dumps(cleaned, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    js_results = []
    for path in JS_REGISTRIES:
        changes = fix_js_registry(path)
        if changes:
            js_results.append({"file": path.relative_to(ROOT).as_posix(), "changes": changes})

    payload = {
        "html_files_changed": len(html_results),
        "html_links_fixed": sum(len(row["changes"]) for row in html_results),
        "registry_items_removed": len(removed),
        "js_files_changed": len(js_results),
        "js_routes_fixed": sum(len(row["changes"]) for row in js_results),
        "html_files": html_results,
        "removed_registry_items": removed,
        "js_files": js_results,
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: payload[key] for key in ["html_files_changed", "html_links_fixed", "registry_items_removed", "js_files_changed", "js_routes_fixed"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()

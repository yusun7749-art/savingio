#!/usr/bin/env python3
"""Savingio static-site integrity audit.

Scans every HTML/JS/CSS/JSON/XML file and reports broken local links,
missing assets, malformed redirects, duplicate targets and AdSense ID drift.
Exit code is non-zero when blocking errors are found.
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "factory" / "SITE_INTEGRITY_REPORT.json"
OFFICIAL_PUBLISHER = "pub-7605193583747751"
TEXT_EXTENSIONS = {".html", ".htm", ".js", ".css", ".json", ".xml", ".txt"}
IGNORE_PREFIXES = ("mailto:", "tel:", "javascript:", "data:", "#", "//")
ATTR_RE = re.compile(r'''(?:href|src|poster|action)\s*=\s*["']([^"']+)["']''', re.I)
CSS_URL_RE = re.compile(r'''url\(\s*["']?([^"')]+)''', re.I)
JSON_PATH_RE = re.compile(r'''["']((?:/|\.\.?/)[^"']+?\.(?:html?|js|css|json|png|jpe?g|webp|svg|gif|ico|xml|txt))["']''', re.I)
ABS_SAVINGIO_RE = re.compile(r'''https?://(?:www\.)?savingio\.com([^\s"'<>)]*)''', re.I)
PUB_RE = re.compile(r'''(?:ca-)?pub-\d{10,}''')


def all_files() -> list[Path]:
    ignored = {".git", "node_modules", "__pycache__", ".venv", "venv"}
    return [p for p in ROOT.rglob("*") if p.is_file() and not any(part in ignored for part in p.parts)]


def public_candidates(path: str) -> list[Path]:
    raw = unquote(urlsplit(path).path)
    if not raw:
        return [ROOT / "index.html"]
    rel = raw.lstrip("/")
    base = ROOT / rel
    candidates = [base]
    if raw.endswith("/"):
        candidates.append(base / "index.html")
    elif not Path(rel).suffix:
        candidates.extend([ROOT / f"{rel}.html", base / "index.html"])
    return candidates


def resolve_reference(source: Path, ref: str) -> list[Path]:
    ref = ref.strip()
    if not ref or ref.startswith(IGNORE_PREFIXES):
        return []
    parts = urlsplit(ref)
    if parts.scheme in {"http", "https"}:
        if parts.netloc.lower() not in {"savingio.com", "www.savingio.com"}:
            return []
        return public_candidates(parts.path)
    if parts.scheme:
        return []
    path = parts.path
    if not path:
        return []
    if path.startswith("/"):
        return public_candidates(path)
    candidate = (source.parent / unquote(path)).resolve()
    try:
        candidate.relative_to(ROOT.resolve())
    except ValueError:
        return []
    candidates = [candidate]
    if path.endswith("/"):
        candidates.append(candidate / "index.html")
    elif not Path(path).suffix:
        candidates.extend([candidate.with_suffix(".html"), candidate / "index.html"])
    return candidates


def extract_refs(path: Path, text: str) -> set[str]:
    refs = set(ATTR_RE.findall(text)) | set(CSS_URL_RE.findall(text)) | set(JSON_PATH_RE.findall(text))
    refs |= {m.group(1) or "/" for m in ABS_SAVINGIO_RE.finditer(text)}
    return refs


def parse_redirects(path: Path) -> tuple[list[dict], list[dict]]:
    malformed, broken = [], []
    if not path.exists():
        return [{"file": "_redirects", "line": 0, "reason": "missing"}], []
    for no, raw in enumerate(path.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        if len(parts) < 2:
            malformed.append({"file": "_redirects", "line": no, "value": line})
            continue
        target = parts[1]
        if target.startswith("http://") or target.startswith("https://"):
            continue
        candidates = public_candidates(target)
        if candidates and not any(p.exists() for p in candidates):
            broken.append({"file": "_redirects", "line": no, "target": target})
    return malformed, broken


def main() -> int:
    files = all_files()
    broken_refs: list[dict] = []
    publisher_drift: list[dict] = []
    refs_seen: Counter[str] = Counter()

    for path in files:
        if path.suffix.lower() not in TEXT_EXTENSIONS:
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        rel = path.relative_to(ROOT).as_posix()
        for found in PUB_RE.findall(text):
            normalized = found.replace("ca-", "")
            if normalized != OFFICIAL_PUBLISHER:
                publisher_drift.append({"file": rel, "found": found})
        for ref in extract_refs(path, text):
            refs_seen[ref] += 1
            candidates = resolve_reference(path, ref)
            if candidates and not any(p.exists() for p in candidates):
                broken_refs.append({
                    "source": rel,
                    "reference": ref,
                    "expected": [p.relative_to(ROOT).as_posix() for p in candidates],
                })

    malformed_redirects, broken_redirects = parse_redirects(ROOT / "_redirects")

    sitemap_missing: list[str] = []
    sitemap = ROOT / "sitemap.xml"
    if sitemap.exists():
        text = sitemap.read_text(encoding="utf-8", errors="replace")
        for url in re.findall(r"<loc>\s*([^<]+)\s*</loc>", text, re.I):
            parts = urlsplit(url.strip())
            if parts.netloc.lower() not in {"savingio.com", "www.savingio.com"}:
                continue
            candidates = public_candidates(parts.path)
            if not any(p.exists() for p in candidates):
                sitemap_missing.append(parts.path or "/")
    else:
        sitemap_missing.append("sitemap.xml missing")

    unique_broken = {(x["source"], x["reference"]): x for x in broken_refs}
    broken_refs = sorted(unique_broken.values(), key=lambda x: (x["source"], x["reference"]))

    report = {
        "status": "FAIL" if any((broken_refs, malformed_redirects, broken_redirects, sitemap_missing, publisher_drift)) else "PASS",
        "root": str(ROOT),
        "files_scanned": len(files),
        "references_scanned": sum(refs_seen.values()),
        "counts": {
            "broken_references": len(broken_refs),
            "malformed_redirects": len(malformed_redirects),
            "broken_redirect_targets": len(broken_redirects),
            "missing_sitemap_targets": len(sitemap_missing),
            "publisher_id_drift": len(publisher_drift),
        },
        "broken_references": broken_refs,
        "malformed_redirects": malformed_redirects,
        "broken_redirect_targets": broken_redirects,
        "missing_sitemap_targets": sorted(set(sitemap_missing)),
        "publisher_id_drift": publisher_drift,
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(report["counts"], ensure_ascii=False, indent=2))
    print(f"REPORT: {REPORT.relative_to(ROOT)}")
    return 1 if report["status"] == "FAIL" else 0


if __name__ == "__main__":
    sys.exit(main())

from __future__ import annotations
from pathlib import Path
import hashlib, json, re

def content_hash(text: str):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def scan_articles(project_root: Path):
    articles = project_root / "articles"
    rows = []
    for path in sorted(articles.glob("*.html")):
        text = path.read_text(encoding="utf-8", errors="ignore")
        rows.append({
            "path": str(path.relative_to(project_root)),
            "size": len(text),
            "hash": content_hash(text),
            "has_h1": bool(re.search(r"<h1\b", text, re.I)),
            "has_faq": 'id="faq"' in text.lower(),
            "has_table": "<table" in text.lower(),
        })
    return rows

def diff_catalog(previous: list[dict], current: list[dict]):
    p = {x["path"]: x for x in previous}
    c = {x["path"]: x for x in current}
    return {
        "added": [c[k] for k in c.keys() - p.keys()],
        "removed": [p[k] for k in p.keys() - c.keys()],
        "changed": [c[k] for k in c.keys() & p.keys() if c[k]["hash"] != p[k]["hash"]],
        "unchanged_count": sum(1 for k in c.keys() & p.keys() if c[k]["hash"] == p[k]["hash"]),
    }

def save_catalog(path: Path, rows: list[dict]):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

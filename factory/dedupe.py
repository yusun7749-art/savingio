from __future__ import annotations
from pathlib import Path
import re
from difflib import SequenceMatcher
from .utils import text_only

def normalize(text: str):
    return re.sub(r"\s+", " ", re.sub(r"[^0-9A-Za-z가-힣\s]", " ", text.lower())).strip()

def title_similarity(a: str, b: str):
    return round(SequenceMatcher(None, normalize(a), normalize(b)).ratio(), 4)

def text_similarity(a: str, b: str):
    na, nb = normalize(text_only(a)), normalize(text_only(b))
    if not na or not nb:
        return 0.0
    return round(SequenceMatcher(None, na[:12000], nb[:12000]).ratio(), 4)

def find_duplicates(topic: str, title: str, html: str, catalog: list[dict], project_root: Path,
                    title_threshold: float=0.82, body_threshold: float=0.88):
    matches = []
    for row in catalog:
        title_score = title_similarity(title, row.get("title",""))
        body_score = 0.0
        path = project_root / row.get("path","")
        if path.exists() and title_score >= 0.55:
            try:
                body_score = text_similarity(html, path.read_text(encoding="utf-8", errors="ignore"))
            except Exception:
                body_score = 0.0
        if title_score >= title_threshold or body_score >= body_threshold:
            matches.append({
                "slug": row.get("slug"),
                "title": row.get("title"),
                "path": row.get("path"),
                "title_similarity": title_score,
                "body_similarity": body_score,
                "blocking": title_score >= title_threshold or body_score >= body_threshold,
            })
    matches.sort(key=lambda x: max(x["title_similarity"], x["body_similarity"]), reverse=True)
    return {
        "duplicate": bool(matches),
        "matches": matches[:10],
        "thresholds": {"title": title_threshold, "body": body_threshold},
    }

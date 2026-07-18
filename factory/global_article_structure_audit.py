#!/usr/bin/env python3
"""Global structural duplication audit for Savingio article pages."""
from __future__ import annotations

import json
import re
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "articles"
REPORT = ROOT / "factory" / "GLOBAL_ARTICLE_STRUCTURE_QA.json"
EXCLUDED = {"index.html"}


def count_exact_headings(soup: BeautifulSoup, text: str) -> int:
    return sum(
        1
        for heading in soup.find_all(re.compile(r"^h[1-6]$"))
        if heading.get_text(" ", strip=True) == text
    )


def audit_file(path: Path) -> dict[str, object]:
    html = path.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    summary_title_count = count_exact_headings(soup, "3초 요약")
    author_box_count = len(soup.select(".savingio-author-box"))
    quick_grid_count = len(soup.select("section.quick-grid"))
    hero_thumb_count = len(soup.select("figure.factory-article-thumb"))
    canonical_count = len(soup.select('link[rel="canonical"]'))
    article_schema_count = sum(
        1
        for node in soup.select('script[type="application/ld+json"]')
        if '"@type":"Article"' in node.get_text("", strip=True)
        or '"@type": "Article"' in node.get_text("", strip=True)
    )

    duplicate_fields = {
        "summary_title": summary_title_count > 1,
        "author_box": author_box_count > 1,
        "quick_grid": quick_grid_count > 1,
        "hero_thumbnail": hero_thumb_count > 1,
        "canonical": canonical_count > 1,
        "article_schema": article_schema_count > 1,
    }

    missing_fields = {
        "author_box": author_box_count == 0,
        "canonical": canonical_count == 0,
        "article_schema": article_schema_count == 0,
    }

    status = "PASS" if not any(duplicate_fields.values()) and not any(missing_fields.values()) else "FAIL"

    return {
        "file": path.relative_to(ROOT).as_posix(),
        "status": status,
        "counts": {
            "summary_title": summary_title_count,
            "author_box": author_box_count,
            "quick_grid": quick_grid_count,
            "hero_thumbnail": hero_thumb_count,
            "canonical": canonical_count,
            "article_schema": article_schema_count,
        },
        "duplicate_fields": duplicate_fields,
        "missing_fields": missing_fields,
    }


def main() -> int:
    files = sorted(p for p in ARTICLES.glob("*.html") if p.name not in EXCLUDED)
    results = [audit_file(path) for path in files]
    failed = [item for item in results if item["status"] == "FAIL"]

    report = {
        "scanned_count": len(results),
        "pass_count": len(results) - len(failed),
        "fail_count": len(failed),
        "failed_files": [item["file"] for item in failed],
        "articles": results,
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

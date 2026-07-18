#!/usr/bin/env python3
"""Fail deployment when public Savingio articles are thin or title-only.

The audit measures visible Korean content after removing scripts, styles and HTML tags.
It does not reward menus, repeated titles or schema markup. Articles must be detailed,
practical and understandable to a non-expert.
"""
from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "articles"
REPORT = ROOT / "factory" / "ADSENSE_CONTENT_DEPTH_QA.json"
EXCLUDED = {"index.html"}
MIN_VISIBLE_CHARS = 5000
MIN_PARAGRAPHS = 12
MIN_H2 = 6
MIN_FAQ = 4
MIN_LIST_ITEMS = 8
EASY_LANGUAGE_MARKERS = (
    "쉽게 말하면", "예를 들어", "먼저", "순서", "확인", "주의", "경우", "방법"
)
PROBLEM_SOLVING_MARKERS = (
    "지금 할 일", "3초", "원인", "상황", "비용", "안전", "실수", "자주 묻는 질문"
)


def visible_text(source: str) -> str:
    source = re.sub(r"<script\b[^>]*>.*?</script>", " ", source, flags=re.I | re.S)
    source = re.sub(r"<style\b[^>]*>.*?</style>", " ", source, flags=re.I | re.S)
    source = re.sub(r"<nav\b[^>]*>.*?</nav>", " ", source, flags=re.I | re.S)
    source = re.sub(r"<footer\b[^>]*>.*?</footer>", " ", source, flags=re.I | re.S)
    source = re.sub(r"<[^>]+>", " ", source)
    source = html.unescape(source)
    return re.sub(r"\s+", " ", source).strip()


def compact_length(text: str) -> int:
    return len(re.sub(r"\s", "", text))


def audit(path: Path) -> dict:
    source = path.read_text(encoding="utf-8", errors="replace")
    text = visible_text(source)
    title_match = re.search(r"<h1\b[^>]*>(.*?)</h1>", source, flags=re.I | re.S)
    title = re.sub(r"<[^>]+>", "", title_match.group(1)).strip() if title_match else path.stem
    paragraphs = [visible_text(x) for x in re.findall(r"<p\b[^>]*>(.*?)</p>", source, flags=re.I | re.S)]
    substantial_paragraphs = [p for p in paragraphs if compact_length(p) >= 80]
    h2_count = len(re.findall(r"<h2\b", source, flags=re.I))
    faq_count = len(re.findall(r"<details\b", source, flags=re.I))
    list_count = len(re.findall(r"<li\b", source, flags=re.I))
    chars = compact_length(text)
    repeated_title_ratio = text.count(title) / max(len(paragraphs), 1)
    easy_hits = [m for m in EASY_LANGUAGE_MARKERS if m in text]
    solving_hits = [m for m in PROBLEM_SOLVING_MARKERS if m in text]

    errors: list[str] = []
    if chars < MIN_VISIBLE_CHARS:
        errors.append(f"visible_chars<{MIN_VISIBLE_CHARS}:{chars}")
    if len(substantial_paragraphs) < MIN_PARAGRAPHS:
        errors.append(f"substantial_paragraphs<{MIN_PARAGRAPHS}:{len(substantial_paragraphs)}")
    if h2_count < MIN_H2:
        errors.append(f"h2<{MIN_H2}:{h2_count}")
    if faq_count < MIN_FAQ:
        errors.append(f"faq<{MIN_FAQ}:{faq_count}")
    if list_count < MIN_LIST_ITEMS:
        errors.append(f"list_items<{MIN_LIST_ITEMS}:{list_count}")
    if len(easy_hits) < 4:
        errors.append(f"plain_language_markers<4:{len(easy_hits)}")
    if len(solving_hits) < 5:
        errors.append(f"problem_solving_markers<5:{len(solving_hits)}")
    if repeated_title_ratio > 0.5:
        errors.append("title_repetition_suspected")

    return {
        "file": path.relative_to(ROOT).as_posix(),
        "title": title,
        "visible_chars_no_space": chars,
        "paragraphs": len(paragraphs),
        "substantial_paragraphs": len(substantial_paragraphs),
        "h2": h2_count,
        "faq": faq_count,
        "list_items": list_count,
        "plain_language_markers": easy_hits,
        "problem_solving_markers": solving_hits,
        "status": "PASS" if not errors else "FAIL",
        "errors": errors,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="0 means all articles")
    parser.add_argument("--offset", type=int, default=0)
    args = parser.parse_args()

    files = sorted(p for p in ARTICLES.glob("*.html") if p.name not in EXCLUDED)
    selected = files[args.offset:] if args.limit <= 0 else files[args.offset:args.offset + args.limit]
    results = [audit(path) for path in selected]
    failed = [item for item in results if item["status"] == "FAIL"]
    payload = {
        "standard": "Savingio AdSense Content Depth V3.031",
        "minimum_visible_characters": MIN_VISIBLE_CHARS,
        "selected_count": len(results),
        "pass_count": len(results) - len(failed),
        "fail_count": len(failed),
        "status": "PASS" if not failed else "FAIL",
        "articles": results,
    }
    REPORT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

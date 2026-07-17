#!/usr/bin/env python3
"""Savingio article batch QA/normalizer.

Processes a bounded batch of article HTML files, applies verifiable structural
fixes, creates repository-owned article thumbnails, and emits a machine-readable
report. Editorial copy is never fabricated by this script.
"""
from __future__ import annotations

import argparse
import datetime as dt
import html as html_lib
import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "articles"
IMAGES = ROOT / "images" / "articles"
REPORT = ROOT / "factory" / "ARTICLE_BATCH_QA.json"

EXCLUDED = {"index.html"}
REQUIRED_SECTIONS = ("3초 요약", "목차", "자주 묻는 질문")
DNA_VERSION = "6"


def visible_text(html: str) -> str:
    body = re.sub(r"<script\b[^>]*>.*?</script>", " ", html, flags=re.I | re.S)
    body = re.sub(r"<style\b[^>]*>.*?</style>", " ", body, flags=re.I | re.S)
    body = re.sub(r"<[^>]+>", " ", body)
    body = re.sub(r"&[a-zA-Z0-9#]+;", " ", body)
    return re.sub(r"\s+", " ", body).strip()


def extract_title(html: str) -> str:
    match = re.search(r"<h1\b[^>]*>(.*?)</h1>", html, flags=re.I | re.S)
    if not match:
        match = re.search(r"<title>(.*?)</title>", html, flags=re.I | re.S)
    return re.sub(r"<[^>]+>", "", match.group(1)).strip() if match else ""


def extract_category(html: str) -> str:
    badge = re.search(r'<span\b[^>]*class=["\'][^"\']*badge[^"\']*["\'][^>]*>(.*?)</span>', html, flags=re.I | re.S)
    if badge:
        return re.sub(r"<[^>]+>", "", badge.group(1)).strip()
    breadcrumb = re.findall(r'<span\b[^>]*>(.*?)</span>', html, flags=re.I | re.S)
    return re.sub(r"<[^>]+>", "", breadcrumb[-1]).strip() if breadcrumb else ""


def ensure_layout_css(html: str) -> tuple[str, bool]:
    pattern = r'(<link\b[^>]*href=["\']/css/article-layout-dna\.css)(?:\?v=[^"\']*)?(["\'][^>]*>)'
    if re.search(pattern, html, flags=re.I):
        updated = re.sub(pattern, rf'\1?v={DNA_VERSION}\2', html, count=1, flags=re.I)
        return updated, updated != html
    marker = "</head>"
    link = f'<link rel="stylesheet" href="/css/article-layout-dna.css?v={DNA_VERSION}" data-savingio-layout-dna="v{DNA_VERSION}">'
    if marker in html:
        return html.replace(marker, link + marker, 1), True
    return html, False


def ensure_body_class(html: str) -> tuple[str, bool]:
    body_match = re.search(r"<body\b([^>]*)>", html, flags=re.I)
    if not body_match:
        return html, False
    attrs = body_match.group(1)
    if "savingio-article-dna" in attrs:
        return html, False
    if re.search(r'class=["\']', attrs, flags=re.I):
        new_attrs = re.sub(r'class=(["\'])(.*?)\1', lambda m: f'class={m.group(1)}{m.group(2)} savingio-article-dna{m.group(1)}', attrs, count=1, flags=re.I)
    else:
        new_attrs = attrs + ' class="savingio-article-dna"'
    old = body_match.group(0)
    new = f"<body{new_attrs}>"
    return html.replace(old, new, 1), True


def wrap_title(title: str, limit: int = 19) -> list[str]:
    words = title.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and len(candidate) > limit:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines[:3]


def ensure_thumbnail_file(slug: str, title: str, category: str) -> bool:
    IMAGES.mkdir(parents=True, exist_ok=True)
    path = IMAGES / f"{slug}.svg"
    if path.exists():
        return False
    safe_title = html_lib.escape(title or slug)
    safe_category = html_lib.escape(category or "생활 절약 가이드")
    lines = wrap_title(safe_title)
    tspans = "".join(
        f'<tspan x="92" dy="{0 if index == 0 else 62}">{line}</tspan>'
        for index, line in enumerate(lines)
    )
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
<title id="title">{safe_title}</title><desc id="desc">Savingio {safe_category} 대표 이미지</desc>
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#eff8ff"/><stop offset="1" stop-color="#fff8e8"/></linearGradient></defs>
<rect width="1200" height="630" rx="44" fill="url(#bg)"/><rect x="54" y="54" width="1092" height="522" rx="34" fill="#ffffff" opacity=".92"/>
<text x="92" y="128" font-family="Arial,Apple SD Gothic Neo,Noto Sans KR,sans-serif" font-size="28" font-weight="700" fill="#176b87">SAVINGIO · {safe_category}</text>
<text x="92" y="244" font-family="Arial,Apple SD Gothic Neo,Noto Sans KR,sans-serif" font-size="52" font-weight="800" fill="#17212b">{tspans}</text>
<circle cx="1010" cy="315" r="104" fill="#e5f4f7"/><path d="M960 323h100M1010 273v100" stroke="#176b87" stroke-width="18" stroke-linecap="round"/>
<text x="92" y="520" font-family="Arial,Apple SD Gothic Neo,Noto Sans KR,sans-serif" font-size="25" fill="#52616b">생활비를 줄이는 정확한 정보와 실행 순서</text>
</svg>'''
    path.write_text(svg, encoding="utf-8", newline="\n")
    return True


def ensure_thumbnail_meta(html: str, slug: str, title: str) -> tuple[str, bool, bool]:
    image_rel = f"/images/articles/{slug}.svg"
    image_file = IMAGES / f"{slug}.svg"
    image_exists = image_file.exists()
    changed = False
    if not image_exists:
        return html, changed, False
    absolute = f"https://savingio.com{image_rel}"
    if not re.search(r'<meta\b[^>]*property=["\']og:image["\']', html, flags=re.I):
        html = html.replace("</head>", f'<meta property="og:image" content="{absolute}">\n</head>', 1)
        changed = True
    if not re.search(r'<meta\b[^>]*name=["\']twitter:image["\']', html, flags=re.I):
        html = html.replace("</head>", f'<meta name="twitter:image" content="{absolute}">\n</head>', 1)
        changed = True
    if "factory-article-thumb" not in html:
        hero = re.search(r'<section\b[^>]*class=["\'][^"\']*hero[^"\']*["\'][^>]*>.*?</section>', html, flags=re.I | re.S)
        if hero:
            figure = (
                f'<figure class="factory-article-thumb" data-factory-hero="true">'
                f'<img src="{image_rel}" width="1200" height="630" loading="eager" decoding="async" alt="{html_lib.escape(title)}">'
                f'<figcaption>{html_lib.escape(title)}</figcaption></figure>'
            )
            pos = hero.end()
            html = html[:pos] + figure + html[pos:]
            changed = True
    return html, changed, True


def audit(path: Path, html: str) -> dict[str, Any]:
    text = visible_text(html)
    title = extract_title(html)
    slug = path.stem
    category = extract_category(html)
    related_links = len(re.findall(r'href=["\']/articles/[^"\']+\.html', html, flags=re.I))
    return {
        "file": path.relative_to(ROOT).as_posix(), "slug": slug, "title": title,
        "category": category, "visible_characters": len(text.replace(" ", "")),
        "has_thumbnail_file": (IMAGES / f"{slug}.svg").exists(),
        "has_thumbnail_markup": "factory-article-thumb" in html,
        "has_og_image": bool(re.search(r'property=["\']og:image["\']', html, flags=re.I)),
        "has_twitter_image": bool(re.search(r'name=["\']twitter:image["\']', html, flags=re.I)),
        "has_author_box": "savingio-author-box" in html,
        "has_faq_schema": '"@type":"FAQPage"' in html or '"@type": "FAQPage"' in html,
        "has_article_schema": '"@type":"Article"' in html or '"@type": "Article"' in html,
        "has_canonical": bool(re.search(r'rel=["\']canonical["\']', html, flags=re.I)),
        "related_article_links": related_links,
        "required_sections": {name: name in text for name in REQUIRED_SECTIONS},
    }


def score(item: dict[str, Any]) -> int:
    checks = [item["visible_characters"] >= 3500, item["has_thumbnail_file"], item["has_thumbnail_markup"], item["has_og_image"], item["has_twitter_image"], item["has_author_box"], item["has_faq_schema"], item["has_article_schema"], item["has_canonical"], item["related_article_links"] >= 2, bool(item["category"]), all(item["required_sections"].values())]
    return round(sum(checks) / len(checks) * 100)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    files = sorted(p for p in ARTICLES.glob("*.html") if p.name not in EXCLUDED)
    selected = files[args.offset: args.offset + max(args.limit, 0)]
    results: list[dict[str, Any]] = []
    changed_files: list[str] = []
    for path in selected:
        original = path.read_text(encoding="utf-8")
        html = original
        title = extract_title(html)
        category = extract_category(html)
        image_created = ensure_thumbnail_file(path.stem, title, category) if args.apply else False
        html, _ = ensure_layout_css(html)
        html, _ = ensure_body_class(html)
        html, _, _ = ensure_thumbnail_meta(html, path.stem, title)
        if args.apply and html != original:
            path.write_text(html, encoding="utf-8", newline="\n")
            changed_files.append(path.relative_to(ROOT).as_posix())
        if image_created:
            changed_files.append((IMAGES / f"{path.stem}.svg").relative_to(ROOT).as_posix())
        item = audit(path, html)
        item["qa_score"] = score(item)
        item["status"] = "PASS" if item["qa_score"] >= 90 else "FIX"
        results.append(item)
    report = {"generated_at": dt.datetime.now(dt.timezone.utc).isoformat(), "mode": "apply" if args.apply else "audit", "dna_version": DNA_VERSION, "offset": args.offset, "limit": args.limit, "selected_count": len(selected), "changed_count": len(changed_files), "changed_files": changed_files, "pass_count": sum(r["status"] == "PASS" for r in results), "fix_count": sum(r["status"] == "FIX" for r in results), "articles": results}
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

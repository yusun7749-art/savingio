#!/usr/bin/env python3
from __future__ import annotations

import html
import json
import re
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "articles"
OUT_DIR = ROOT / "factory" / "SEO_AUDIT"
OUT_DIR.mkdir(parents=True, exist_ok=True)

TAG_RE = re.compile(r"<[^>]+>", re.S)
SCRIPT_STYLE_RE = re.compile(r"<(script|style)\b[^>]*>.*?</\1>", re.I | re.S)
COMMENT_RE = re.compile(r"<!--.*?-->", re.S)


def attr(content: str, tag: str, name: str, value: str, target: str = "content") -> str:
    patterns = [
        rf"<{tag}\b(?=[^>]*\b{name}\s*=\s*['\"]{re.escape(value)}['\"])[^>]*\b{target}\s*=\s*['\"]([^'\"]*)['\"][^>]*>",
        rf"<{tag}\b(?=[^>]*\b{target}\s*=\s*['\"]([^'\"]*)['\"])[^>]*\b{name}\s*=\s*['\"]{re.escape(value)}['\"][^>]*>",
    ]
    for p in patterns:
        m = re.search(p, content, re.I | re.S)
        if m:
            return html.unescape(m.group(1)).strip()
    return ""


def first_tag_text(content: str, tag: str) -> str:
    m = re.search(rf"<{tag}\b[^>]*>(.*?)</{tag}>", content, re.I | re.S)
    return clean_text(m.group(1)) if m else ""


def clean_text(content: str) -> str:
    content = COMMENT_RE.sub(" ", content)
    content = SCRIPT_STYLE_RE.sub(" ", content)
    content = TAG_RE.sub(" ", content)
    content = html.unescape(content)
    return re.sub(r"\s+", " ", content).strip()


def normalize_url(url: str) -> str:
    if not url:
        return ""
    p = urlparse(url)
    path = re.sub(r"/+$", "", p.path)
    path = re.sub(r"\.html$", "", path)
    return f"{p.netloc.lower()}{path.lower()}"


def count_tags(content: str, tag: str) -> int:
    return len(re.findall(rf"<{tag}\b", content, re.I))


def audit_file(path: Path) -> dict:
    content = path.read_text(encoding="utf-8", errors="replace")
    text = clean_text(content)
    title = first_tag_text(content, "title")
    desc = attr(content, "meta", "name", "description")
    canonical = attr(content, "link", "rel", "canonical", "href")
    robots = attr(content, "meta", "name", "robots")
    h1s = re.findall(r"<h1\b[^>]*>(.*?)</h1>", content, re.I | re.S)
    h1_texts = [clean_text(x) for x in h1s]
    h2_count = count_tags(content, "h2")
    h3_count = count_tags(content, "h3")
    internal_links = re.findall(r"href\s*=\s*['\"](/[^'\"#?]+)", content, re.I)
    article_links = [x for x in internal_links if x.startswith("/articles/")]
    img_tags = re.findall(r"<img\b[^>]*>", content, re.I | re.S)
    missing_alt = sum(1 for x in img_tags if not re.search(r"\balt\s*=", x, re.I))
    jsonld_count = len(re.findall(r"application/ld\+json", content, re.I))
    has_article_schema = bool(re.search(r'"@type"\s*:\s*"Article"', content, re.I))
    has_breadcrumb_schema = bool(re.search(r'"@type"\s*:\s*"BreadcrumbList"', content, re.I))
    has_faq_schema = bool(re.search(r'"@type"\s*:\s*"FAQPage"', content, re.I))
    has_faq_section = bool(re.search(r"id\s*=\s*['\"]faq['\"]|자주\s*묻는\s*질문", content, re.I))
    korean_chars = len(re.findall(r"[가-힣]", text))
    words = len(text.split())
    issues = []
    warnings = []

    if not title:
        issues.append("TITLE_MISSING")
    elif len(title) < 15 or len(title) > 65:
        warnings.append(f"TITLE_LENGTH:{len(title)}")
    if not desc:
        issues.append("META_DESCRIPTION_MISSING")
    elif len(desc) < 50 or len(desc) > 170:
        warnings.append(f"META_DESCRIPTION_LENGTH:{len(desc)}")
    if not canonical:
        issues.append("CANONICAL_MISSING")
    elif normalize_url(canonical) != normalize_url("https://savingio.com/" + path.relative_to(ROOT).as_posix()):
        warnings.append("CANONICAL_PATH_MISMATCH")
    if "noindex" in robots.lower():
        issues.append("NOINDEX")
    if len(h1_texts) != 1:
        issues.append(f"H1_COUNT:{len(h1_texts)}")
    if h2_count < 3:
        warnings.append(f"H2_TOO_FEW:{h2_count}")
    if not has_article_schema:
        warnings.append("ARTICLE_SCHEMA_MISSING")
    if not has_breadcrumb_schema:
        warnings.append("BREADCRUMB_SCHEMA_MISSING")
    if has_faq_section and not has_faq_schema:
        warnings.append("FAQ_SCHEMA_MISSING")
    if len(article_links) < 3:
        warnings.append(f"INTERNAL_ARTICLE_LINKS_LOW:{len(article_links)}")
    if missing_alt:
        warnings.append(f"IMAGE_ALT_MISSING:{missing_alt}")
    if korean_chars < 2500:
        issues.append(f"THIN_CONTENT_KO:{korean_chars}")
    elif korean_chars < 4500:
        warnings.append(f"CONTENT_SHORT_KO:{korean_chars}")
    generic_markers = [
        "대상과 적용 조건 확인합니다",
        "공식 자료와 본인 서류 대조합니다",
        "온라인 조회가 편리하지만",
        "신청이나 신고 후 무엇을 보관해야 하나요",
    ]
    generic_hits = [x for x in generic_markers if x in text]
    if generic_hits:
        issues.append(f"GENERIC_TEMPLATE_TEXT:{len(generic_hits)}")

    score = 100
    score -= 12 * len(issues)
    score -= 4 * len(warnings)
    score = max(0, score)
    status = "PASS" if score >= 85 and not issues else "WARNING" if score >= 65 else "FAIL"

    return {
        "path": path.relative_to(ROOT).as_posix(),
        "url": canonical or "https://savingio.com/" + path.relative_to(ROOT).as_posix(),
        "title": title,
        "meta_description": desc,
        "canonical": canonical,
        "h1": h1_texts,
        "h2_count": h2_count,
        "h3_count": h3_count,
        "korean_chars": korean_chars,
        "words": words,
        "internal_article_links": len(article_links),
        "images": len(img_tags),
        "missing_alt": missing_alt,
        "jsonld_count": jsonld_count,
        "article_schema": has_article_schema,
        "breadcrumb_schema": has_breadcrumb_schema,
        "faq_schema": has_faq_schema,
        "issues": issues,
        "warnings": warnings,
        "score": score,
        "status": status,
    }


def main() -> int:
    files = sorted(p for p in ARTICLES.glob("*.html") if p.name != "index.html")
    results = [audit_file(p) for p in files]

    duplicates = {"titles": {}, "descriptions": {}, "canonicals": {}, "normalized_urls": {}}
    mappings = {
        "titles": defaultdict(list),
        "descriptions": defaultdict(list),
        "canonicals": defaultdict(list),
        "normalized_urls": defaultdict(list),
    }
    for r in results:
        if r["title"]:
            mappings["titles"][r["title"]].append(r["path"])
        if r["meta_description"]:
            mappings["descriptions"][r["meta_description"]].append(r["path"])
        if r["canonical"]:
            mappings["canonicals"][r["canonical"]].append(r["path"])
            mappings["normalized_urls"][normalize_url(r["canonical"])].append(r["path"])
    for kind, mp in mappings.items():
        duplicates[kind] = {k: v for k, v in mp.items() if len(v) > 1}

    duplicate_paths = set()
    for kind in duplicates.values():
        for paths in kind.values():
            duplicate_paths.update(paths)
    for r in results:
        if r["path"] in duplicate_paths:
            r["warnings"].append("DUPLICATE_SEO_SIGNAL")
            r["score"] = max(0, r["score"] - 6)
            if r["status"] == "PASS":
                r["status"] = "WARNING"

    summary = {
        "article_count": len(results),
        "pass": sum(r["status"] == "PASS" for r in results),
        "warning": sum(r["status"] == "WARNING" for r in results),
        "fail": sum(r["status"] == "FAIL" for r in results),
        "average_score": round(sum(r["score"] for r in results) / len(results), 1) if results else 0,
        "thin_under_2500_ko": sum(r["korean_chars"] < 2500 for r in results),
        "short_under_4500_ko": sum(r["korean_chars"] < 4500 for r in results),
        "missing_meta": sum(not r["meta_description"] for r in results),
        "missing_canonical": sum(not r["canonical"] for r in results),
        "bad_h1": sum(len(r["h1"]) != 1 for r in results),
        "low_internal_links": sum(r["internal_article_links"] < 3 for r in results),
        "duplicate_title_groups": len(duplicates["titles"]),
        "duplicate_description_groups": len(duplicates["descriptions"]),
        "duplicate_canonical_groups": len(duplicates["canonicals"]),
        "duplicate_normalized_url_groups": len(duplicates["normalized_urls"]),
    }

    report = {"summary": summary, "duplicates": duplicates, "articles": results}
    (OUT_DIR / "seo-audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = [
        "# Savingio Full SEO Audit",
        "",
        f"- Articles: {summary['article_count']}",
        f"- PASS: {summary['pass']}",
        f"- WARNING: {summary['warning']}",
        f"- FAIL: {summary['fail']}",
        f"- Average score: {summary['average_score']}",
        f"- Thin content (<2500 Korean chars): {summary['thin_under_2500_ko']}",
        f"- Short content (<4500 Korean chars): {summary['short_under_4500_ko']}",
        f"- Missing meta: {summary['missing_meta']}",
        f"- Missing canonical: {summary['missing_canonical']}",
        f"- Bad H1 count: {summary['bad_h1']}",
        f"- Low internal article links: {summary['low_internal_links']}",
        f"- Duplicate title groups: {summary['duplicate_title_groups']}",
        f"- Duplicate description groups: {summary['duplicate_description_groups']}",
        f"- Duplicate canonical groups: {summary['duplicate_canonical_groups']}",
        f"- Duplicate normalized URL groups: {summary['duplicate_normalized_url_groups']}",
        "",
        "## Lowest-scoring articles",
        "",
        "| Score | Status | Article | Main findings |",
        "|---:|---|---|---|",
    ]
    for r in sorted(results, key=lambda x: (x["score"], x["path"]))[:80]:
        findings = ", ".join((r["issues"] + r["warnings"])[:5]) or "-"
        lines.append(f"| {r['score']} | {r['status']} | `{r['path']}` | {findings} |")
    (OUT_DIR / "seo-audit.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print("SEO_AUDIT_SUMMARY=" + json.dumps(summary, ensure_ascii=False))
    print("SEO_AUDIT_LOWEST_START")
    for r in sorted(results, key=lambda x: (x["score"], x["path"]))[:30]:
        print(json.dumps({"path": r["path"], "score": r["score"], "status": r["status"], "issues": r["issues"], "warnings": r["warnings"]}, ensure_ascii=False))
    print("SEO_AUDIT_LOWEST_END")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

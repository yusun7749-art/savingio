from __future__ import annotations

import json
import re
import subprocess
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
ARTICLES = ROOT / "articles"
SITEMAP = ROOT / "sitemap.xml"
SEARCH_INDEX = ROOT / "data" / "savingio-search-index.json"
REDIRECTS = ROOT / "_redirects"
OUT_DIR = ROOT / "factory" / "MASTER_LOG" / "06_QA"
JSON_OUT = OUT_DIR / "CONTENT_INVENTORY_AUDIT.json"
MD_OUT = OUT_DIR / "CONTENT_INVENTORY_AUDIT.md"


def norm_article_path(value: str) -> str | None:
    value = value.strip()
    if value.startswith("http://") or value.startswith("https://"):
        value = urlparse(value).path
    if not value.startswith("/articles/") or not value.endswith(".html"):
        return None
    return value


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True, errors="replace")


def parse_sitemap() -> set[str]:
    text = SITEMAP.read_text(encoding="utf-8", errors="replace")
    return {p for p in map(norm_article_path, re.findall(r"<loc>(.*?)</loc>", text)) if p}


def parse_index() -> set[str]:
    data = json.loads(SEARCH_INDEX.read_text(encoding="utf-8"))
    return {p for p in map(norm_article_path, data.get("items", {}).keys()) if p}


def parse_redirects() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for raw in REDIRECTS.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        if len(parts) < 3 or parts[-1] != "301":
            continue
        source, target = parts[0], parts[1]
        rows.append({"source": source, "target": target, "status": "301"})
    return rows


def file_classification(path: Path) -> dict[str, object]:
    text = path.read_text(encoding="utf-8", errors="replace")
    lower = text.lower()
    redirect_markers = [
        'http-equiv="refresh"',
        "http-equiv='refresh'",
        "location.replace(",
        "location.href=",
        "window.location=",
    ]
    is_redirect_stub = any(marker in lower for marker in redirect_markers) and len(text) < 12000
    noindex = bool(re.search(r'<meta[^>]+name=["\']robots["\'][^>]+noindex', lower))
    canonical_match = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', text, re.I)
    canonical = canonical_match.group(1) if canonical_match else None
    return {
        "path": f"/articles/{path.name}",
        "bytes": path.stat().st_size,
        "redirect_stub": is_redirect_stub,
        "noindex": noindex,
        "canonical": canonical,
    }


def deleted_history() -> list[dict[str, str]]:
    output = git("log", "--all", "--diff-filter=D", "--name-status", "--format=@@%H|%ad|%s", "--date=short", "--", "articles/*.html")
    current = {"commit": "", "date": "", "message": ""}
    rows: list[dict[str, str]] = []
    for line in output.splitlines():
        if line.startswith("@@"):
            commit, date, message = (line[2:].split("|", 2) + ["", ""])[:3]
            current = {"commit": commit, "date": date, "message": message}
        elif line.startswith("D\t"):
            rows.append({**current, "path": "/" + line.split("\t", 1)[1]})
    return rows


def change_evidence() -> list[dict[str, object]]:
    pattern = re.compile(r"(통합|삭제|재작성|교체|rewrite|merge|remove|delete)", re.I)
    output = git("log", "--all", "--name-status", "--format=@@%H|%ad|%s", "--date=short", "--", "articles/*.html", "_redirects", "sitemap.xml", "data/savingio-search-index.json")
    current = None
    records: list[dict[str, object]] = []
    for line in output.splitlines():
        if line.startswith("@@"):
            commit, date, message = (line[2:].split("|", 2) + ["", ""])[:3]
            current = {"commit": commit, "date": date, "message": message, "files": []}
            if pattern.search(message):
                records.append(current)
        elif current in records and line and "\t" in line:
            status, path = line.split("\t", 1)
            current["files"].append({"status": status, "path": path})
    return records


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    article_files = sorted(p for p in ARTICLES.glob("*.html") if p.name != "index.html")
    file_rows = [file_classification(p) for p in article_files]
    file_paths = {row["path"] for row in file_rows}
    sitemap_paths = parse_sitemap()
    index_paths = parse_index()
    redirects = parse_redirects()

    article_redirects = [r for r in redirects if r["source"].startswith("/articles/") or r["target"].startswith("/articles/")]
    article_to_article = [r for r in article_redirects if norm_article_path(r["source"]) and norm_article_path(r["target"]) and r["source"] != r["target"]]
    present_source_redirects = [r for r in article_to_article if r["source"] in file_paths]
    absent_source_redirects = [r for r in article_to_article if r["source"] not in file_paths]

    deleted = deleted_history()
    deleted_unique = sorted({r["path"] for r in deleted})
    evidence = change_evidence()

    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "counts": {
            "articleHtmlFilesExcludingIndex": len(file_paths),
            "sitemapArticleUrls": len(sitemap_paths),
            "searchIndexArticleItems": len(index_paths),
            "redirectStubsPresent": sum(bool(r["redirect_stub"]) for r in file_rows),
            "noindexArticleFiles": sum(bool(r["noindex"]) for r in file_rows),
            "articleRelated301Rules": len(article_redirects),
            "articleToArticle301Rules": len(article_to_article),
            "articleRedirectSourcesStillPresent": len(present_source_redirects),
            "articleRedirectSourcesAbsent": len(absent_source_redirects),
            "uniqueDeletedArticlePathsInGitHistory": len(deleted_unique),
            "keywordMatchedChangeCommits": len(evidence),
        },
        "sets": {
            "sitemapMissingHtml": sorted(sitemap_paths - file_paths),
            "htmlNotInSitemap": sorted(file_paths - sitemap_paths),
            "indexNotInSitemap": sorted(index_paths - sitemap_paths),
            "sitemapNotInIndex": sorted(sitemap_paths - index_paths),
            "indexMissingHtml": sorted(index_paths - file_paths),
            "htmlNotInIndex": sorted(file_paths - index_paths),
            "deletedArticlePathsInGitHistory": deleted_unique,
        },
        "redirects": {
            "presentSource": present_source_redirects,
            "absentSource": absent_source_redirects,
        },
        "fileClassifications": file_rows,
        "deletionHistory": deleted,
        "changeEvidence": evidence,
        "interpretation": {
            "actualCurrentHtmlCount": len(file_paths),
            "publishedCandidateCount": len(sitemap_paths & file_paths),
            "confirmedHistoricalDeletionCount": len(deleted_unique),
            "confirmedArticleToArticleRedirectRuleCount": len(article_to_article),
            "warning": "301 규칙은 주소 정리와 실제 콘텐츠 통합이 섞일 수 있으므로 본문 비교 전 통합 완료 수치로 확정하지 않는다.",
        },
    }

    JSON_OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    c = report["counts"]
    s = report["sets"]
    lines = [
        "# Savingio 전체 콘텐츠 재검수 보고서",
        "",
        f"- 생성: {report['generatedAt']}",
        f"- 실제 article HTML: **{c['articleHtmlFilesExcludingIndex']}개**",
        f"- sitemap article URL: **{c['sitemapArticleUrls']}개**",
        f"- 검색 인덱스 article 항목: **{c['searchIndexArticleItems']}개**",
        f"- Git 이력상 삭제된 고유 article 경로: **{c['uniqueDeletedArticlePathsInGitHistory']}개**",
        f"- article→article 301 규칙: **{c['articleToArticle301Rules']}개**",
        f"- 현재 파일이 남은 301 source: **{c['articleRedirectSourcesStillPresent']}개**",
        f"- 현재 파일이 없는 301 source: **{c['articleRedirectSourcesAbsent']}개**",
        "",
        "## 불일치",
        f"- sitemap에는 있으나 HTML 없음: {len(s['sitemapMissingHtml'])}개",
        f"- HTML은 있으나 sitemap 제외: {len(s['htmlNotInSitemap'])}개",
        f"- 검색 인덱스에는 있으나 sitemap 제외: {len(s['indexNotInSitemap'])}개",
        f"- sitemap에는 있으나 검색 인덱스 제외: {len(s['sitemapNotInIndex'])}개",
        f"- 검색 인덱스에는 있으나 HTML 없음: {len(s['indexMissingHtml'])}개",
        "",
        "## 판정",
        f"- 현재 실제 운영 후보는 sitemap과 HTML의 교집합 **{len(sitemap_paths & file_paths)}개**입니다.",
        "- 통합 완료 수치는 301 개수만으로 확정하지 않습니다.",
        "- 삭제는 Git 이력의 실제 D 상태만 우선 확정합니다.",
        "- 상세 경로와 커밋 증거는 JSON 보고서에 기록했습니다.",
    ]
    MD_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "articles"
REPORT_DIR = ROOT / "factory" / "QA"

BLUE_PATTERNS = {
    "brand-blue-var": r"--brand\s*:\s*#(?:1769ff|1457c9)",
    "blue-hex": r"#(?:1769ff|1457c9|0d6efd|2563eb|1d4ed8|dce8ff|eef4ff)",
    "blue-rgb": r"rgb\s*\(\s*(?:23\s*,\s*105\s*,\s*255|20\s*,\s*87\s*,\s*201)\s*\)",
    "old-hero-gradient": r"linear-gradient\([^)]*(?:#eef4ff|#dce8ff)",
    "old-badge": r"badge[^\n{]*\{[^}]*background\s*:\s*#dce8ff",
    "old-card-grid": r"\b(?:summary-grid|related-grid|topic-grid|topic-card|related-card|hero-actions)\b",
    "three-second-summary": r"3초\s*요약",
    "blue-logo-text": r"세이빙이오\(Savingio\)</a>|class=[\"']logo[\"'][^>]*>세이빙이오",
}

GENERIC_TEMPLATE_PATTERNS = {
    "generic-lead": r"단순한 요약보다 본인에게 적용되는 조건을 확인하고, 필요한 행동까지 바로 이어갈 수 있도록 구성했습니다",
    "generic-summary": r"대상과 적용 조건 확인합니다",
    "generic-faq": r"온라인으로만 확인해야 하나요\?",
}


def strip_scripts_styles(text: str) -> str:
    text = re.sub(r"<script\b[^>]*>.*?</script>", "", text, flags=re.I | re.S)
    return text


def visible_text(text: str) -> str:
    text = re.sub(r"<style\b[^>]*>.*?</style>", "", text, flags=re.I | re.S)
    text = re.sub(r"<script\b[^>]*>.*?</script>", "", text, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def get_h1(text: str) -> str:
    m = re.search(r"<h1[^>]*>(.*?)</h1>", text, re.I | re.S)
    return re.sub(r"<[^>]+>", "", m.group(1)).strip() if m else ""


def get_canonical(text: str) -> str:
    m = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', text, re.I)
    if not m:
        m = re.search(r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']canonical["\']', text, re.I)
    return m.group(1) if m else ""


def scan_article(path: Path) -> dict | None:
    text = path.read_text(encoding="utf-8", errors="ignore")
    reasons = [name for name, p in BLUE_PATTERNS.items() if re.search(p, text, re.I | re.S)]
    generic = [name for name, p in GENERIC_TEMPLATE_PATTERNS.items() if re.search(p, text, re.I | re.S)]
    if not reasons and not generic:
        return None
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "h1": get_h1(text),
        "canonical": get_canonical(text),
        "blue_reasons": reasons,
        "generic_template_reasons": generic,
        "bytes": path.stat().st_size,
        "visible_chars": len(visible_text(text)),
    }


def scan_missing_targets() -> list[dict]:
    missing = []
    pattern = re.compile(r'href=["\'](/articles/[^"\'#?]+)(?:\.html)?["\']', re.I)
    for source in [ROOT / "index.html", ROOT / "search.html", ROOT / "articles" / "index.html", ROOT / "data" / "savingio-brain-data.js", ROOT / "js" / "savingio-article-registry.js"]:
        if not source.exists():
            continue
        text = source.read_text(encoding="utf-8", errors="ignore")
        for href in pattern.findall(text):
            rel = href.lstrip("/")
            candidates = [ROOT / rel, ROOT / f"{rel}.html"]
            if not any(p.exists() for p in candidates):
                missing.append({"source": source.relative_to(ROOT).as_posix(), "href": href})
    seen = set()
    out = []
    for item in missing:
        key = (item["source"], item["href"])
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out


def main() -> None:
    rows = []
    scanned = 0
    for path in sorted(ARTICLES.glob("*.html")):
        if path.name == "index.html":
            continue
        scanned += 1
        item = scan_article(path)
        if item:
            rows.append(item)

    missing = scan_missing_targets()
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "audit": "blue-ui-generic-template-and-missing-article-links",
        "articles_scanned": scanned,
        "flagged_articles": len(rows),
        "missing_article_links": len(missing),
        "items": rows,
        "missing_links": missing,
    }
    (REPORT_DIR / "BLUE_UI_AND_404_AUDIT.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    lines = [
        "# Savingio 파란 UI·자동생성 템플릿·404 감사",
        "",
        f"- 검사 글: **{scanned}개**",
        f"- 파란 UI/구형 카드/자동생성 템플릿 의심: **{len(rows)}개**",
        f"- 검색·탐색 데이터의 존재하지 않는 글 링크: **{len(missing)}개**",
        "",
        "## 교체 대상",
        "",
        "| 번호 | 파일 | H1 | 파란 UI/구형 구조 | 자동생성 템플릿 | 본문 글자수 |",
        "|---:|---|---|---|---|---:|",
    ]
    for i, row in enumerate(rows, 1):
        h1 = (row["h1"] or "(H1 없음)").replace("|", "\\|")
        blue = ", ".join(row["blue_reasons"]) or "-"
        generic = ", ".join(row["generic_template_reasons"]) or "-"
        lines.append(f'| {i} | `{row["path"]}` | {h1} | {blue} | {generic} | {row["visible_chars"]} |')
    lines += ["", "## 존재하지 않는 글 링크", "", "| 원본 파일 | 잘못된 href |", "|---|---|"]
    for item in missing:
        lines.append(f'| `{item["source"]}` | `{item["href"]}` |')
    lines.append("")
    (REPORT_DIR / "BLUE_UI_AND_404_AUDIT.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"scanned": scanned, "flagged": len(rows), "missing": len(missing)}, ensure_ascii=False))


if __name__ == "__main__":
    main()

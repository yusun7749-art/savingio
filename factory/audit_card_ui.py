from __future__ import annotations

import json
import re
from pathlib import Path

AUDIT_VERSION = "2026-08-01.1"
ROOT = Path(__file__).resolve().parents[1]
TARGET_DIRS = [ROOT / "articles", ROOT / "topics"]
REPORT_DIR = ROOT / "factory" / "QA"

PATTERNS = {
    "summary-grid": r"\bsummary-grid\b",
    "topic-card": r"\btopic-card\b",
    "topic-grid": r"\btopic-grid\b",
    "related-grid": r"\brelated-grid\b",
    "related-card": r"\brelated-card\b",
    "generic-card-class": r'class=["\'][^"\']*\bcard\b',
    "hero-actions": r"\bhero-actions\b",
    "blue-old-brand": r"--brand\s*:\s*#1769ff|#1457c9|#dce8ff",
    "three-second-summary": r"3초\s*요약",
    "topic-stage": r"\btopic-stage\b",
    "topic-check": r"\btopic-check\b",
    "old-soft-card-css": r"\.card\s*,\s*\.notice\s*,\s*\.toc\s*,\s*\.check\s*\{",
}

EXCLUDE = {ROOT / "articles" / "index.html"}


def scan_file(path: Path) -> dict | None:
    text = path.read_text(encoding="utf-8", errors="ignore")
    reasons = [name for name, pattern in PATTERNS.items() if re.search(pattern, text, re.I)]
    if not reasons:
        return None
    h1 = ""
    match = re.search(r"<h1[^>]*>(.*?)</h1>", text, re.I | re.S)
    if match:
        h1 = re.sub(r"<[^>]+>", "", match.group(1)).strip()
    canonical = ""
    match = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', text, re.I)
    if not match:
        match = re.search(r'<link[^>]+href=["\']([^"\']+)["\'][^>]+rel=["\']canonical["\']', text, re.I)
    if match:
        canonical = match.group(1)
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "h1": h1,
        "canonical": canonical,
        "reasons": reasons,
        "bytes": path.stat().st_size,
    }


def main() -> None:
    rows: list[dict] = []
    scanned = 0
    for directory in TARGET_DIRS:
        if not directory.exists():
            continue
        for path in sorted(directory.glob("*.html")):
            if path in EXCLUDE:
                continue
            scanned += 1
            item = scan_file(path)
            if item:
                rows.append(item)

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "audit": "remaining-card-style-ui",
        "version": AUDIT_VERSION,
        "scanned_html": scanned,
        "flagged_html": len(rows),
        "rule": "본문 카드형 UI를 사용하지 않는 Savingio 글쓰기 헌법 기준",
        "items": rows,
    }
    (REPORT_DIR / "CARD_UI_AUDIT.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    lines = [
        "# Savingio 카드형 UI 잔존 감사",
        "",
        f"- 감사 버전: `{AUDIT_VERSION}`",
        f"- 검사 HTML: **{scanned}개**",
        f"- 카드형 UI 의심: **{len(rows)}개**",
        "- 범위: `articles/*.html`, `topics/*.html` (`articles/index.html` 제외)",
        "- 판정: 아래 파일은 본문 카드형 UI·구형 파란 템플릿 잔존 여부를 실제 확인하고 헌법형 본문으로 교체해야 합니다.",
        "",
        "| 번호 | 파일 | H1 | 감지 근거 |",
        "|---:|---|---|---|",
    ]
    for index, row in enumerate(rows, 1):
        title = row["h1"].replace("|", "\\|") or "(H1 없음)"
        reasons = ", ".join(row["reasons"])
        lines.append(f'| {index} | `{row["path"]}` | {title} | {reasons} |')
    lines.append("")
    (REPORT_DIR / "CARD_UI_AUDIT.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"scanned": scanned, "flagged": len(rows)}, ensure_ascii=False))


if __name__ == "__main__":
    main()

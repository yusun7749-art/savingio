from __future__ import annotations

import csv
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "articles"
OUT = ROOT / "factory" / "CONTENT_4200_AUDIT"
OUT.mkdir(parents=True, exist_ok=True)
MIN_CHARS = 4200
TAG_RE = re.compile(r"<[^>]+>")
SCRIPT_STYLE_RE = re.compile(r"<(script|style)\b[^>]*>.*?</\1>", re.I | re.S)
H1_RE = re.compile(r"<h1\b[^>]*>(.*?)</h1>", re.I | re.S)


def clean(raw: str) -> str:
    raw = SCRIPT_STYLE_RE.sub(" ", raw)
    raw = TAG_RE.sub(" ", raw)
    return re.sub(r"\s+", " ", html.unescape(raw)).strip()


def main() -> None:
    rows = []
    for path in sorted(ARTICLES.glob("*.html")):
        if path.name.lower() == "index.html":
            continue
        raw = path.read_text(encoding="utf-8", errors="replace")
        text = clean(raw)
        m = H1_RE.search(raw)
        h1 = clean(m.group(1)) if m else ""
        count = len(text)
        rows.append({
            "path": path.relative_to(ROOT).as_posix(),
            "h1": h1,
            "char_count": count,
            "needs_review": count < MIN_CHARS,
            "status": "재점검" if count < MIN_CHARS else "유지",
        })

    short = [r for r in rows if r["needs_review"]]
    payload = {
        "summary": {
            "article_count": len(rows),
            "minimum_characters": MIN_CHARS,
            "keep_4200_or_more": len(rows) - len(short),
            "review_under_4200": len(short),
        },
        "articles_under_4200": sorted(short, key=lambda r: (r["char_count"], r["path"])),
    }
    (OUT / "content-4200-audit.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    with (OUT / "content-4200-audit.csv").open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["path", "h1", "char_count", "status"])
        writer.writeheader()
        writer.writerows([{k: r[k] for k in writer.fieldnames} for r in payload["articles_under_4200"]])
    md = [
        "# Savingio 4,200자 기준 콘텐츠 감사", "",
        f"- 전체 글: **{len(rows)}개**",
        f"- 4,200자 이상 유지: **{len(rows)-len(short)}개**",
        f"- 4,200자 미만 재점검: **{len(short)}개**", "",
        "| 파일 | 글자수 | H1 | 판정 |", "|---|---:|---|---|",
    ]
    for r in payload["articles_under_4200"]:
        md.append(f"| `{r['path']}` | {r['char_count']:,} | {r['h1']} | 재점검 |")
    (OUT / "content-4200-audit.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print(json.dumps(payload["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "factory" / "QA" / "FULL_ADSENSE_STRUCTURE_AUDIT.json"
OUT_JSON = ROOT / "factory" / "QA" / "UI_REMEDIATION_QUEUE.json"
OUT_MD = ROOT / "factory" / "QA" / "UI_REMEDIATION_QUEUE.md"

payload = json.loads(REPORT.read_text(encoding="utf-8"))
rows = payload.get("article_problems", [])
blue = [r for r in rows if r.get("blue_reasons")]
card = [r for r in rows if r.get("card_reasons")]
dna = [r for r in rows if r.get("missing_dna")]

by_path = {}
for row in blue + card + dna:
    path = row["path"]
    by_path[path] = {
        "path": path,
        "h1": row.get("h1", ""),
        "blue_reasons": row.get("blue_reasons", []),
        "card_reasons": row.get("card_reasons", []),
        "missing_dna": row.get("missing_dna", []),
        "visible_chars": row.get("visible_chars", 0),
    }

queue = sorted(by_path.values(), key=lambda x: (
    0 if x["blue_reasons"] else 1,
    0 if x["card_reasons"] else 1,
    x["path"],
))

out = {
    "summary": {
        "blue_ui_pages": len(blue),
        "card_ui_pages": len(card),
        "dna_problem_pages": len(dna),
        "unique_pages_to_review": len(queue),
    },
    "queue": queue,
}
OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

lines = [
    "# Savingio UI 교체 작업 큐",
    "",
    f"- 파란 UI: **{len(blue)}개**",
    f"- 카드형 UI: **{len(card)}개**",
    f"- DNA 누락: **{len(dna)}개**",
    f"- 중복 제거 후 실제 검토 대상: **{len(queue)}개**",
    "",
    "| 순서 | 파일 | 파란 UI | 카드 UI | DNA 누락 | 본문 글자수 |",
    "|---:|---|---|---|---|---:|",
]
for i, row in enumerate(queue, 1):
    lines.append(
        f"| {i} | `{row['path']}` | {', '.join(row['blue_reasons']) or '-'} | "
        f"{', '.join(row['card_reasons']) or '-'} | {', '.join(row['missing_dna']) or '-'} | {row['visible_chars']} |"
    )
OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(json.dumps(out["summary"], ensure_ascii=False))

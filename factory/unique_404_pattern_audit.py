#!/usr/bin/env python3
"""Summarize repeated LIVE_404 targets from the second-stage link audit."""

from __future__ import annotations

import csv
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "factory" / "SECOND_LINK_AUDIT" / "second-link-audit.json"
OUT_DIR = ROOT / "factory" / "UNIQUE_404_PATTERN_AUDIT"
OUT_JSON = OUT_DIR / "unique-404-pattern-audit.json"
OUT_CSV = OUT_DIR / "unique-404-pattern-audit.csv"
OUT_MD = OUT_DIR / "unique-404-pattern-audit.md"


def target_type(path: str) -> str:
    if path.startswith("/articles/"):
        return "article"
    if path.startswith("/categories/"):
        return "category"
    if path.startswith("/calculators/"):
        return "calculator"
    return "other"


def main() -> None:
    if not INPUT.exists():
        raise SystemExit(f"Missing input: {INPUT}")

    data = json.loads(INPUT.read_text(encoding="utf-8"))
    rows = data.get("actual_404", [])

    counts: Counter[str] = Counter()
    sources: dict[str, set[str]] = defaultdict(set)
    hrefs: dict[str, set[str]] = defaultdict(set)

    for row in rows:
        path = row.get("normalized_path") or row.get("href") or ""
        if not path:
            continue
        counts[path] += 1
        sources[path].add(row.get("source", ""))
        hrefs[path].add(row.get("href", ""))

    ranked = []
    for path, reference_count in counts.most_common():
        ranked.append(
            {
                "normalized_path": path,
                "target_type": target_type(path),
                "reference_count": reference_count,
                "article_count": len({s for s in sources[path] if s}),
                "source_articles": sorted(s for s in sources[path] if s),
                "original_hrefs": sorted(h for h in hrefs[path] if h),
            }
        )

    type_summary = Counter(item["target_type"] for item in ranked)
    type_reference_summary = Counter()
    for item in ranked:
        type_reference_summary[item["target_type"]] += item["reference_count"]

    summary = {
        "actual_404_references": len(rows),
        "unique_404_targets": len(ranked),
        "affected_articles": len({row.get("source") for row in rows if row.get("source")}),
        "repeated_targets": sum(1 for item in ranked if item["reference_count"] > 1),
        "single_use_targets": sum(1 for item in ranked if item["reference_count"] == 1),
        "unique_targets_by_type": dict(sorted(type_summary.items())),
        "references_by_type": dict(sorted(type_reference_summary.items())),
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(
        json.dumps({"summary": summary, "targets": ranked}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as fp:
        writer = csv.writer(fp)
        writer.writerow(
            [
                "normalized_path",
                "target_type",
                "reference_count",
                "article_count",
                "source_articles",
            ]
        )
        for item in ranked:
            writer.writerow(
                [
                    item["normalized_path"],
                    item["target_type"],
                    item["reference_count"],
                    item["article_count"],
                    " | ".join(item["source_articles"]),
                ]
            )

    lines = [
        "# Savingio 404 반복 패턴 감사",
        "",
        f"- 실제 404 참조: **{summary['actual_404_references']}개**",
        f"- 서로 다른 404 주소: **{summary['unique_404_targets']}개**",
        f"- 영향 글: **{summary['affected_articles']}개**",
        f"- 2회 이상 반복 주소: **{summary['repeated_targets']}개**",
        f"- 1회만 사용된 주소: **{summary['single_use_targets']}개**",
        "",
        "## 유형별 요약",
        "",
        "| 유형 | 서로 다른 주소 | 총 참조 수 |",
        "|---|---:|---:|",
    ]
    for kind in ("article", "category", "calculator", "other"):
        lines.append(
            f"| {kind} | {summary['unique_targets_by_type'].get(kind, 0)} | "
            f"{summary['references_by_type'].get(kind, 0)} |"
        )

    lines.extend(
        [
            "",
            "## 반복 빈도 순",
            "",
            "| 순위 | 404 주소 | 유형 | 참조 수 | 영향 글 수 |",
            "|---:|---|---|---:|---:|",
        ]
    )
    for index, item in enumerate(ranked, 1):
        lines.append(
            f"| {index} | `{item['normalized_path']}` | {item['target_type']} | "
            f"{item['reference_count']} | {item['article_count']} |"
        )

    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

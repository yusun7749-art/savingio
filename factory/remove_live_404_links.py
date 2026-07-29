#!/usr/bin/env python3
"""Remove verified LIVE_404 anchor links while preserving their visible content.

The script reads the second-stage audit report, groups exact href values by source
HTML file, and unwraps only matching <a>...</a> elements. It does not delete
articles, headings, paragraphs, cards, or visible link text.
"""

from __future__ import annotations

import html
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "factory" / "SECOND_LINK_AUDIT" / "second-link-audit.json"
OUT_DIR = ROOT / "factory" / "REMOVE_404_LINKS"
OUT_JSON = OUT_DIR / "remove-404-links.json"
OUT_MD = OUT_DIR / "remove-404-links.md"

ANCHOR_RE = re.compile(r"<a\b(?P<attrs>[^>]*)>(?P<body>.*?)</a\s*>", re.IGNORECASE | re.DOTALL)
HREF_RE = re.compile(
    r"\bhref\s*=\s*(?:(?P<dq>\"[^\"]*\")|(?P<sq>'[^']*')|(?P<bare>[^\s>]+))",
    re.IGNORECASE | re.DOTALL,
)


def extract_href(attrs: str) -> str | None:
    match = HREF_RE.search(attrs)
    if not match:
        return None
    value = match.group("dq") or match.group("sq") or match.group("bare") or ""
    if len(value) >= 2 and value[0] in "\"'" and value[-1] == value[0]:
        value = value[1:-1]
    return html.unescape(value.strip())


def main() -> None:
    if not INPUT.exists():
        raise SystemExit(f"Missing input: {INPUT}")

    data = json.loads(INPUT.read_text(encoding="utf-8"))
    rows = [row for row in data.get("actual_404", []) if row.get("classification") == "LIVE_404"]

    hrefs_by_source: dict[str, set[str]] = defaultdict(set)
    for row in rows:
        source = str(row.get("source") or "").strip()
        href = html.unescape(str(row.get("href") or "").strip())
        if source and href:
            hrefs_by_source[source].add(href)

    changed_files: list[dict[str, object]] = []
    removed_total = 0
    unmatched: list[dict[str, str]] = []

    for source, targets in sorted(hrefs_by_source.items()):
        path = ROOT / source
        if not path.exists():
            for href in sorted(targets):
                unmatched.append({"source": source, "href": href, "reason": "source_missing"})
            continue

        original = path.read_text(encoding="utf-8")
        removed_hrefs: list[str] = []

        def replace_anchor(match: re.Match[str]) -> str:
            href = extract_href(match.group("attrs"))
            if href is not None and href in targets:
                removed_hrefs.append(href)
                return match.group("body")
            return match.group(0)

        updated = ANCHOR_RE.sub(replace_anchor, original)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            removed_total += len(removed_hrefs)
            changed_files.append(
                {
                    "source": source,
                    "removed_count": len(removed_hrefs),
                    "removed_hrefs": sorted(removed_hrefs),
                }
            )

        found = set(removed_hrefs)
        for href in sorted(targets - found):
            unmatched.append({"source": source, "href": href, "reason": "anchor_not_found"})

    summary = {
        "verified_404_references_input": len(rows),
        "affected_source_files_input": len(hrefs_by_source),
        "changed_files": len(changed_files),
        "removed_anchor_links": removed_total,
        "unmatched_references": len(unmatched),
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(
        json.dumps(
            {"summary": summary, "changed_files": changed_files, "unmatched": unmatched},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    lines = [
        "# Savingio 검증된 404 링크 제거 결과",
        "",
        f"- 입력된 실제 404 참조: **{summary['verified_404_references_input']}개**",
        f"- 입력 영향 파일: **{summary['affected_source_files_input']}개**",
        f"- 실제 수정 파일: **{summary['changed_files']}개**",
        f"- 제거한 앵커 링크: **{summary['removed_anchor_links']}개**",
        f"- 미일치 참조: **{summary['unmatched_references']}개**",
        "",
        "## 수정 파일",
        "",
        "| 파일 | 제거 수 |",
        "|---|---:|",
    ]
    for item in changed_files:
        lines.append(f"| `{item['source']}` | {item['removed_count']} |")

    if unmatched:
        lines.extend(["", "## 미일치 항목", "", "| 파일 | href | 사유 |", "|---|---|---|"])
        for item in unmatched:
            lines.append(f"| `{item['source']}` | `{item['href']}` | {item['reason']} |")

    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    if unmatched:
        raise SystemExit("Some verified 404 references were not matched; review report before claiming PASS.")


if __name__ == "__main__":
    main()

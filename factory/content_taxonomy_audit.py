#!/usr/bin/env python3
"""Audit Savingio navigation labels against the articles they contain.

A navigation label may only be shown when the article beneath it matches the
label. The audit writes both a human review report and a browser-consumable
exclusion list so Explorer never exposes known mismatches or malformed links.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data" / "savingio-brain-data.js"
REPORT_FILE = ROOT / "factory" / "CONTENT_TAXONOMY_REPORT.json"
EXCLUSIONS_FILE = ROOT / "data" / "savingio-navigation-exclusions.json"

PREFIX = "window.SAVINGIO_BRAIN_DATA="

STAGE_TERMS: dict[str, tuple[str, ...]] = {
    "처음 확인하기": ("확인", "가이드", "원인", "기본", "처음"),
    "계산하기": ("계산", "예상", "금액", "얼마"),
    "신청하기": ("신청", "접수", "등록"),
    "받기": ("받", "수령", "지급", "환급"),
    "줄이기": ("절약", "줄이", "낮추", "아끼"),
    "비교하기": ("비교", "차이", "선택"),
    "준비하기": ("준비", "서류", "조건", "자격"),
}

CORRUPT_HREF_PATTERNS = (
    re.compile(r"tokens?%20truncated", re.I),
    re.compile(r"tokens?\s+truncated", re.I),
    re.compile(r"\.\.\."),
    re.compile(r"[\r\n\t]"),
    re.compile(r"^https?://savingio\.com/https?://", re.I),
)
VALID_NAV_HREF = re.compile(r"^/(?:articles|calculators)/[a-z0-9][a-z0-9-]*(?:\.html)?$", re.I)


def load_data() -> dict[str, Any]:
    raw = DATA_FILE.read_text(encoding="utf-8").strip()
    if not raw.startswith(PREFIX):
        raise ValueError(f"Unexpected data prefix in {DATA_FILE}")
    payload = raw[len(PREFIX):]
    if payload.endswith(";"):
        payload = payload[:-1]
    return json.loads(payload)


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def label_keywords(label: str) -> list[str]:
    cleaned = re.sub(r"[·/()\[\]{}]", " ", label)
    cleaned = re.sub(r"(?:하기|알기|이해|확인|방법|기준|관리)$", "", cleaned)
    return [token for token in re.split(r"\s+", cleaned) if len(token) >= 2]


def item_text(item: dict[str, Any]) -> str:
    return normalize(" ".join([
        str(item.get("title", "")),
        str(item.get("search_keywords", "")),
    ]))


def has_corrupt_href(href: str) -> bool:
    if not href or not href.startswith("/"):
        return True
    if len(href) > 240:
        return True
    return any(pattern.search(href) for pattern in CORRUPT_HREF_PATTERNS)


def audit() -> tuple[dict[str, Any], dict[str, Any]]:
    data = load_data()
    tree = data.get("tree", {})
    issues: list[dict[str, Any]] = []
    exclusions: dict[str, dict[str, str]] = {}
    counts = {
        "large_groups": 0,
        "topics": 0,
        "subgroups": 0,
        "items": 0,
        "misaligned_labels": 0,
        "corrupt_hrefs": 0,
        "excluded_navigation_items": 0,
    }

    for large_label, topics in tree.items():
        counts["large_groups"] += 1
        if not isinstance(topics, dict):
            continue
        for topic_label, subgroups in topics.items():
            counts["topics"] += 1
            if not isinstance(subgroups, dict):
                continue
            for subgroup_label, items in subgroups.items():
                counts["subgroups"] += 1
                if not isinstance(items, list):
                    continue

                subgroup_keywords = label_keywords(subgroup_label)
                stage_terms = STAGE_TERMS.get(subgroup_label)

                for item in items:
                    if not isinstance(item, dict):
                        continue
                    counts["items"] += 1
                    title = normalize(str(item.get("title", "")))
                    href = normalize(str(item.get("href", "")))
                    text = item_text(item)
                    path = f"{large_label} > {topic_label} > {subgroup_label}"

                    corrupt = has_corrupt_href(href)
                    if corrupt:
                        counts["corrupt_hrefs"] += 1
                        issues.append({
                            "type": "corrupt_href",
                            "path": path,
                            "title": title,
                            "href": href,
                            "severity": "blocking",
                        })

                    aligned = True
                    reason = ""
                    if stage_terms:
                        aligned = any(term in text for term in stage_terms)
                        if not aligned:
                            reason = f"stage label requires one of: {', '.join(stage_terms)}"
                    elif subgroup_keywords:
                        aligned = any(keyword in text for keyword in subgroup_keywords)
                        if not aligned:
                            reason = f"label terms absent from article: {', '.join(subgroup_keywords)}"

                    if not aligned:
                        counts["misaligned_labels"] += 1
                        issues.append({
                            "type": "label_content_mismatch",
                            "path": path,
                            "title": title,
                            "href": href,
                            "reason": reason,
                            "severity": "review",
                        })
                        if VALID_NAV_HREF.fullmatch(href):
                            exclusions[href] = {
                                "title": title,
                                "path": path,
                                "reason": reason,
                            }

    counts["excluded_navigation_items"] = len(exclusions)
    status = "FAIL" if counts["corrupt_hrefs"] else "REVIEW" if counts["misaligned_labels"] else "PASS"
    report = {
        "status": status,
        "principle": "A navigation label may only be shown when every contained article matches that label.",
        "source": str(DATA_FILE.relative_to(ROOT)),
        "counts": counts,
        "issues": issues,
    }
    exclusion_payload = {
        "version": 1,
        "generated_by": "factory/content_taxonomy_audit.py",
        "principle": report["principle"],
        "excluded_paths": sorted(exclusions),
        "details": exclusions,
    }
    return report, exclusion_payload


def main() -> int:
    report, exclusion_payload = audit()
    REPORT_FILE.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    EXCLUSIONS_FILE.write_text(json.dumps(exclusion_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["counts"], ensure_ascii=False))
    return 1 if report["counts"]["corrupt_hrefs"] else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        REPORT_FILE.write_text(
            json.dumps({"status": "ERROR", "error": str(exc)}, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"taxonomy audit failed: {exc}", file=sys.stderr)
        raise

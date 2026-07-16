from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Iterable

REQUIRED_PATHS = (
    "factory/config",
    "factory/output",
    "factory/state",
    "articles",
    "calculators",
    "index.html",
    "ads.txt",
)


def _publisher_ids(text: str) -> set[str]:
    import re
    return set(re.findall(r"(?:ca-)?pub-\d{16}", text))


def run_preflight(project_root: Path, expected_publisher: str = "pub-7605193583747751") -> dict:
    root = project_root.resolve()
    missing = [rel for rel in REQUIRED_PATHS if not (root / rel).exists()]
    issues: list[str] = []
    if missing:
        issues.extend(f"missing:{item}" for item in missing)

    publisher_files: list[str] = []
    wrong_publishers: dict[str, list[str]] = {}
    scan_suffixes = {".html", ".js", ".py", ".json", ".txt", ".md"}
    ignored_dirs = {".git", "__pycache__", "history", "backups", "backup", "node_modules"}
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in scan_suffixes:
            continue
        if any(part in ignored_dirs for part in path.parts):
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        ids = _publisher_ids(text)
        if not ids:
            continue
        rel = path.relative_to(root).as_posix()
        publisher_files.append(rel)
        bad = sorted(pid for pid in ids if pid.replace("ca-", "") != expected_publisher)
        if bad:
            wrong_publishers[rel] = bad

    if wrong_publishers:
        issues.append("publisher_lock_violation")

    config_ok = (root / "factory/config/article_dna.json").is_file()
    if not config_ok:
        issues.append("missing:factory/config/article_dna.json")

    report = {
        "pass": not issues,
        "project_root": str(root),
        "python": sys.version.split()[0],
        "missing": missing,
        "publisher": {
            "expected": expected_publisher,
            "files_checked_with_ids": len(publisher_files),
            "wrong": wrong_publishers,
        },
        "issues": issues,
    }
    out = root / "factory/output/preflight_report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report

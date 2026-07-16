from __future__ import annotations

import argparse
import json
from pathlib import Path

from .core_automation import reset_core_automation, run_core_automation


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Savingio Factory Core Automation V3.008")
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--count", type=int, default=1)
    parser.add_argument("--topic", action="append", default=[])
    parser.add_argument("--evidence", type=Path, action="append", default=[])
    parser.add_argument("--no-resume", action="store_true")
    parser.add_argument("--non-strict", action="store_true")
    parser.add_argument("--reset", action="store_true")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    root = args.root.resolve()
    if args.reset:
        reset_core_automation(root)
    report = run_core_automation(
        root,
        count=args.count,
        topics=args.topic,
        evidence_files=args.evidence,
        resume=not args.no_resume,
        strict=not args.non_strict,
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report.get("pass") else 1


if __name__ == "__main__":
    raise SystemExit(main())

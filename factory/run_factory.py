from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .factory_brain import read_topics_file, run_factory_brain
from .preflight import run_preflight


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Savingio Factory one-command automation runner")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--topic", help="single topic")
    source.add_argument("--topics-file", type=Path, help="txt/json topic list")
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    parser.add_argument("--evidence", type=Path, action="append", default=[])
    parser.add_argument("--continue-on-block", action="store_true")
    parser.add_argument("--skip-preflight", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    root = args.project_root.resolve()

    if not args.skip_preflight:
        preflight = run_preflight(root)
        if not preflight["pass"]:
            print(json.dumps({"status": "preflight_failed", "preflight": preflight}, ensure_ascii=False, indent=2))
            return 2

    topics = [args.topic] if args.topic else read_topics_file(args.topics_file)
    report = run_factory_brain(
        root,
        topics,
        evidence_files=args.evidence,
        stop_on_block=not args.continue_on_block,
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report.get("status") == "waiting_user_approval" else 3


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .automation_program import AutomationOptions, FactoryAutomationProgram
from .pipeline import execute


def _print(payload) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2, default=str))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="savingio-factory")
    parser.add_argument("--project-root", default=".")
    sub = parser.add_subparsers(dest="command", required=True)

    single = sub.add_parser("run", help="Run one topic through the Factory pipeline")
    single.add_argument("topic")
    single.add_argument("--publish", action="store_true")
    single.add_argument("--overwrite", action="store_true")
    single.add_argument("--no-stage", action="store_true")

    plan = sub.add_parser("plan", help="Create plans without writing articles")
    plan.add_argument("topics", nargs="*")
    plan.add_argument("--topics-file")

    batch = sub.add_parser("batch", help="Run many topics with resume checkpoint")
    batch.add_argument("topics", nargs="*")
    batch.add_argument("--topics-file")
    batch.add_argument("--publish", action="store_true")
    batch.add_argument("--overwrite", action="store_true")
    batch.add_argument("--stop-on-error", action="store_true")
    batch.add_argument("--max-items", type=int, default=100)
    batch.add_argument("--reset-checkpoint", action="store_true")

    queue = sub.add_parser("queue", help="Add topics to the persistent queue")
    queue.add_argument("topics", nargs="*")
    queue.add_argument("--topics-file")
    queue.add_argument("--priority", type=int, default=50)

    run_queue = sub.add_parser("run-queue", help="Drain the persistent queue")
    run_queue.add_argument("--publish", action="store_true")
    run_queue.add_argument("--max-items", type=int, default=100)

    brain_expand = sub.add_parser("brain-expand", help="Expand major life-money categories into a connected topic queue")
    brain_expand.add_argument("categories", nargs="*")

    core_run = sub.add_parser("core-run", help="Run the official Manager -> Executor factory pipeline")
    core_run.add_argument("topics", nargs="+")
    core_run.add_argument(
        "--evidence",
        type=Path,
        action="append",
        default=[],
        help="Research evidence JSON file (repeat for multiple files)",
    )
    core_run.add_argument("--limit", type=int)
    core_run.add_argument("--no-resume", action="store_true")

    sub.add_parser("preflight", help="Validate the Factory project before execution")
    sub.add_parser("reset-checkpoint", help="Clear completed batch topic checkpoint")
    return parser


def _topics(program: FactoryAutomationProgram, args) -> list[str]:
    topics = list(getattr(args, "topics", []) or [])
    if getattr(args, "topics_file", None):
        topics.extend(program.topics_from_file(Path(args.topics_file)))
    return program.normalize_topics(topics)


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    root = Path(args.project_root).resolve()
    program = FactoryAutomationProgram(root)

    if args.command == "preflight":
        result = program.preflight()
        _print(result)
        return 0 if result["pass"] else 2
    if args.command == "reset-checkpoint":
        program.reset_checkpoint()
        _print({"status": "checkpoint_reset"})
        return 0
    if args.command == "run":
        result = execute(
            args.topic,
            root,
            publish=args.publish,
            overwrite=args.overwrite,
            stage=not args.no_stage,
        )
        _print(result)
        return 0 if (result.get("qa") or {}).get("pass") else 3
    if args.command == "plan":
        topics = _topics(program, args)
        if not topics:
            raise SystemExit("At least one topic or --topics-file is required.")
        _print(program.plan(topics))
        return 0
    if args.command == "queue":
        topics = _topics(program, args)
        if not topics:
            raise SystemExit("At least one topic or --topics-file is required.")
        _print(program.enqueue(topics, priority=args.priority))
        return 0
    if args.command == "batch":
        topics = _topics(program, args)
        if not topics:
            raise SystemExit("At least one topic or --topics-file is required.")
        if args.reset_checkpoint:
            program.reset_checkpoint()
        result = program.run_batch(topics, AutomationOptions(
            publish=args.publish,
            overwrite=args.overwrite,
            continue_on_error=not args.stop_on_error,
            max_items=args.max_items,
        ))
        _print(result)
        return 0 if result["failed"] == 0 else 4
    if args.command == "run-queue":
        result = program.run_queue(AutomationOptions(
            publish=args.publish,
            max_items=args.max_items,
        ))
        _print(result)
        return 0
    if args.command == "brain-expand":
        from .topic_graph import expand_topics
        result = expand_topics(root, args.categories)
        _print(result)
        return 0 if result.get("pass") else 6
    if args.command == "core-run":
        from .factory_core_runner import run_factory_core

        limit = args.limit if args.limit is not None else len(args.topics)
        evidence_files = [
            path if path.is_absolute() else root / path
            for path in args.evidence
        ]
        result = run_factory_core(
            root,
            count=limit,
            resume=not args.no_resume,
            topics=args.topics,
            evidence_files=evidence_files or None,
        )
        _print(result)
        return 0 if result.get("pass") else 5
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

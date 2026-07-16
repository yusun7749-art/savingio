from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable, Mapping

from .calculator_hq_batch import run_calculator_batch
from .cms_hq import run_cms_queue
from .image_hq import run_image_queue
from .planning_hq import create_plan
from .qa1_hq import run_qa1_queue
from .qa2_hq import run_qa2_queue
from .research_hq import run_research_queue
from .seo_hq import run_seo_queue
from .utils import now_iso, save_json
from .writer_hq import run_writer_queue

STATE_PATH = Path("factory/output/automation/core_automation_state.json")
REPORT_PATH = Path("factory/output/automation/core_automation_report.json")


@dataclass(frozen=True)
class Stage:
    name: str
    department: str
    runner: Callable[..., dict]


DEFAULT_STAGES: tuple[Stage, ...] = (
    Stage("planning", "기획본부", create_plan),
    Stage("research", "조사본부", run_research_queue),
    Stage("writer", "작가본부", run_writer_queue),
    Stage("seo", "SEO본부", run_seo_queue),
    Stage("calculator", "Calculator HQ", run_calculator_batch),
    Stage("image", "이미지본부", run_image_queue),
    Stage("qa1", "QA1본부", run_qa1_queue),
    Stage("qa2", "QA2본부", run_qa2_queue),
    Stage("cms", "CMS본부", run_cms_queue),
)


def _new_state(count: int, topics: list[str] | None) -> dict:
    return {
        "version": "3.009",
        "status": "ready",
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "requested_count": count,
        "topics": topics or [],
        "current_stage": None,
        "completed_stages": [],
        "failed_stage": None,
        "stage_results": {},
    }


def _load_state(root: Path) -> dict | None:
    path = root / STATE_PATH
    if not path.is_file():
        return None
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload if isinstance(payload, dict) else None


def _write_state(root: Path, state: dict) -> None:
    state["updated_at"] = now_iso()
    save_json(root / STATE_PATH, state)


def _run_stage(stage: Stage, root: Path, count: int, topics: list[str] | None, limit: int | None) -> dict:
    if stage.name == "planning":
        return stage.runner(root, count=count, topics=topics)
    if stage.name == "research":
        return stage.runner(root, limit=limit)
    return stage.runner(root, limit=limit)


def run_factory_core(
    root: Path,
    count: int = 1,
    topics: Iterable[str] | None = None,
    limit: int | None = None,
    resume: bool = True,
    stages: Iterable[Stage] = DEFAULT_STAGES,
) -> dict:
    """Run the full internal Factory chain with durable checkpoints.

    The function intentionally stops at CMS. Git, Cloudflare, AdSense and
    publishing remain outside this core automation gate.
    """
    root = root.resolve()
    if count < 1:
        raise ValueError("count must be at least 1")
    if limit is not None and limit < 1:
        raise ValueError("limit must be at least 1")

    topic_list = [str(item).strip() for item in topics or [] if str(item).strip()]
    state = _load_state(root) if resume else None
    if not state or state.get("status") == "completed":
        state = _new_state(count, topic_list)

    completed = set(str(name) for name in state.get("completed_stages", []))
    state["status"] = "running"
    _write_state(root, state)

    stage_list = tuple(stages)
    try:
        for stage in stage_list:
            if resume and stage.name in completed:
                continue
            state["current_stage"] = stage.name
            state["failed_stage"] = None
            _write_state(root, state)

            result = _run_stage(stage, root, count, topic_list or None, limit)
            if not isinstance(result, dict):
                raise TypeError(f"{stage.name} result must be a dict")
            if result.get("pass") is False:
                raise RuntimeError(f"{stage.department} pass=false")

            summary = {
                "department": stage.department,
                "status": result.get("status", "completed"),
                "pass": result.get("pass", True),
                "completed_count": result.get("completed_count", result.get("selected_count")),
                "failed_count": result.get("failed_count", 0),
                "finished_at": now_iso(),
            }
            state["stage_results"][stage.name] = summary
            if stage.name not in state["completed_stages"]:
                state["completed_stages"].append(stage.name)
            _write_state(root, state)

        state["status"] = "completed"
        state["current_stage"] = None
        state["completed_at"] = now_iso()
        state["pass"] = len(state["completed_stages"]) == len(stage_list)
        _write_state(root, state)
    except Exception as exc:
        state["status"] = "failed"
        state["failed_stage"] = state.get("current_stage")
        state["error"] = f"{type(exc).__name__}: {exc}"
        state["pass"] = False
        _write_state(root, state)

    report = {
        "factory_version": state.get("version"),
        "status": state.get("status"),
        "pass": bool(state.get("pass")),
        "requested_count": state.get("requested_count"),
        "completed_stage_count": len(state.get("completed_stages", [])),
        "total_stage_count": len(stage_list),
        "completed_stages": state.get("completed_stages", []),
        "failed_stage": state.get("failed_stage"),
        "error": state.get("error"),
        "state_path": STATE_PATH.as_posix(),
        "created_at": now_iso(),
    }
    save_json(root / REPORT_PATH, report)
    return report


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Savingio Factory Core Automation")
    parser.add_argument("--project-root", default=".")
    parser.add_argument("--count", type=int, default=1)
    parser.add_argument("--topic", action="append", dest="topics")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--fresh", action="store_true", help="ignore previous checkpoint")
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    report = run_factory_core(
        Path(args.project_root),
        count=args.count,
        topics=args.topics,
        limit=args.limit,
        resume=not args.fresh,
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report.get("pass") else 1


if __name__ == "__main__":
    raise SystemExit(main())

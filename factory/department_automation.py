from __future__ import annotations

import argparse
import json
import traceback
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable

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

STATE_PATH = Path("factory/state/department_automation.json")
REPORT_PATH = Path("factory/output/department_automation_report.json")


@dataclass(frozen=True, init=False)
class Stage:
    name: str
    department: str
    runner: Callable[..., dict]

    def __init__(self, name: str, department_or_runner, runner: Callable[..., dict] | None = None):
        # Backward compatible with both Stage(name, runner) and
        # Stage(name, department, runner).
        object.__setattr__(self, "name", str(name))
        if runner is None:
            if not callable(department_or_runner):
                raise TypeError("Stage(name, runner) requires a callable runner")
            object.__setattr__(self, "department", str(name))
            object.__setattr__(self, "runner", department_or_runner)
        else:
            if not callable(runner):
                raise TypeError("Stage runner must be callable")
            object.__setattr__(self, "department", str(department_or_runner))
            object.__setattr__(self, "runner", runner)



class DepartmentAutomation:
    """Checkpointed department runner used by the Factory and legacy callers.

    This compatibility engine keeps the original item-passing contract while the
    newer ``run_department_automation`` function drives queue-based departments.
    Both APIs persist to the same state/report paths.
    """

    def __init__(self, project_root: Path, count: int, items: list[dict] | None = None):
        self.project_root = Path(project_root).resolve()
        self.count = int(count)
        if self.count < 1:
            raise ValueError("count must be at least 1")
        self.items = list(items or [{} for _ in range(self.count)])

    def _stages(self) -> list[Stage]:
        root = self.project_root
        count = self.count
        topics = [str(item.get("topic", "")).strip() for item in self.items if isinstance(item, dict)]
        topics = [topic for topic in topics if topic]
        if not topics:
            topics = [f"factory-topic-{index + 1}" for index in range(count)]

        def planning(_items):
            return create_plan(root, count=count, topics=topics)

        return [
            Stage("planning", "기획본부", planning),
            Stage("research", "조사본부", lambda _items: run_research_queue(root, limit=count)),
            Stage("writing", "작가본부", lambda _items: run_writer_queue(root, limit=count)),
            Stage("seo", "SEO본부", lambda _items: run_seo_queue(root, limit=count)),
            Stage("calculator_hq", "Calculator HQ", lambda _items: run_calculator_batch(root, limit=count)),
            Stage("image", "이미지본부", lambda _items: run_image_queue(root, limit=count)),
            Stage("qa1", "QA1본부", lambda _items: run_qa1_queue(root, limit=count)),
            Stage("qa2", "QA2본부", lambda _items: run_qa2_queue(root, limit=count)),
            Stage("cms", "CMS본부", lambda _items: run_cms_queue(root, limit=count)),
        ]

    @staticmethod
    def _verified(result: dict) -> bool:
        if not isinstance(result, dict) or result.get("pass") is not True:
            return False
        if int(result.get("failed_count", 0) or 0) > 0:
            return False
        return True

    def _load_legacy_state(self) -> dict:
        path = self.project_root / STATE_PATH
        if not path.is_file():
            return {}
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            return payload if isinstance(payload, dict) else {}
        except (OSError, json.JSONDecodeError):
            return {}

    def run(self, *, resume: bool = False) -> dict:
        prior = self._load_legacy_state() if resume else {}
        completed = list(prior.get("completed_stages", [])) if isinstance(prior.get("completed_stages", []), list) else []
        stage_results = dict(prior.get("stage_results", {})) if isinstance(prior.get("stage_results", {}), dict) else {}
        skipped: list[str] = []
        current_items = list(self.items)
        state = {
            "version": 1,
            "status": "running",
            "count": self.count,
            "completed_stages": completed,
            "stage_results": stage_results,
            "updated_at": now_iso(),
        }
        save_json(self.project_root / STATE_PATH, state)

        for stage in self._stages():
            if resume and stage.name in completed and self._verified(stage_results.get(stage.name, {})):
                skipped.append(stage.name)
                items = stage_results.get(stage.name, {}).get("items")
                if isinstance(items, list):
                    current_items = items
                continue
            try:
                result = stage.runner(current_items)
                if not self._verified(result):
                    raise RuntimeError(f"{stage.name} result verification failed")
                stage_results[stage.name] = result
                if stage.name not in completed:
                    completed.append(stage.name)
                items = result.get("items")
                if isinstance(items, list):
                    current_items = items
                state.update({
                    "status": "running",
                    "completed_stages": completed,
                    "stage_results": stage_results,
                    "updated_at": now_iso(),
                })
                save_json(self.project_root / STATE_PATH, state)
            except Exception as exc:
                failure = {
                    "stage": stage.name,
                    "department": stage.department,
                    "error": f"{type(exc).__name__}: {exc}",
                    "traceback": traceback.format_exc(),
                }
                state.update({
                    "status": "failed",
                    "completed_stages": completed,
                    "stage_results": stage_results,
                    "failure": failure,
                    "updated_at": now_iso(),
                })
                save_json(self.project_root / STATE_PATH, state)
                report = {**state, "pass": False, "skipped_stages": skipped}
                save_json(self.project_root / REPORT_PATH, report)
                return report

        state.update({
            "status": "completed",
            "completed_stages": completed,
            "stage_results": stage_results,
            "completed_at": now_iso(),
            "updated_at": now_iso(),
        })
        save_json(self.project_root / STATE_PATH, state)
        report = {**state, "pass": True, "skipped_stages": skipped, "items": current_items}
        save_json(self.project_root / REPORT_PATH, report)
        return report

def _planning_runner(topics: list[str], count: int) -> Callable[[Path, int | None], dict]:
    def run(root: Path, _limit: int | None = None) -> dict:
        return create_plan(root, count=count, topics=topics)
    return run


PIPELINE_STAGES: tuple[Stage, ...] = (
    Stage("research", "조사본부", lambda root, limit: run_research_queue(root, limit=limit)),
    Stage("writer", "작가본부", lambda root, limit: run_writer_queue(root, limit=limit)),
    Stage("seo", "SEO본부", lambda root, limit: run_seo_queue(root, limit=limit)),
    Stage("calculator", "Calculator HQ", lambda root, limit: run_calculator_batch(root, limit=limit)),
    Stage("image", "이미지본부", lambda root, limit: run_image_queue(root, limit=limit)),
    Stage("qa1", "QA1본부", lambda root, limit: run_qa1_queue(root, limit=limit)),
    Stage("qa2", "QA2본부", lambda root, limit: run_qa2_queue(root, limit=limit)),
    Stage("cms", "CMS본부", lambda root, limit: run_cms_queue(root, limit=limit)),
)


def _new_state(topics: list[str], count: int) -> dict:
    return {
        "version": "3.013",
        "status": "running",
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "topics": topics,
        "count": count,
        "current_stage": "planning",
        "completed_stages": [],
        "failed_stage": None,
        "stages": {},
    }


def _load_state(root: Path) -> dict | None:
    path = root / STATE_PATH
    if not path.is_file():
        return None
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload if isinstance(payload, dict) else None


def _save_state(root: Path, state: dict) -> None:
    state["updated_at"] = now_iso()
    save_json(root / STATE_PATH, state)


def _stage_passed(result: dict) -> bool:
    return bool(result.get("pass")) and int(result.get("failed_count", 0) or 0) == 0


def _record_success(root: Path, state: dict, stage: Stage, result: dict) -> None:
    state["stages"][stage.name] = {
        "department": stage.department,
        "status": "completed",
        "completed_at": now_iso(),
        "requested": result.get("requested"),
        "completed_count": result.get("completed_count", result.get("selected_count")),
        "failed_count": result.get("failed_count", 0),
        "pass": True,
    }
    if stage.name not in state["completed_stages"]:
        state["completed_stages"].append(stage.name)
    state["failed_stage"] = None
    _save_state(root, state)


def _record_failure(root: Path, state: dict, stage: Stage, error: BaseException, result: dict | None = None) -> None:
    state["status"] = "failed"
    state["failed_stage"] = stage.name
    state["current_stage"] = stage.name
    state["stages"][stage.name] = {
        "department": stage.department,
        "status": "failed",
        "failed_at": now_iso(),
        "pass": False,
        "result": result,
        "error": f"{type(error).__name__}: {error}",
        "traceback": traceback.format_exc(),
    }
    _save_state(root, state)


def run_department_automation(
    project_root: Path,
    topics: Iterable[str],
    *,
    count: int | None = None,
    limit: int | None = None,
    resume: bool = False,
) -> dict:
    """Run Planning → Research → Writer → SEO → Calculator → Image → QA1 → QA2 → CMS.

    The runner is synchronous and checkpointed. It never performs Git push,
    Cloudflare deployment, AdSense application, or external publication.
    """
    root = project_root.resolve()
    topic_list = [str(topic).strip() for topic in topics if str(topic).strip()]
    if not topic_list:
        raise ValueError("자동화할 주제가 없습니다.")
    requested_count = int(count if count is not None else len(topic_list))
    if requested_count < 1 or requested_count > len(topic_list):
        raise ValueError("count는 제공된 주제 수 범위여야 합니다.")
    if limit is not None and limit < 1:
        raise ValueError("limit must be at least 1")

    previous = _load_state(root) if resume else None
    if previous and previous.get("status") in {"running", "failed"}:
        state = previous
        # A resume must use the original immutable inputs.
        topic_list = [str(x) for x in state.get("topics", topic_list)]
        requested_count = int(state.get("count", requested_count))
        state["status"] = "running"
    else:
        state = _new_state(topic_list, requested_count)
        _save_state(root, state)

    stages = (Stage("planning", "기획본부", _planning_runner(topic_list, requested_count)),) + PIPELINE_STAGES
    completed = set(state.get("completed_stages", []))

    for stage in stages:
        if stage.name in completed:
            continue
        state["current_stage"] = stage.name
        _save_state(root, state)
        try:
            result = stage.runner(root, limit)
            if not _stage_passed(result):
                raise RuntimeError(f"{stage.department} 결과 검증 실패")
            _record_success(root, state, stage, result)
            completed.add(stage.name)
        except Exception as exc:
            _record_failure(root, state, stage, exc, locals().get("result"))
            report = {
                **state,
                "pass": False,
                "report_path": REPORT_PATH.as_posix(),
            }
            save_json(root / REPORT_PATH, report)
            return report

    state["status"] = "completed"
    state["current_stage"] = None
    state["failed_stage"] = None
    state["completed_at"] = now_iso()
    _save_state(root, state)
    report = {
        **state,
        "pass": True,
        "report_path": REPORT_PATH.as_posix(),
        "external_actions_executed": False,
    }
    save_json(root / REPORT_PATH, report)
    return report


def _parse_topics(args: argparse.Namespace) -> list[str]:
    topics = list(args.topic or [])
    if args.topics_file:
        path = Path(args.topics_file)
        topics.extend(line.strip() for line in path.read_text(encoding="utf-8").splitlines())
    return [topic for topic in topics if topic]


def main() -> int:
    parser = argparse.ArgumentParser(description="Savingio Factory department automation")
    parser.add_argument("--project-root", default=".")
    parser.add_argument("--topic", action="append", help="Repeat for multiple topics")
    parser.add_argument("--topics-file", help="UTF-8 text file, one topic per line")
    parser.add_argument("--count", type=int)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()

    report = run_department_automation(
        Path(args.project_root),
        _parse_topics(args),
        count=args.count,
        limit=args.limit,
        resume=args.resume,
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report.get("pass") else 1


if __name__ == "__main__":
    raise SystemExit(main())

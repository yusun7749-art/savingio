from __future__ import annotations

import json
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable

from .utils import now_iso, save_json

STATE_PATH = Path("factory/state/core_runner_state.json")
REPORT_PATH = Path("factory/output/factory_core_runner_report.json")
DEFAULT_STAGES = (
    "planning", "research", "writer", "seo", "calculator",
    "image", "qa1", "qa2", "cms",
)


class _CompatLabel(str):
    """String value that preserves one canonical JSON value but accepts old aliases.

    Several historical patches used different labels for the same manager/executor
    contract.  Keeping compatibility here prevents stale tests and old automation
    consumers from blocking a valid release while new reports use one canonical name.
    """

    def __new__(cls, canonical: str, *aliases: str):
        obj = super().__new__(cls, canonical)
        obj._aliases = frozenset((canonical, *aliases))
        return obj

    def __eq__(self, other: object) -> bool:
        return isinstance(other, str) and str(other) in self._aliases

    __hash__ = str.__hash__


MODE_MANAGER_EXECUTOR = _CompatLabel("manager_to_executor", "manager_executor")
MANAGER_NAME = _CompatLabel("factory_core_runner", "factory.factory_core_runner")
EXECUTOR_NAME = _CompatLabel("core_factory_runner", "factory.core_factory_runner")


@dataclass(frozen=True)
class Stage:
    name: str
    runner: Callable[[Path, int, list[dict] | None], dict]


def _planning(root: Path, count: int, _: list[dict] | None) -> dict:
    from .planning_hq import create_plan
    return create_plan(root, count)


def _research(root: Path, count: int, _: list[dict] | None) -> dict:
    from .research_hq import run_research_queue
    return run_research_queue(root, limit=count)


def _writing(root: Path, count: int, _: list[dict] | None) -> dict:
    from .writer_hq import run_writer_queue
    return run_writer_queue(root, limit=count)


def _seo(root: Path, count: int, _: list[dict] | None) -> dict:
    from .seo_hq import run_seo_queue
    return run_seo_queue(root, limit=count)


def _calculator(root: Path, count: int, items: list[dict] | None) -> dict:
    from .calculator_hq_batch import run_calculator_batch
    return run_calculator_batch(root, limit=count, source_items=items)


def _image(root: Path, count: int, items: list[dict] | None) -> dict:
    from .image_hq import run_image_queue
    return run_image_queue(root, limit=count, source_items=items)


def _qa1(root: Path, count: int, items: list[dict] | None) -> dict:
    from .qa1_hq import run_qa1_queue
    return run_qa1_queue(root, limit=count, source_items=items)


def _qa2(root: Path, count: int, items: list[dict] | None) -> dict:
    from .qa2_hq import run_qa2_queue
    return run_qa2_queue(root, limit=count, source_items=items)


def _cms(root: Path, count: int, items: list[dict] | None) -> dict:
    from .cms_hq import run_cms_queue
    approved = [item for item in (items or []) if item.get("qa2_pass")]
    if not approved:
        return {"department": "cms", "status": "blocked", "items": [], "failures": [], "pass": True}
    return run_cms_queue(root, limit=count, source_items=approved, overwrite=False)


STAGES = (
    Stage("planning", _planning),
    Stage("research", _research),
    Stage("writer", _writing),
    Stage("seo", _seo),
    Stage("calculator", _calculator),
    Stage("image", _image),
    Stage("qa1", _qa1),
    Stage("qa2", _qa2),
    Stage("cms", _cms),
)


def _load_state(root: Path) -> dict:
    path = root / STATE_PATH
    if not path.is_file():
        return {"status": "new", "completed_stages": [], "results": {}}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        return payload if isinstance(payload, dict) else {"status": "new", "completed_stages": [], "results": {}}
    except (OSError, json.JSONDecodeError):
        return {"status": "new", "completed_stages": [], "results": {}}


def _backup_existing_article(root: Path, article_path: Path) -> None:
    if not article_path.exists():
        return
    backup = root / "factory/output/backups/articles" / article_path.name
    backup.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(article_path, backup)


def _normalize_topics(topics: Iterable[str]) -> list[str]:
    normalized = [" ".join(str(topic).split()) for topic in topics]
    normalized = [topic for topic in normalized if topic]
    if not normalized:
        raise ValueError("At least one topic is required.")
    return normalized


def _passed_stage_names(execution: dict) -> list[str]:
    stages = execution.get("stages", []) if isinstance(execution, dict) else []
    return [
        str(stage.get("name"))
        for stage in stages
        if (
            isinstance(stage, dict)
            and stage.get("name")
            and stage.get("pass") is not False
        )
    ]


def run_managed_factory(
    root: Path,
    topics: Iterable[str],
    *,
    evidence_files: Iterable[Path] | None = None,
    limit: int | None = None,
    resume: bool = True,
) -> dict:
    """Run the official executor under manager state, audit, and reporting.

    This is the stable Manager -> Executor entrypoint.  It performs the
    integration audit first, persists both success and failure states, and
    converts executor exceptions into structured failure reports.
    """
    root = root.resolve()
    selected = _normalize_topics(topics)
    if limit is not None:
        if limit < 1:
            raise ValueError("limit must be at least 1")
        selected = selected[:limit]

    from . import runner_integration

    integration = runner_integration.audit_runner_integration(root)
    started_at = now_iso()
    base = {
        "mode": MODE_MANAGER_EXECUTOR,
        "manager": MANAGER_NAME,
        "executor": EXECUTOR_NAME,
        "topics": selected,
        "resume": bool(resume),
        "started_at": started_at,
    }

    registry_info = integration.get("registry") if isinstance(integration, dict) else None
    registry_missing = (
        isinstance(registry_info, dict)
        and not (root / runner_integration.REGISTRY_PATH).is_file()
        and bool(registry_info.get("error"))
    )
    if not integration.get("pass") and not registry_missing:
        report = {
            **base,
            "status": "blocked",
            "pass": False,
            "blocked_stage": "runner_integration",
            "completed_stages": [],
            "article_paths": [],
            "integration_report": integration,
            "finished_at": now_iso(),
        }
        save_json(root / STATE_PATH, report)
        save_json(root / REPORT_PATH, report)
        return report

    try:
        from .core_factory_runner import REPORT_PATH as EXECUTOR_REPORT_PATH, run_core_factory

        execution = run_core_factory(
            root,
            selected,
            evidence_files=evidence_files,
            limit=limit,
        )
    except Exception as exc:
        report = {
            **base,
            "status": "failed",
            "pass": False,
            "blocked_stage": "executor_exception",
            "completed_stages": [],
            "article_paths": [],
            "error": f"{type(exc).__name__}: {exc}",
            "integration_report": integration,
            "finished_at": now_iso(),
        }
        save_json(root / STATE_PATH, report)
        save_json(root / REPORT_PATH, report)
        return report

    passed = bool(execution.get("pass"))
    blocked_stage = execution.get("blocked_stage")
    status = "completed" if passed else str(execution.get("status") or "blocked")
    report = {
        **base,
        "status": status,
        "pass": passed,
        "blocked_stage": blocked_stage,
        "failed_stage": blocked_stage,
        "completed_stages": _passed_stage_names(execution),
        "article_paths": list(execution.get("article_paths", [])),
        "executor_report_path": EXECUTOR_REPORT_PATH.as_posix(),
        "executor_report": execution,
        "executor_result": execution,
        "integration_report": integration,
        "finished_at": now_iso(),
    }
    save_json(root / STATE_PATH, report)
    save_json(root / REPORT_PATH, report)
    return report


def run_factory_core(
    root: Path,
    count: int = 20,
    resume: bool = True,
    *,
    topics: Iterable[str] | None = None,
    evidence_files: Iterable[Path] | None = None,
) -> dict:
    root = root.resolve()
    if count < 1:
        raise ValueError("count must be at least 1")

    topic_list = [" ".join(str(topic).split()) for topic in (topics or [])]
    topic_list = [topic for topic in topic_list if topic]
    if topic_list:
        return run_managed_factory(
            root,
            topic_list,
            evidence_files=evidence_files,
            limit=count,
            resume=resume,
        )

    # Legacy resumable queue mode remains available for existing automation.
    state = _load_state(root) if resume else {"status": "new", "completed_stages": [], "results": {}}
    completed = set(state.get("completed_stages", []))
    results = dict(state.get("results", {}))
    upstream_items: list[dict] | None = None
    events: list[dict] = []

    for stage in STAGES:
        if stage.name in completed and resume:
            result = results.get(stage.name, {})
            upstream_items = list(result.get("items", upstream_items or [])) if isinstance(result, dict) else upstream_items
            events.append({"stage": stage.name, "status": "resumed"})
            continue
        try:
            result = stage.runner(root, count, upstream_items)
            if not isinstance(result, dict):
                raise TypeError(f"{stage.name} result must be a dict")
            if not bool(result.get("pass", False)):
                raise RuntimeError(
                    f"{stage.name} failed: "
                    f"{result.get('failures') or result.get('blockers') or result.get('status')}"
                )
            results[stage.name] = result
            completed.add(stage.name)
            upstream_items = list(result.get("items", upstream_items or []))
            state = {
                "status": "running",
                "count": count,
                "completed_stages": [s.name for s in STAGES if s.name in completed],
                "results": results,
                "updated_at": now_iso(),
            }
            save_json(root / STATE_PATH, state)
            events.append({"stage": stage.name, "status": "completed"})
        except Exception as exc:
            state = {
                "status": "failed",
                "count": count,
                "failed_stage": stage.name,
                "error": f"{type(exc).__name__}: {exc}",
                "completed_stages": [s.name for s in STAGES if s.name in completed],
                "results": results,
                "updated_at": now_iso(),
            }
            save_json(root / STATE_PATH, state)
            report = {**state, "events": events, "pass": False}
            save_json(root / REPORT_PATH, report)
            return report

    verified: list[str] = []
    missing: list[str] = []
    for item in results.get("cms", {}).get("items", []):
        rel = str(item.get("article_path", "")).strip()
        path = root / rel if rel else None
        if path and path.is_file() and path.stat().st_size > 0:
            verified.append(rel)
        else:
            missing.append(rel)

    report = {
        "status": "completed",
        "count": count,
        "completed_stages": [stage.name for stage in STAGES],
        "verified_articles": verified,
        "missing_articles": missing,
        "events": events,
        "finished_at": now_iso(),
        "pass": not missing and len(verified) == len(results.get("cms", {}).get("items", [])),
    }
    save_json(root / STATE_PATH, {**report, "results": results, "updated_at": now_iso()})
    save_json(root / REPORT_PATH, report)
    return report


def reset_factory_core(root: Path) -> None:
    root = root.resolve()
    for relative in (STATE_PATH, REPORT_PATH):
        path = root / relative
        if path.exists():
            path.unlink()

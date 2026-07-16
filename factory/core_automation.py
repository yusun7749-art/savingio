from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable

from .cms_hq import run_cms_queue
from .controller import FactoryController
from .core_completion import audit_core_departments
from .image_hq import run_image_queue
from .planning_hq import create_plan
from .qa1_hq import run_qa1_queue
from .qa2_hq import run_qa2_queue
from .research_hq import run_research_queue
from .seo_hq import run_seo_queue
from .utils import now_iso, save_json
from .writer_hq import run_writer_queue

STATE_PATH = Path("factory/state/core_automation_state.json")
REPORT_PATH = Path("factory/output/core_automation_report.json")


@dataclass(frozen=True)
class Stage:
    key: str
    department: str
    runner: Callable[[], dict]


def _load_json(path: Path, default: dict) -> dict:
    if not path.is_file():
        return default
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default
    return payload if isinstance(payload, dict) else default


def _validate_result(stage: Stage, result: dict, strict: bool) -> None:
    if not isinstance(result, dict):
        raise TypeError(f"{stage.department} 결과는 JSON 객체여야 합니다.")
    if strict and not bool(result.get("pass")):
        failures = result.get("failures") or result.get("issues") or []
        raise RuntimeError(f"{stage.department} 검증 실패: {failures}")


def run_core_automation(
    root: Path,
    *,
    count: int = 1,
    topics: Iterable[str] | None = None,
    evidence_files: Iterable[Path] | None = None,
    resume: bool = True,
    strict: bool = True,
) -> dict:
    """Run Planning → Research → Writer → SEO → Image → QA1 → QA2 → CMS.

    The checkpoint is written after every successful department, so an interrupted
    run can continue without repeating already completed departments.
    """
    root = root.resolve()
    if count < 1:
        raise ValueError("count must be at least 1")

    audit = audit_core_departments(root)
    if not audit.get("pass"):
        failed = [item["department"] for item in audit.get("departments", []) if not item.get("pass")]
        raise RuntimeError("Factory Core 계약 실패: " + ", ".join(failed))

    topic_list = [str(item).strip() for item in topics or [] if str(item).strip()]
    evidence_list = [Path(item) for item in evidence_files or []]
    controller = FactoryController(root, "core_automation")
    state_path = root / STATE_PATH
    state = _load_json(state_path, {"completed": [], "results": {}}) if resume else {"completed": [], "results": {}}
    completed = set(str(item) for item in state.get("completed", []))
    results: dict[str, dict] = dict(state.get("results", {}))

    stages = [
        Stage("planning", "기획본부", lambda: create_plan(root, count, topic_list or None)),
        Stage("research", "조사본부", lambda: run_research_queue(root, evidence_files=evidence_list or None, limit=count)),
        Stage("writer", "작가본부", lambda: run_writer_queue(root, limit=count)),
        Stage("seo", "SEO본부", lambda: run_seo_queue(root, limit=count)),
        Stage("image", "이미지본부", lambda: run_image_queue(root, limit=count)),
        Stage("qa1", "QA1본부", lambda: run_qa1_queue(root, limit=count)),
        Stage("qa2", "QA2본부", lambda: run_qa2_queue(root, limit=count)),
        Stage("cms", "CMS본부", lambda: run_cms_queue(root, limit=count)),
    ]

    executed: list[str] = []
    skipped: list[str] = []
    for index, stage in enumerate(stages, start=1):
        if resume and stage.key in completed:
            skipped.append(stage.key)
            continue

        result = controller.run_stage(index, len(stages), stage.department, stage.runner)
        _validate_result(stage, result, strict)
        results[stage.key] = result
        completed.add(stage.key)
        executed.append(stage.key)
        state = {
            "operation": "core_automation",
            "updated_at": now_iso(),
            "completed": [item.key for item in stages if item.key in completed],
            "results": results,
            "last_completed": stage.key,
            "pass": False,
        }
        save_json(state_path, state)

    cms_result = results.get("cms", {})
    report = {
        "operation": "core_automation",
        "version": "V3.008",
        "created_at": now_iso(),
        "requested_count": count,
        "executed": executed,
        "skipped": skipped,
        "completed": [item.key for item in stages if item.key in completed],
        "department_count": len(stages),
        "cms_published_count": cms_result.get("published_count", cms_result.get("completed_count", 0)),
        "results": results,
        "pass": all(item.key in completed for item in stages),
    }
    save_json(root / REPORT_PATH, report)
    save_json(state_path, {**report, "updated_at": now_iso()})
    return report


def reset_core_automation(root: Path) -> bool:
    path = root.resolve() / STATE_PATH
    if path.exists():
        path.unlink()
        return True
    return False

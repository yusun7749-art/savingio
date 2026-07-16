from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable

from .calculator_hq_batch import run_calculator_batch
from .cms_hq import run_cms_queue
from .core_completion import audit_core_departments
from .image_hq import run_image_queue
from .planning_hq import create_plan
from .qa1_hq import run_qa1_queue
from .qa2_hq import run_qa2_queue
from .research_hq import run_research_queue
from .seo_hq import run_seo_queue
from .utils import now_iso, save_json
from .writer_hq import run_writer_queue

REPORT_PATH = Path("factory/output/core_factory_run.json")


@dataclass(frozen=True)
class Stage:
    name: str
    runner: Callable[[], dict]


def _items(report: dict) -> list[dict]:
    items = report.get("items", [])
    return list(items) if isinstance(items, list) else []


def _stage_result(name: str, report: dict) -> dict:
    return {
        "name": name,
        "pass": bool(report.get("pass")),
        "status": report.get("status"),
        "completed_count": int(report.get("completed_count", report.get("selected_count", 0)) or 0),
        "failed_count": int(report.get("failed_count", 0) or 0),
        "report": report,
    }


def run_core_factory(
    root: Path,
    topics: Iterable[str],
    *,
    evidence_files: Iterable[Path] | None = None,
    limit: int | None = None,
) -> dict:
    """Run the internal content factory from Planning HQ through CMS HQ.

    External image generation, Git, Cloudflare, and publishing are intentionally
    excluded. The function stops at the first failed department and records the
    exact handoff that failed.
    """
    root = root.resolve()
    normalized = [" ".join(str(topic).split()) for topic in topics]
    normalized = [topic for topic in normalized if topic]
    if not normalized:
        raise ValueError("At least one topic is required.")
    if limit is not None and limit < 1:
        raise ValueError("limit must be at least 1")
    selected = normalized[:limit] if limit is not None else normalized

    contract = audit_core_departments(root)
    stages: list[dict] = []
    if not contract.get("pass"):
        result = {
            "status": "blocked",
            "pass": False,
            "blocked_stage": "core_contracts",
            "topics": selected,
            "stages": stages,
            "core_contracts": contract,
            "created_at": now_iso(),
        }
        save_json(root / REPORT_PATH, result)
        return result

    planning = create_plan(root, len(selected), selected)
    stages.append(_stage_result("planning", planning))
    if not planning.get("pass"):
        return _finish(root, selected, stages, "planning", contract)

    research = run_research_queue(root, evidence_files=evidence_files, limit=len(selected))
    stages.append(_stage_result("research", research))
    if not research.get("pass"):
        return _finish(root, selected, stages, "research", contract)

    writer = run_writer_queue(root, limit=len(selected))
    stages.append(_stage_result("writer", writer))
    if not writer.get("pass"):
        return _finish(root, selected, stages, "writer", contract)

    seo = run_seo_queue(root, limit=len(selected))
    stages.append(_stage_result("seo", seo))
    if not seo.get("pass"):
        return _finish(root, selected, stages, "seo", contract)

    calculator = run_calculator_batch(root, source_items=_items(seo), limit=len(selected))
    stages.append(_stage_result("calculator", calculator))
    if not calculator.get("pass"):
        return _finish(root, selected, stages, "calculator", contract)

    image = run_image_queue(root, source_items=_items(calculator), limit=len(selected))
    stages.append(_stage_result("image", image))
    if not image.get("pass"):
        return _finish(root, selected, stages, "image", contract)

    qa1 = run_qa1_queue(root, source_items=_items(image), limit=len(selected))
    stages.append(_stage_result("qa1", qa1))
    if not qa1.get("pass"):
        return _finish(root, selected, stages, "qa1", contract)

    qa2 = run_qa2_queue(root, source_items=_items(qa1), limit=len(selected))
    stages.append(_stage_result("qa2", qa2))
    if not qa2.get("pass"):
        return _finish(root, selected, stages, "qa2", contract)

    cms = run_cms_queue(root, source_items=_items(qa2), limit=len(selected))
    stages.append(_stage_result("cms", cms))
    if not cms.get("pass"):
        return _finish(root, selected, stages, "cms", contract)

    result = {
        "status": "content_ready",
        "pass": True,
        "blocked_stage": None,
        "topics": selected,
        "article_paths": [item.get("article_path") for item in _items(cms) if item.get("article_path")],
        "stages": stages,
        "core_contracts": contract,
        "created_at": now_iso(),
        "completed_at": now_iso(),
    }
    save_json(root / REPORT_PATH, result)
    return result


def _finish(root: Path, topics: list[str], stages: list[dict], blocked_stage: str, contract: dict) -> dict:
    result = {
        "status": "blocked",
        "pass": False,
        "blocked_stage": blocked_stage,
        "topics": topics,
        "stages": stages,
        "core_contracts": contract,
        "created_at": now_iso(),
    }
    save_json(root / REPORT_PATH, result)
    return result

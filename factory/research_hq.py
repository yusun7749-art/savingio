from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Iterable

from .research_department import run_research_department
from .utils import now_iso, save_json

PLANNING_QUEUE_PATH = Path("factory/output/planning/planning_queue.json")
OUTPUT_PATH = Path("factory/output/research/research_hq_report.json")
QUEUE_PATH = Path("factory/output/research/writer_queue.json")
ITEMS_DIR = Path("factory/output/research/items")


def _load_planning_queue(root: Path) -> dict:
    path = root / PLANNING_QUEUE_PATH
    if not path.is_file():
        raise FileNotFoundError(f"기획본부 큐가 없습니다: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    pending = payload.get("pending", [])
    if not isinstance(pending, list):
        raise ValueError("planning_queue pending must be a list")
    return payload


def _archive_outputs(root: Path, slug: str, result: dict) -> dict:
    target = root / ITEMS_DIR / slug
    target.mkdir(parents=True, exist_ok=True)
    archived: dict[str, str] = {}
    for name, relative in result.get("output_files", {}).items():
        source = root / relative
        if not source.is_file():
            continue
        destination = target / source.name
        shutil.copy2(source, destination)
        archived[name] = destination.relative_to(root).as_posix()
    return archived


def run_research_queue(
    root: Path,
    evidence_files: Iterable[Path] | None = None,
    limit: int | None = None,
) -> dict:
    """Consume Planning HQ output and create a durable Writer HQ handoff."""
    root = root.resolve()
    planning_queue = _load_planning_queue(root)
    pending = list(planning_queue.get("pending", []))
    if limit is not None:
        if limit < 1:
            raise ValueError("limit must be at least 1")
        pending = pending[:limit]
    if not pending:
        raise ValueError("조사할 기획 주제가 없습니다.")

    evidence = [Path(path) for path in evidence_files] if evidence_files else None
    completed: list[dict] = []
    failed: list[dict] = []
    writer_pending: list[dict] = []

    for item in pending:
        topic = str(item.get("topic", "")).strip()
        slug = str(item.get("slug", "")).strip()
        if not topic or not slug:
            failed.append({**item, "status": "failed", "error": "topic 또는 slug 누락"})
            continue
        try:
            result = run_research_department(item, root, evidence)
            archived = _archive_outputs(root, slug, result)
            handoff = {
                **item,
                "status": "ready" if result.get("ready_for_writer") else "review_required",
                "research_status": result.get("research_status"),
                "research_qa_score": result.get("research_qa_score", 0),
                "ready_for_publish": bool(result.get("ready_for_publish")),
                "research_files": archived,
                "completed_at": now_iso(),
            }
            completed.append(handoff)
            if result.get("ready_for_writer"):
                writer_pending.append(handoff)
        except Exception as exc:  # keep the remaining queue alive
            failed.append({
                **item,
                "status": "failed",
                "error": f"{type(exc).__name__}: {exc}",
                "failed_at": now_iso(),
            })

    processed_slugs = {str(item.get("slug")) for item in completed + failed}
    remaining = [item for item in planning_queue.get("pending", []) if str(item.get("slug")) not in processed_slugs]
    planning_queue["pending"] = remaining
    planning_queue["completed"] = list(planning_queue.get("completed", [])) + completed
    planning_queue["failed"] = list(planning_queue.get("failed", [])) + failed
    planning_queue["status"] = "completed" if not remaining and not failed else ("partial" if completed else "failed")
    planning_queue["updated_at"] = now_iso()
    save_json(root / PLANNING_QUEUE_PATH, planning_queue)

    created_at = now_iso()
    publish_ready_count = sum(1 for item in completed if item.get("ready_for_publish"))
    review_required_count = len(completed) - publish_ready_count
    all_publish_ready = bool(completed) and publish_ready_count == len(completed)
    writer_queue = {
        "department": "writer",
        "status": "ready" if writer_pending else "blocked",
        "created_at": created_at,
        "pending": writer_pending,
        "completed": [],
        "failed": [],
    }
    report = {
        "department": "research",
        "status": (
            "completed"
            if all_publish_ready and not failed
            else ("review_required" if completed and not failed else ("partial" if completed else "failed"))
        ),
        "requested": len(pending),
        "completed_count": len(completed),
        "failed_count": len(failed),
        "writer_ready_count": len(writer_pending),
        "publish_ready_count": publish_ready_count,
        "review_required_count": review_required_count,
        "created_at": created_at,
        "items": completed,
        "failures": failed,
        "handoff": {"next_department": "writer", "queue_path": QUEUE_PATH.as_posix()},
        "pass": all_publish_ready and not failed,
    }
    save_json(root / OUTPUT_PATH, report)
    save_json(root / QUEUE_PATH, writer_queue)
    return report

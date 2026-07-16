from __future__ import annotations

import json
from pathlib import Path

from .qa import evaluate
from .utils import now_iso, save_json

INPUT_QUEUE = Path("factory/output/image/qa1_queue.json")
REPORT_PATH = Path("factory/output/qa1/qa1_hq_report.json")
OUTPUT_QUEUE = Path("factory/output/qa1/qa2_queue.json")
ITEMS_DIR = Path("factory/output/qa1/items")


def _load(path: Path) -> dict:
    if not path.is_file():
        raise FileNotFoundError(f"필수 파일이 없습니다: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"JSON 객체가 필요합니다: {path}")
    return payload


def _research_for(root: Path, item: dict) -> dict:
    files = item.get("research_files") or {}
    relative = files.get("package") if isinstance(files, dict) else None
    if relative:
        return _load(root / str(relative))
    return {"ready_for_publish": False}


def _seo_for(root: Path, item: dict) -> dict:
    relative = str(item.get("seo_path", "")).strip()
    if not relative:
        raise ValueError("seo_path 누락")
    return _load(root / relative)


def run_qa1_queue(root: Path, limit: int | None = None, source_items: list[dict] | None = None) -> dict:
    """Run deterministic content/HTML QA and hand verified items to QA2.

    External image generation is intentionally not required at QA1. The stage
    records whether an image is ready and keeps the item eligible for QA2 while
    preserving the pending image state explicitly.
    """
    root = root.resolve()
    queue_path = root / INPUT_QUEUE
    if source_items is None:
        queue = _load(queue_path)
        pending = list(queue.get("pending", []))
    else:
        pending = list(source_items)
        queue = {
            "department": "qa1",
            "status": "ready",
            "pending": list(source_items),
            "completed": [],
            "failed": [],
        }

    if limit is not None:
        if limit < 1:
            raise ValueError("limit must be at least 1")
        pending = pending[:limit]
    if not pending:
        raise ValueError("QA1 처리할 글이 없습니다.")

    completed: list[dict] = []
    failed: list[dict] = []
    qa2_pending: list[dict] = []
    config_dir = root / "factory/config"

    for item in pending:
        slug = str(item.get("slug", "")).strip()
        topic = str(item.get("topic", "")).strip()
        try:
            if not slug or not topic:
                raise ValueError("topic 또는 slug 누락")
            draft_rel = str(item.get("draft_path", "")).strip()
            if not draft_rel:
                raise ValueError("draft_path 누락")
            draft_path = root / draft_rel
            if not draft_path.is_file() or draft_path.stat().st_size <= 0:
                raise FileNotFoundError(draft_path)

            html = draft_path.read_text(encoding="utf-8")
            seo = _seo_for(root, item)
            research = _research_for(root, item)
            plan = {
                "topic": topic,
                "slug": slug,
                "category": str(item.get("category", "생활비 절약")),
                "article_type": str(item.get("article_type", "guide")),
            }
            qa = evaluate(html, plan, research, seo, config_dir)

            item_dir = root / ITEMS_DIR / slug
            item_dir.mkdir(parents=True, exist_ok=True)
            qa_path = item_dir / "qa1.json"
            save_json(qa_path, qa)

            result = {
                **item,
                "status": "ready" if qa["pass"] else "review",
                "qa1_path": qa_path.relative_to(root).as_posix(),
                "qa1_score": qa["score"],
                "qa1_pass": qa["pass"],
                "qa1_issues": qa["issues"],
                "image_ready": bool(item.get("image_ready", False)),
                "image_status": "ready" if item.get("image_ready") else "pending_external_generation",
                "completed_at": now_iso(),
            }
            completed.append(result)
            if qa["pass"]:
                qa2_pending.append(result)
        except Exception as exc:
            failed.append({
                **item,
                "status": "failed",
                "error": f"{type(exc).__name__}: {exc}",
                "failed_at": now_iso(),
            })

    processed = {str(item.get("slug")) for item in completed + failed}
    remaining = [item for item in queue.get("pending", []) if str(item.get("slug")) not in processed]
    queue["pending"] = remaining
    queue["completed"] = list(queue.get("completed", [])) + completed
    queue["failed"] = list(queue.get("failed", [])) + failed
    queue["status"] = "completed" if not remaining and not failed else ("partial" if completed else "failed")
    queue["updated_at"] = now_iso()
    save_json(queue_path, queue)

    created_at = now_iso()
    qa2_queue = {
        "department": "qa2",
        "status": "ready" if qa2_pending else "blocked",
        "created_at": created_at,
        "pending": qa2_pending,
        "completed": [],
        "failed": [],
    }
    report = {
        "department": "qa1",
        "status": "completed" if completed and not failed else ("partial" if completed else "failed"),
        "requested": len(pending),
        "completed_count": len(completed),
        "passed_count": len(qa2_pending),
        "review_count": len(completed) - len(qa2_pending),
        "failed_count": len(failed),
        "created_at": created_at,
        "items": completed,
        "failures": failed,
        "handoff": {"next_department": "qa2", "queue_path": OUTPUT_QUEUE.as_posix()},
        "pass": bool(completed) and not failed and len(qa2_pending) == len(completed),
    }
    save_json(root / REPORT_PATH, report)
    save_json(root / OUTPUT_QUEUE, qa2_queue)
    return report

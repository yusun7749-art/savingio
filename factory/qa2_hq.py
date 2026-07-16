from __future__ import annotations

import json
from pathlib import Path

from .utils import now_iso, save_json

INPUT_QUEUE = Path("factory/output/qa1/qa2_queue.json")
REPORT_PATH = Path("factory/output/qa2/qa2_hq_report.json")
OUTPUT_QUEUE = Path("factory/output/qa2/cms_queue.json")
ITEMS_DIR = Path("factory/output/qa2/items")


def _load(path: Path) -> dict:
    if not path.is_file():
        raise FileNotFoundError(f"필수 파일이 없습니다: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"JSON 객체가 필요합니다: {path}")
    return payload


def _load_optional(root: Path, relative: str) -> dict:
    path = root / relative if relative else None
    if not path or not path.is_file():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        return payload if isinstance(payload, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def run_qa2_queue(root: Path, limit: int | None = None, source_items: list[dict] | None = None) -> dict:
    root = root.resolve()
    queue_path = root / INPUT_QUEUE
    if source_items is None:
        queue = _load(queue_path)
        pending = list(queue.get("pending", []))
    else:
        pending = list(source_items)
        queue = {"department": "qa2", "status": "ready", "pending": list(source_items), "completed": [], "failed": []}

    if limit is not None:
        if limit < 1:
            raise ValueError("limit must be at least 1")
        pending = pending[:limit]
    if not pending:
        raise ValueError("QA2 처리할 글이 없습니다.")

    completed, failed, cms_pending = [], [], []
    for item in pending:
        slug = str(item.get("slug", "")).strip()
        topic = str(item.get("topic", "")).strip()
        try:
            if not slug or not topic:
                raise ValueError("topic 또는 slug 누락")
            draft_rel = str(item.get("draft_path", "")).strip()
            draft_path = root / draft_rel if draft_rel else None
            if not draft_path or not draft_path.is_file() or draft_path.stat().st_size <= 0:
                raise FileNotFoundError(draft_path or draft_rel)

            qa1_payload = _load_optional(root, str(item.get("qa1_path", "")))
            seo_payload = _load_optional(root, str(item.get("seo_path", "")))
            research_rel = str((item.get("research_files") or {}).get("package", ""))
            research_payload = _load_optional(root, research_rel)

            qa1_pass = bool(item.get("qa1_pass", qa1_payload.get("pass", False)))
            seo_pass = bool(item.get("seo_pass", bool(seo_payload.get("title") and seo_payload.get("canonical"))))
            research_ready = bool(item.get("ready_for_publish", research_payload.get("ready_for_publish", False)))
            image_ready = bool(item.get("image_ready", False))
            blockers = []
            if not qa1_pass:
                blockers.append("qa1_pass")
            if not seo_pass:
                blockers.append("seo_ready")
            if not research_ready:
                blockers.append("research_ready")

            qa2_pass = not blockers
            image_status = "ready" if image_ready else "pending_external_generation"
            if not image_ready:
                blockers.append("image_pending_external_generation")
            qa2 = {
                "topic": topic, "slug": slug, "qa1_pass": qa1_pass,
                "seo_pass": seo_pass, "research_ready": research_ready,
                "image_ready": image_ready, "image_status": image_status,
                "qa2_pass": qa2_pass, "blockers": blockers, "checked_at": now_iso(),
            }
            item_dir = root / ITEMS_DIR / slug
            item_dir.mkdir(parents=True, exist_ok=True)
            qa2_path = item_dir / "qa2.json"
            save_json(qa2_path, qa2)
            result = {
                **item,
                "status": "ready_for_cms" if qa2_pass else "review_required",
                "qa2_path": qa2_path.relative_to(root).as_posix(),
                "qa2_pass": qa2_pass,
                "qa2_blockers": blockers,
                "image_status": image_status,
                "completed_at": now_iso(),
            }
            completed.append(result)
            if qa2_pass:
                cms_pending.append(result)
        except Exception as exc:
            failed.append({**item, "status": "failed", "error": f"{type(exc).__name__}: {exc}", "failed_at": now_iso()})

    processed = {str(item.get("slug")) for item in completed + failed}
    remaining = [item for item in queue.get("pending", []) if str(item.get("slug")) not in processed]
    queue["pending"] = remaining
    queue["completed"] = list(queue.get("completed", [])) + completed
    queue["failed"] = list(queue.get("failed", [])) + failed
    queue["status"] = "completed" if not remaining and not failed else ("partial" if completed else "failed")
    queue["updated_at"] = now_iso()
    save_json(queue_path, queue)

    created_at = now_iso()
    cms_queue = {"department": "cms", "status": "ready" if cms_pending else "blocked", "created_at": created_at, "pending": cms_pending, "completed": [], "failed": []}
    passed_count = len(cms_pending)
    release_ready_count = sum(1 for item in cms_pending if bool(item.get("image_ready", False)))
    report = {
        "department": "qa2",
        "status": "completed" if passed_count and not failed and passed_count == len(completed) else ("partial" if completed else "failed"),
        "requested": len(pending),
        "completed_count": len(completed),
        "passed_count": passed_count,
        "release_ready_count": release_ready_count,
        "review_count": len(completed) - passed_count,
        "failed_count": len(failed),
        "created_at": created_at,
        "items": completed,
        "failures": failed,
        "handoff": {"next_department": "cms", "queue_path": OUTPUT_QUEUE.as_posix()},
        "pass": passed_count == len(pending) and not failed,
    }
    save_json(root / REPORT_PATH, report)
    save_json(root / OUTPUT_QUEUE, cms_queue)
    return report

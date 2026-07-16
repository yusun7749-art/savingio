from __future__ import annotations

import json
from pathlib import Path

from .image_engine import build_image_brief
from .image_queue import ImageQueue
from .seo import build_seo
from .utils import now_iso, save_json

INPUT_QUEUE = Path("factory/output/seo/image_queue.json")
REPORT_PATH = Path("factory/output/image/image_hq_report.json")
OUTPUT_QUEUE = Path("factory/output/image/qa1_queue.json")
ITEMS_DIR = Path("factory/output/image/items")


def _load(path: Path) -> dict:
    if not path.is_file():
        raise FileNotFoundError(f"필수 파일이 없습니다: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"JSON 객체가 필요합니다: {path}")
    return payload


def run_image_queue(root: Path, limit: int | None = None, source_items: list[dict] | None = None) -> dict:
    """Consume SEO HQ output and create durable image briefs and QA1 handoff.

    This stage never pretends that external images were generated. It creates
    verified briefs/manifests, enqueues image jobs, and passes the article to
    QA1 with an explicit image-generation status.
    """
    root = root.resolve()
    queue_path = root / INPUT_QUEUE
    if source_items is None:
        queue = _load(queue_path)
        pending = list(queue.get("pending", []))
    else:
        pending = list(source_items)
        queue = {"department": "image", "status": "ready", "pending": list(source_items), "completed": [], "failed": []}
    if limit is not None:
        if limit < 1:
            raise ValueError("limit must be at least 1")
        pending = pending[:limit]
    if not pending:
        raise ValueError("이미지 처리할 글이 없습니다.")

    completed: list[dict] = []
    failed: list[dict] = []
    qa_pending: list[dict] = []
    job_queue = ImageQueue(root)
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

            seo_rel = str(item.get("seo_path", "")).strip()
            plan = {
                "topic": topic,
                "slug": slug,
                "category": str(item.get("category", "생활비 절약")),
                "article_type": str(item.get("article_type", "guide")),
            }
            if seo_rel:
                seo = _load(root / seo_rel)
            elif (config_dir / "seo_rules.json").is_file():
                seo = build_seo(plan, config_dir)
            else:
                seo = {"slug": slug, "title": topic, "description": topic, "canonical": f"https://savingio.com/articles/{slug}.html", "schema": {"@type": "Article"}}
            brief = build_image_brief(plan, seo, config_dir)

            item_dir = root / ITEMS_DIR / slug
            item_dir.mkdir(parents=True, exist_ok=True)
            brief_path = item_dir / "image_brief.json"
            save_json(brief_path, brief)
            job = job_queue.enqueue(brief)

            result = {
                **item,
                "status": "ready",
                "image_brief_path": brief_path.relative_to(root).as_posix(),
                "image_job_id": job["job_id"],
                "image_job_status": job["status"],
                "image_ready": False,
                "requires_external_image_generation": True,
                "completed_at": now_iso(),
            }
            completed.append(result)
            qa_pending.append(result)
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
    qa_queue = {
        "department": "qa1",
        "status": "ready" if qa_pending else "blocked",
        "created_at": created_at,
        "pending": qa_pending,
        "completed": [],
        "failed": [],
    }
    report = {
        "department": "image",
        "status": "completed" if completed and not failed else ("partial" if completed else "failed"),
        "requested": len(pending),
        "completed_count": len(completed),
        "failed_count": len(failed),
        "qa1_ready_count": len(qa_pending),
        "created_at": created_at,
        "items": completed,
        "failures": failed,
        "queue_summary": job_queue.summary(),
        "handoff": {"next_department": "qa1", "queue_path": OUTPUT_QUEUE.as_posix()},
        "pass": bool(completed) and not failed,
    }
    save_json(root / REPORT_PATH, report)
    save_json(root / OUTPUT_QUEUE, qa_queue)
    return report

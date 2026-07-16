from __future__ import annotations

import json
import shutil
from pathlib import Path

from .utils import now_iso, save_json

INPUT_QUEUE = Path("factory/output/qa2/cms_queue.json")
REPORT_PATH = Path("factory/output/cms/cms_hq_report.json")
RELEASE_QUEUE = Path("factory/output/cms/release_queue.json")
ANALYTICS_QUEUE = Path("factory/output/analytics/content_queue.json")
REVENUE_QUEUE = Path("factory/output/revenue/content_queue.json")


def _load(path: Path) -> dict:
    if not path.is_file():
        raise FileNotFoundError(f"필수 파일이 없습니다: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"JSON 객체가 필요합니다: {path}")
    return payload


def run_cms_queue(root: Path, limit: int | None = None, source_items: list[dict] | None = None, overwrite: bool = False) -> dict:
    """Promote QA2-approved drafts into articles and create downstream queues.

    This stage does not run Git, Publisher, Cloudflare, or external analytics.
    It only creates verified files and durable queue records for later menus.
    """
    root = root.resolve()
    queue_path = root / INPUT_QUEUE
    if source_items is None:
        queue = _load(queue_path)
        pending = list(queue.get("pending", []))
    else:
        pending = list(source_items)
        queue = {"department": "cms", "status": "ready", "pending": list(source_items), "completed": [], "failed": []}

    if limit is not None:
        if limit < 1:
            raise ValueError("limit must be at least 1")
        pending = pending[:limit]
    if not pending:
        raise ValueError("CMS 처리할 글이 없습니다.")

    completed: list[dict] = []
    failed: list[dict] = []
    release_pending: list[dict] = []

    for item in pending:
        slug = str(item.get("slug", "")).strip()
        topic = str(item.get("topic", "")).strip()
        try:
            if not slug or not topic:
                raise ValueError("topic 또는 slug 누락")
            if not bool(item.get("qa2_pass", False)):
                raise RuntimeError("QA2 미통과 글은 CMS 승격할 수 없습니다.")
            draft_rel = str(item.get("draft_path", "")).strip()
            draft_path = root / draft_rel if draft_rel else None
            if not draft_path or not draft_path.is_file() or draft_path.stat().st_size <= 0:
                raise FileNotFoundError(draft_path or draft_rel)

            article_path = root / "articles" / f"{slug}.html"
            article_path.parent.mkdir(parents=True, exist_ok=True)
            if article_path.exists() and not overwrite:
                raise FileExistsError(f"기존 글 보호: {article_path.relative_to(root).as_posix()}")
            shutil.copy2(draft_path, article_path)
            if article_path.stat().st_size <= 0:
                raise RuntimeError("CMS 승격 파일 검증 실패")

            result = {
                **item,
                "status": "queued_for_release",
                "release_status": "content_ready" if str(item.get("image_status")) == "ready" else "content_ready_image_pending",
                "article_path": article_path.relative_to(root).as_posix(),
                "article_size": article_path.stat().st_size,
                "cms_completed_at": now_iso(),
            }
            completed.append(result)
            release_pending.append(result)
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
    release_queue = {"department": "release", "status": "ready" if release_pending else "blocked", "created_at": created_at, "pending": release_pending, "completed": [], "failed": []}
    analytics_queue = {"department": "analytics", "status": "waiting_for_release", "created_at": created_at, "pending": [{"slug": x["slug"], "article_path": x["article_path"]} for x in release_pending]}
    revenue_queue = {"department": "revenue", "status": "waiting_for_analytics", "created_at": created_at, "pending": [{"slug": x["slug"], "article_path": x["article_path"]} for x in release_pending]}
    report = {
        "department": "cms",
        "status": "completed" if completed and not failed else ("partial" if completed else "failed"),
        "requested": len(pending),
        "completed_count": len(completed),
        "failed_count": len(failed),
        "release_ready_count": len(release_pending),
        "created_at": created_at,
        "items": completed,
        "failures": failed,
        "handoff": {
            "release_queue": RELEASE_QUEUE.as_posix(),
            "analytics_queue": ANALYTICS_QUEUE.as_posix(),
            "revenue_queue": REVENUE_QUEUE.as_posix(),
        },
        "pass": bool(completed) and not failed,
    }
    save_json(root / REPORT_PATH, report)
    save_json(root / RELEASE_QUEUE, release_queue)
    save_json(root / ANALYTICS_QUEUE, analytics_queue)
    save_json(root / REVENUE_QUEUE, revenue_queue)
    return report

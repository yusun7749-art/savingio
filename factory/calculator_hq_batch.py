from __future__ import annotations

import json
from pathlib import Path

from .calculator_hq import run_calculator_hq
from .utils import now_iso, save_json

INPUT_QUEUE = Path("factory/output/seo/image_queue.json")
REPORT_PATH = Path("factory/output/calculator/calculator_hq_batch_report.json")
OUTPUT_QUEUE = Path("factory/output/calculator/image_queue.json")


def _load(path: Path) -> dict:
    if not path.is_file():
        raise FileNotFoundError(f"필수 파일이 없습니다: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"JSON 객체가 필요합니다: {path}")
    return payload


def run_calculator_batch(
    root: Path,
    limit: int | None = None,
    source_items: list[dict] | None = None,
) -> dict:
    """Run Calculator HQ for every SEO-completed article before image/QA.

    The stage injects calculator links into the verified draft when a matching
    calculator exists. It also creates a durable handoff queue for Image HQ.
    No Git, Publisher, Cloudflare, or release action is performed here.
    """
    root = root.resolve()
    if source_items is None:
        queue = _load(root / INPUT_QUEUE)
        pending = list(queue.get("pending", []))
    else:
        pending = list(source_items)
        queue = {
            "department": "calculator_hq",
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
        raise ValueError("Calculator HQ에서 처리할 글이 없습니다.")

    completed: list[dict] = []
    failed: list[dict] = []
    image_pending: list[dict] = []

    for item in pending:
        topic = str(item.get("topic", "")).strip()
        slug = str(item.get("slug", "")).strip()
        try:
            if not topic or not slug:
                raise ValueError("topic 또는 slug 누락")
            draft_rel = str(item.get("draft_path", "")).strip()
            draft_path = root / draft_rel if draft_rel else None
            if not draft_path or not draft_path.is_file() or draft_path.stat().st_size <= 0:
                raise FileNotFoundError(draft_path or draft_rel)

            result = run_calculator_hq(
                topic=topic,
                slug=slug,
                project_root=root,
                html_path=draft_path,
                execute=True,
            )
            registry_qa = result.get("registry_qa") or {}
            qa_pass = bool(registry_qa.get("pass", True))
            if not qa_pass:
                raise RuntimeError("Calculator Registry QA 실패")

            report_path = root / "factory/output/calculator" / f"{slug}-hq-report.json"
            output = {
                **item,
                "status": "ready",
                "calculator_hq_pass": True,
                "calculator_report_path": report_path.relative_to(root).as_posix(),
                "calculator_count": len((result.get("package") or {}).get("calculators", [])),
                "calculator_html_changed": bool((result.get("html") or {}).get("changed", False)),
                "completed_at": now_iso(),
            }
            completed.append(output)
            image_pending.append(output)
        except Exception as exc:
            failed.append({
                **item,
                "status": "failed",
                "calculator_hq_pass": False,
                "error": f"{type(exc).__name__}: {exc}",
                "failed_at": now_iso(),
            })

    processed = {str(item.get("slug")) for item in completed + failed}
    remaining = [
        item for item in queue.get("pending", [])
        if str(item.get("slug")) not in processed
    ]
    queue["pending"] = remaining
    queue["completed"] = list(queue.get("completed", [])) + completed
    queue["failed"] = list(queue.get("failed", [])) + failed
    queue["status"] = "completed" if not remaining and not failed else ("partial" if completed else "failed")
    queue["updated_at"] = now_iso()

    created_at = now_iso()
    image_queue = {
        "department": "image",
        "status": "ready" if image_pending else "blocked",
        "created_at": created_at,
        "pending": image_pending,
        "completed": [],
        "failed": [],
    }
    report = {
        "department": "calculator_hq",
        "status": "completed" if completed and not failed else ("partial" if completed else "failed"),
        "requested": len(pending),
        "completed_count": len(completed),
        "failed_count": len(failed),
        "image_ready_count": len(image_pending),
        "created_at": created_at,
        "items": completed,
        "failures": failed,
        "handoff": {"next_department": "image", "queue_path": OUTPUT_QUEUE.as_posix()},
        "pass": len(completed) == len(pending) and not failed,
    }
    save_json(root / REPORT_PATH, report)
    save_json(root / OUTPUT_QUEUE, image_queue)
    return report

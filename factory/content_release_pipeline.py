from __future__ import annotations

from pathlib import Path
from typing import Any

from .utils import now_iso, relative_posix, save_json
from .cms import save_article


def _gate_summary(handoffs: list[dict[str, Any]]) -> dict[str, Any]:
    failed = []
    for handoff in handoffs:
        gate = handoff.get("gate", {})
        if not gate.get("pass", False):
            failed.append({
                "department": handoff.get("department", "unknown"),
                "blockers": gate.get("blockers", []),
            })
    return {"pass": not failed, "failed": failed}


def finalize_content_result(
    project_root: Path,
    *,
    seo: dict[str, Any],
    html: str,
    qa: dict[str, Any],
    research: dict[str, Any],
    handoffs: list[dict[str, Any]],
) -> dict[str, Any]:
    """Save a draft always and promote it only when every release gate passes."""
    root = project_root.resolve()
    draft = save_article(root, seo, html, qa, research, publish=False, overwrite=True)
    gates = _gate_summary(handoffs)
    research_ready = bool(research.get("ready_for_publish", False))
    qa_ready = bool(qa.get("pass", False))
    ready = bool(gates["pass"] and research_ready and qa_ready)

    result: dict[str, Any] = {
        "status": "ready_for_release" if ready else "draft_saved_review_required",
        "ready_for_release": ready,
        "draft": draft,
        "qa_score": qa.get("score", 0),
        "evidence_score": research.get("evidence_score", 0),
        "gate_summary": gates,
        "created_at": now_iso(),
    }

    if ready:
        article = save_article(root, seo, html, qa, research, publish=True, overwrite=True)
        result["article"] = article
        queue_path = root / "factory" / "output" / "cms_release_queue.json"
        queue = {
            "status": "queued",
            "article_path": article["article_path"],
            "canonical": article["canonical"],
            "queued_at": now_iso(),
        }
        save_json(queue_path, queue)
        result["cms_release_queue"] = relative_posix(queue_path, root)
    else:
        review_path = root / "factory" / "output" / "content_review_required.json"
        save_json(review_path, result)
        result["review_report"] = relative_posix(review_path, root)

    report_path = root / "factory" / "output" / "content_release_report.json"
    save_json(report_path, result)
    result["report_path"] = relative_posix(report_path, root)
    return result

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

from .factory_brain import normalize_topics, run_factory_brain
from .utils import now_iso, save_json


def _load_state(path: Path) -> dict:
    if not path.exists():
        return {"completed": [], "blocked": [], "runs": 0}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"completed": [], "blocked": [], "runs": 0}
    return {
        "completed": list(payload.get("completed", [])),
        "blocked": list(payload.get("blocked", [])),
        "runs": int(payload.get("runs", 0)),
    }


def run_brain_scheduler(
    project_root: Path,
    topics: Iterable[str],
    batch_size: int = 20,
    continue_on_block: bool = True,
    reset: bool = False,
) -> dict:
    root = project_root.resolve()
    queue = normalize_topics(topics)
    if batch_size < 1:
        raise ValueError("batch_size must be at least 1")
    if not queue:
        raise ValueError("At least one topic is required.")

    output_dir = root / "factory" / "output"
    state_path = output_dir / "brain_scheduler_state.json"
    if reset and state_path.exists():
        state_path.unlink()

    state = _load_state(state_path)
    completed = set(state["completed"])
    blocked = set(state["blocked"])
    pending = [topic for topic in queue if topic not in completed]
    selected = pending[:batch_size]

    run_results: list[dict] = []
    for topic in selected:
        report = run_factory_brain(
            root,
            [topic],
            stop_on_block=not continue_on_block,
        )
        topic_result = report.get("topics", [{}])[0]
        status = topic_result.get("status") or report.get("status")
        item = {
            "topic": topic,
            "status": status,
            "workflow_id": topic_result.get("workflow_id"),
            "article_path": topic_result.get("article_path"),
            "qa_score": topic_result.get("qa_score"),
        }
        run_results.append(item)
        if status == "waiting_user_approval":
            completed.add(topic)
            blocked.discard(topic)
        else:
            blocked.add(topic)
            if not continue_on_block:
                break

    remaining = [topic for topic in queue if topic not in completed]
    state_payload = {
        "factory_version": "2.056",
        "runs": state["runs"] + 1,
        "completed": [topic for topic in queue if topic in completed],
        "blocked": [topic for topic in queue if topic in blocked],
        "remaining": remaining,
        "updated_at": now_iso(),
    }
    save_json(state_path, state_payload)

    status = "completed" if not remaining else ("blocked" if blocked and not continue_on_block else "paused")
    report = {
        "factory_version": "2.056",
        "status": status,
        "requested_topics": len(queue),
        "selected_topics": len(selected),
        "processed_this_run": len(run_results),
        "completed_total": len(state_payload["completed"]),
        "blocked_total": len(state_payload["blocked"]),
        "remaining_total": len(remaining),
        "results": run_results,
        "generated_articles": [item["article_path"] for item in run_results if item.get("article_path")],
        "state_file": str(state_path),
        "next_action": "review_approval_center" if status == "completed" else "run_scheduler_again",
        "created_at": now_iso(),
    }
    save_json(output_dir / "brain_scheduler_report.json", report)
    return report

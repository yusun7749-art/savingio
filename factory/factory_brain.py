from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

from .automation_cycle import run_automation_cycle
from .utils import now_iso, save_json


def normalize_topics(topics: Iterable[str]) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for raw in topics:
        topic = " ".join(str(raw).strip().split())
        if not topic or topic in seen:
            continue
        seen.add(topic)
        cleaned.append(topic)
    return cleaned


def run_factory_brain(
    project_root: Path,
    topics: Iterable[str],
    evidence_files: Iterable[Path] | None = None,
    stop_on_block: bool = True,
) -> dict:
    root = project_root.resolve()
    normalized = normalize_topics(topics)
    if not normalized:
        raise ValueError("At least one non-empty topic is required.")

    evidence = [Path(p) for p in (evidence_files or [])]
    results: list[dict] = []
    completed = 0
    blocked = 0

    for topic in normalized:
        try:
            result = run_automation_cycle(topic, root, evidence, draft_on_block=True)
        except TypeError as exc:
            if "draft_on_block" not in str(exc):
                raise
            result = run_automation_cycle(topic, root, evidence)
        cms_packet = result.get("packets", {}).get("cms", {})
        results.append({
            "topic": topic,
            "workflow_id": result.get("workflow_id"),
            "status": result.get("status"),
            "handoff_count": result.get("handoff_count", 0),
            "article_path": cms_packet.get("article_path"),
            "qa_score": cms_packet.get("qa_score"),
        })
        if result.get("status") == "waiting_user_approval":
            completed += 1
        else:
            blocked += 1
            if stop_on_block:
                break

    status = "waiting_user_approval" if blocked == 0 and completed == len(normalized) else "blocked"
    report = {
        "factory_version": "2.056",
        "status": status,
        "requested_topics": len(normalized),
        "processed_topics": len(results),
        "completed_topics": completed,
        "blocked_topics": blocked,
        "topics": results,
        "next_action": "review_approval_center" if status == "waiting_user_approval" else "review_blocked_department",
        "created_at": now_iso(),
    }
    save_json(root / "factory" / "output" / "factory_brain_report.json", report)
    return report


def read_topics_file(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8-sig")
    if path.suffix.lower() == ".json":
        payload = json.loads(text)
        if isinstance(payload, dict):
            payload = payload.get("topics", [])
        if not isinstance(payload, list):
            raise ValueError("JSON topics file must contain a list or {'topics': [...]}.")
        return normalize_topics(str(x) for x in payload)
    return normalize_topics(line for line in text.splitlines() if not line.lstrip().startswith("#"))

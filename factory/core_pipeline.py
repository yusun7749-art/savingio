from __future__ import annotations

import hashlib
import json
import traceback
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from .automation_cycle import run_automation_cycle
from .factory_brain import normalize_topics
from .utils import now_iso, save_json


@dataclass(frozen=True)
class TopicJob:
    topic: str
    job_id: str


def _job_id(topic: str) -> str:
    return hashlib.sha256(topic.encode("utf-8")).hexdigest()[:16]


def build_jobs(topics: Iterable[str]) -> list[TopicJob]:
    return [TopicJob(topic=t, job_id=_job_id(t)) for t in normalize_topics(topics)]


def _load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def _state_path(root: Path) -> Path:
    return root / "factory" / "state" / "core_pipeline_state.json"


def _report_path(root: Path) -> Path:
    return root / "factory" / "output" / "core_pipeline_report.json"


def run_core_pipeline(
    project_root: Path,
    topics: Iterable[str],
    *,
    evidence_files: Iterable[Path] | None = None,
    continue_on_error: bool = True,
    resume: bool = True,
    draft_on_block: bool = True,
) -> dict[str, Any]:
    """Run the connected Factory departments for many topics.

    The pipeline is resumable and idempotent per normalized topic. A completed job is
    skipped on later runs unless resume=False. Failed jobs retain their traceback and
    can be retried on the next run.
    """
    root = project_root.resolve()
    jobs = build_jobs(topics)
    if not jobs:
        raise ValueError("At least one non-empty topic is required.")

    state_path = _state_path(root)
    state_path.parent.mkdir(parents=True, exist_ok=True)
    previous = _load_json(state_path, {"jobs": {}})
    previous_jobs = previous.get("jobs", {}) if isinstance(previous, dict) else {}
    if not isinstance(previous_jobs, dict):
        previous_jobs = {}

    evidence = [Path(p).resolve() for p in (evidence_files or [])]
    current_jobs: dict[str, dict[str, Any]] = dict(previous_jobs) if resume else {}
    results: list[dict[str, Any]] = []
    completed = skipped = blocked = failed = 0

    for job in jobs:
        prior = current_jobs.get(job.job_id, {})
        if resume and prior.get("status") in {"waiting_user_approval", "draft_saved_review_required"}:
            skipped += 1
            results.append({
                "job_id": job.job_id,
                "topic": job.topic,
                "status": "skipped_existing",
                "previous_status": prior.get("status"),
                "workflow_id": prior.get("workflow_id"),
                "article_path": prior.get("article_path"),
            })
            continue

        started_at = now_iso()
        current_jobs[job.job_id] = {
            "topic": job.topic,
            "status": "running",
            "started_at": started_at,
            "updated_at": started_at,
        }
        save_json(state_path, {"version": "1.0", "jobs": current_jobs, "updated_at": now_iso()})

        try:
            cycle = run_automation_cycle(
                job.topic,
                root,
                evidence_files=evidence,
                draft_on_block=draft_on_block,
            )
            status = str(cycle.get("status", "unknown"))
            cms = cycle.get("packets", {}).get("cms", {}) or {}
            record = {
                "job_id": job.job_id,
                "topic": job.topic,
                "status": status,
                "workflow_id": cycle.get("workflow_id"),
                "handoff_count": cycle.get("handoff_count", 0),
                "article_path": cms.get("article_path"),
                "qa_score": cms.get("qa_score"),
                "started_at": started_at,
                "completed_at": now_iso(),
            }
            current_jobs[job.job_id] = record
            results.append(record)
            if status == "waiting_user_approval":
                completed += 1
            else:
                blocked += 1
        except Exception as exc:  # keep the batch alive and preserve diagnostics
            failed += 1
            record = {
                "job_id": job.job_id,
                "topic": job.topic,
                "status": "failed",
                "error_type": type(exc).__name__,
                "error": str(exc),
                "traceback": traceback.format_exc(),
                "started_at": started_at,
                "completed_at": now_iso(),
            }
            current_jobs[job.job_id] = record
            results.append(record)
            if not continue_on_error:
                save_json(state_path, {"version": "1.0", "jobs": current_jobs, "updated_at": now_iso()})
                raise
        finally:
            save_json(state_path, {"version": "1.0", "jobs": current_jobs, "updated_at": now_iso()})

    report = {
        "factory_version": "V3.006",
        "status": "completed" if failed == 0 else "completed_with_errors",
        "requested_topics": len(jobs),
        "processed_topics": len(jobs) - skipped,
        "completed_topics": completed,
        "blocked_topics": blocked,
        "failed_topics": failed,
        "skipped_topics": skipped,
        "results": results,
        "state_file": str(state_path.relative_to(root)).replace("\\", "/"),
        "created_at": now_iso(),
    }
    save_json(_report_path(root), report)
    return report

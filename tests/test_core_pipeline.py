from __future__ import annotations

import json
from pathlib import Path

import factory.core_pipeline as core


def test_build_jobs_normalizes_and_deduplicates():
    jobs = core.build_jobs([" 전기요금   절약 ", "전기요금 절약", "", "수도요금 절약"])
    assert [job.topic for job in jobs] == ["전기요금 절약", "수도요금 절약"]
    assert len({job.job_id for job in jobs}) == 2


def test_core_pipeline_resumes_completed_jobs(tmp_path: Path, monkeypatch):
    (tmp_path / "factory" / "config").mkdir(parents=True)
    calls: list[str] = []

    def fake_cycle(topic, project_root, evidence_files=None, draft_on_block=False):
        calls.append(topic)
        return {
            "workflow_id": "wf-" + topic,
            "status": "waiting_user_approval",
            "handoff_count": 8,
            "packets": {"cms": {"article_path": f"articles/{topic}.html", "qa_score": 95}},
        }

    monkeypatch.setattr(core, "run_automation_cycle", fake_cycle)
    first = core.run_core_pipeline(tmp_path, ["전기요금 절약"])
    second = core.run_core_pipeline(tmp_path, ["전기요금 절약"])

    assert first["completed_topics"] == 1
    assert second["skipped_topics"] == 1
    assert calls == ["전기요금 절약"]
    state = json.loads((tmp_path / "factory" / "state" / "core_pipeline_state.json").read_text(encoding="utf-8"))
    assert next(iter(state["jobs"].values()))["status"] == "waiting_user_approval"


def test_core_pipeline_keeps_running_after_failure(tmp_path: Path, monkeypatch):
    (tmp_path / "factory" / "config").mkdir(parents=True)

    def fake_cycle(topic, project_root, evidence_files=None, draft_on_block=False):
        if topic == "실패":
            raise RuntimeError("boom")
        return {
            "workflow_id": "wf-ok",
            "status": "draft_saved_review_required",
            "handoff_count": 7,
            "packets": {"cms": {"article_path": "factory/output/drafts/ok.html"}},
        }

    monkeypatch.setattr(core, "run_automation_cycle", fake_cycle)
    report = core.run_core_pipeline(tmp_path, ["실패", "성공"], continue_on_error=True)

    assert report["failed_topics"] == 1
    assert report["blocked_topics"] == 1
    assert report["processed_topics"] == 2
    assert (tmp_path / "factory" / "output" / "core_pipeline_report.json").exists()

from pathlib import Path

import pytest

from factory import brain_scheduler


def test_scheduler_processes_batch_and_saves_state(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    def fake_brain(root, topics, stop_on_block=True):
        topic = list(topics)[0]
        return {"status": "waiting_user_approval", "topics": [{"topic": topic, "status": "waiting_user_approval", "workflow_id": topic}]}

    monkeypatch.setattr(brain_scheduler, "run_factory_brain", fake_brain)
    report = brain_scheduler.run_brain_scheduler(tmp_path, ["A", "B", "C"], batch_size=2)
    assert report["processed_this_run"] == 2
    assert report["completed_total"] == 2
    assert report["remaining_total"] == 1
    assert (tmp_path / "factory/output/brain_scheduler_state.json").exists()


def test_scheduler_resumes_without_reprocessing(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    calls = []
    def fake_brain(root, topics, stop_on_block=True):
        topic = list(topics)[0]
        calls.append(topic)
        return {"status": "waiting_user_approval", "topics": [{"status": "waiting_user_approval", "workflow_id": topic}]}

    monkeypatch.setattr(brain_scheduler, "run_factory_brain", fake_brain)
    brain_scheduler.run_brain_scheduler(tmp_path, ["A", "B"], batch_size=1)
    report = brain_scheduler.run_brain_scheduler(tmp_path, ["A", "B"], batch_size=1)
    assert calls == ["A", "B"]
    assert report["status"] == "completed"


def test_scheduler_validates_batch_size(tmp_path: Path):
    with pytest.raises(ValueError):
        brain_scheduler.run_brain_scheduler(tmp_path, ["A"], batch_size=0)

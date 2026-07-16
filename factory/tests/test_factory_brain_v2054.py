from pathlib import Path

import pytest

from factory import factory_brain


def test_normalize_topics_deduplicates_and_ignores_blank():
    assert factory_brain.normalize_topics(["  전기요금  ", "", "전기요금", "월급   관리"]) == ["전기요금", "월급 관리"]


def test_read_topics_file_text(tmp_path: Path):
    path = tmp_path / "topics.txt"
    path.write_text("# comment\n전기요금\n\n월급 관리\n", encoding="utf-8")
    assert factory_brain.read_topics_file(path) == ["전기요금", "월급 관리"]


def test_factory_brain_writes_summary(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    calls = []
    def fake_cycle(topic, root, evidence):
        calls.append(topic)
        return {"workflow_id": f"wf-{topic}", "status": "waiting_user_approval", "handoff_count": 11}
    monkeypatch.setattr(factory_brain, "run_automation_cycle", fake_cycle)
    report = factory_brain.run_factory_brain(tmp_path, ["전기요금", "월급 관리"])
    assert report["status"] == "waiting_user_approval"
    assert report["processed_topics"] == 2
    assert calls == ["전기요금", "월급 관리"]
    assert (tmp_path / "factory/output/factory_brain_report.json").exists()


def test_factory_brain_stops_on_block(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    def fake_cycle(topic, root, evidence):
        status = "blocked" if topic == "막힘" else "waiting_user_approval"
        return {"workflow_id": topic, "status": status, "handoff_count": 3}
    monkeypatch.setattr(factory_brain, "run_automation_cycle", fake_cycle)
    report = factory_brain.run_factory_brain(tmp_path, ["막힘", "다음"])
    assert report["status"] == "blocked"
    assert report["processed_topics"] == 1

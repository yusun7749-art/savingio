from pathlib import Path

from factory.automation_hq import Stage, run_factory_core


def test_core_automation_runs_all_stages_and_writes_checkpoint(tmp_path: Path):
    calls: list[str] = []

    def planning(root, count, topics):
        calls.append("planning")
        return {"pass": True, "status": "completed", "selected_count": count}

    def queue_stage(name):
        def runner(root, limit=None):
            calls.append(name)
            return {"pass": True, "status": "completed", "completed_count": 1, "failed_count": 0}
        return runner

    stages = (
        Stage("planning", "기획본부", planning),
        Stage("research", "조사본부", queue_stage("research")),
        Stage("writer", "작가본부", queue_stage("writer")),
    )
    report = run_factory_core(tmp_path, count=1, topics=["전기요금 절약"], resume=False, stages=stages)

    assert report["pass"] is True
    assert report["completed_stage_count"] == 3
    assert calls == ["planning", "research", "writer"]
    assert (tmp_path / "factory/output/automation/core_automation_state.json").is_file()
    assert (tmp_path / "factory/output/automation/core_automation_report.json").is_file()


def test_core_automation_stops_on_failed_stage(tmp_path: Path):
    def planning(root, count, topics):
        return {"pass": True, "selected_count": count}

    def broken(root, limit=None):
        return {"pass": False, "status": "failed"}

    def never(root, limit=None):
        raise AssertionError("must not run")

    stages = (
        Stage("planning", "기획본부", planning),
        Stage("research", "조사본부", broken),
        Stage("writer", "작가본부", never),
    )
    report = run_factory_core(tmp_path, count=1, topics=["주제"], resume=False, stages=stages)

    assert report["pass"] is False
    assert report["failed_stage"] == "research"
    assert report["completed_stages"] == ["planning"]


def test_core_completion_includes_automation_contract(tmp_path: Path, monkeypatch):
    from factory.core_completion import audit_core_departments

    report = audit_core_departments(tmp_path, contracts=())
    assert report["automation"]["pass"] is True
    assert report["pass"] is True

from __future__ import annotations

import json
from pathlib import Path

import factory.department_automation as automation


def _result(count: int = 1) -> dict:
    return {"pass": True, "requested": count, "completed_count": count, "failed_count": 0}


def test_department_automation_runs_all_stages_and_checkpoints(tmp_path: Path, monkeypatch):
    calls: list[str] = []

    def planning(root: Path, count: int, topics=None):
        calls.append("planning")
        return {"pass": True, "requested": count, "selected_count": count, "failed_count": 0}

    monkeypatch.setattr(automation, "create_plan", planning)
    replacements = {
        "research": lambda root, limit=None: calls.append("research") or _result(),
        "writer": lambda root, limit=None: calls.append("writer") or _result(),
        "seo": lambda root, limit=None: calls.append("seo") or _result(),
        "calculator": lambda root, limit=None: calls.append("calculator") or _result(),
        "image": lambda root, limit=None: calls.append("image") or _result(),
        "qa1": lambda root, limit=None: calls.append("qa1") or _result(),
        "qa2": lambda root, limit=None: calls.append("qa2") or _result(),
        "cms": lambda root, limit=None: calls.append("cms") or _result(),
    }
    monkeypatch.setattr(
        automation,
        "PIPELINE_STAGES",
        tuple(automation.Stage(name, name, runner) for name, runner in replacements.items()),
    )

    report = automation.run_department_automation(tmp_path, ["전기요금 절약"])

    assert report["pass"] is True
    assert report["status"] == "completed"
    assert calls == ["planning", "research", "writer", "seo", "calculator", "image", "qa1", "qa2", "cms"]
    state = json.loads((tmp_path / automation.STATE_PATH).read_text(encoding="utf-8"))
    assert state["completed_stages"] == calls


def test_department_automation_stops_on_failed_stage(tmp_path: Path, monkeypatch):
    monkeypatch.setattr(
        automation,
        "create_plan",
        lambda root, count, topics=None: {"pass": True, "requested": count, "selected_count": count, "failed_count": 0},
    )
    monkeypatch.setattr(
        automation,
        "PIPELINE_STAGES",
        (
            automation.Stage("research", "조사본부", lambda root, limit=None: _result()),
            automation.Stage("writer", "작가본부", lambda root, limit=None: {"pass": False, "failed_count": 1}),
            automation.Stage("seo", "SEO본부", lambda root, limit=None: (_ for _ in ()).throw(AssertionError("must not run"))),
        ),
    )

    report = automation.run_department_automation(tmp_path, ["주제"])

    assert report["pass"] is False
    assert report["failed_stage"] == "writer"
    assert report["completed_stages"] == ["planning", "research"]


def test_department_automation_resume_skips_completed_stages(tmp_path: Path, monkeypatch):
    state = automation._new_state(["주제"], 1)
    state["status"] = "failed"
    state["completed_stages"] = ["planning", "research"]
    state["failed_stage"] = "writer"
    automation._save_state(tmp_path, state)

    calls: list[str] = []
    monkeypatch.setattr(automation, "create_plan", lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("planning reran")))
    monkeypatch.setattr(
        automation,
        "PIPELINE_STAGES",
        (
            automation.Stage("research", "조사본부", lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("research reran"))),
            automation.Stage("writer", "작가본부", lambda root, limit=None: calls.append("writer") or _result()),
        ),
    )

    report = automation.run_department_automation(tmp_path, ["ignored"], resume=True)

    assert report["pass"] is True
    assert calls == ["writer"]
    assert report["completed_stages"] == ["planning", "research", "writer"]

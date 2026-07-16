from __future__ import annotations

import json
from pathlib import Path

from factory.department_automation import DepartmentAutomation, REPORT_PATH, STATE_PATH, Stage


def _result(name: str, slug: str = "sample") -> dict:
    return {"department": name, "pass": True, "items": [{"slug": slug, "qa2_pass": True}]}


def test_automation_runs_all_stages_and_checkpoints(tmp_path: Path, monkeypatch) -> None:
    engine = DepartmentAutomation(tmp_path, 1)
    calls: list[str] = []
    stages = [Stage(name, lambda items, name=name: calls.append(name) or _result(name)) for name in ("planning", "research", "writing", "seo", "calculator_hq", "image", "qa1", "qa2")]
    article = tmp_path / "articles/sample.html"
    article.parent.mkdir(parents=True)
    article.write_text("ok", encoding="utf-8")
    stages.append(Stage("cms", lambda items: calls.append("cms") or {"pass": True, "items": [{"article_path": "articles/sample.html"}]}))
    monkeypatch.setattr(engine, "_stages", lambda: stages)

    report = engine.run()

    assert report["pass"] is True
    assert calls[-1] == "cms"
    assert (tmp_path / STATE_PATH).is_file()
    assert (tmp_path / REPORT_PATH).is_file()
    state = json.loads((tmp_path / STATE_PATH).read_text(encoding="utf-8"))
    assert state["status"] == "completed"
    assert len(state["completed_stages"]) == 9


def test_automation_resume_skips_verified_stages(tmp_path: Path, monkeypatch) -> None:
    engine = DepartmentAutomation(tmp_path, 1)
    state = {
        "version": 1,
        "status": "failed",
        "count": 1,
        "completed_stages": ["planning"],
        "stage_results": {"planning": _result("planning")},
    }
    path = tmp_path / STATE_PATH
    path.parent.mkdir(parents=True)
    path.write_text(json.dumps(state), encoding="utf-8")
    calls: list[str] = []
    monkeypatch.setattr(engine, "_stages", lambda: [
        Stage("planning", lambda items: calls.append("planning") or _result("planning")),
        Stage("research", lambda items: calls.append("research") or _result("research")),
    ])

    report = engine.run(resume=True)

    assert calls == ["research"]
    assert report["skipped_stages"] == ["planning"]
    assert report["pass"] is True


def test_automation_stops_and_records_failure(tmp_path: Path, monkeypatch) -> None:
    engine = DepartmentAutomation(tmp_path, 1)
    monkeypatch.setattr(engine, "_stages", lambda: [
        Stage("planning", lambda items: _result("planning")),
        Stage("research", lambda items: (_ for _ in ()).throw(RuntimeError("boom"))),
        Stage("writing", lambda items: _result("writing")),
    ])

    report = engine.run()

    assert report["pass"] is False
    assert report["failure"]["stage"] == "research"
    state = json.loads((tmp_path / STATE_PATH).read_text(encoding="utf-8"))
    assert state["status"] == "failed"
    assert state["completed_stages"] == ["planning"]

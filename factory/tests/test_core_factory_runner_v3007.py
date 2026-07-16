from __future__ import annotations

from pathlib import Path

import factory.core_factory_runner as runner


def _report(name: str, items=None, passed: bool = True) -> dict:
    return {
        "department": name,
        "status": "completed" if passed else "failed",
        "pass": passed,
        "completed_count": len(items or []),
        "failed_count": 0 if passed else 1,
        "items": list(items or []),
    }


def test_core_factory_runs_all_internal_departments(tmp_path: Path, monkeypatch) -> None:
    item = {"topic": "전기요금", "slug": "electricity", "qa2_pass": True, "article_path": "articles/electricity.html"}
    calls: list[str] = []
    monkeypatch.setattr(runner, "audit_core_departments", lambda root: {"pass": True})
    monkeypatch.setattr(runner, "create_plan", lambda root, count, topics: calls.append("planning") or {"pass": True, "selected_count": count, "items": item and [item]})
    monkeypatch.setattr(runner, "run_research_queue", lambda *a, **k: calls.append("research") or _report("research", [item]))
    monkeypatch.setattr(runner, "run_writer_queue", lambda *a, **k: calls.append("writer") or _report("writer", [item]))
    monkeypatch.setattr(runner, "run_seo_queue", lambda *a, **k: calls.append("seo") or _report("seo", [item]))
    monkeypatch.setattr(runner, "run_calculator_batch", lambda *a, **k: calls.append("calculator") or _report("calculator", [item]))
    monkeypatch.setattr(runner, "run_image_queue", lambda *a, **k: calls.append("image") or _report("image", [item]))
    monkeypatch.setattr(runner, "run_qa1_queue", lambda *a, **k: calls.append("qa1") or _report("qa1", [item]))
    monkeypatch.setattr(runner, "run_qa2_queue", lambda *a, **k: calls.append("qa2") or _report("qa2", [item]))
    monkeypatch.setattr(runner, "run_cms_queue", lambda *a, **k: calls.append("cms") or _report("cms", [item]))

    report = runner.run_core_factory(tmp_path, ["전기요금"])

    assert report["pass"] is True
    assert report["status"] == "content_ready"
    assert calls == ["planning", "research", "writer", "seo", "calculator", "image", "qa1", "qa2", "cms"]
    assert report["article_paths"] == ["articles/electricity.html"]
    assert (tmp_path / runner.REPORT_PATH).is_file()


def test_core_factory_stops_at_first_failed_department(tmp_path: Path, monkeypatch) -> None:
    item = {"topic": "전기요금", "slug": "electricity"}
    called_after_research = {"value": False}
    monkeypatch.setattr(runner, "audit_core_departments", lambda root: {"pass": True})
    monkeypatch.setattr(runner, "create_plan", lambda *a, **k: {"pass": True, "selected_count": 1, "items": [item]})
    monkeypatch.setattr(runner, "run_research_queue", lambda *a, **k: _report("research", [], passed=False))
    monkeypatch.setattr(runner, "run_writer_queue", lambda *a, **k: called_after_research.update(value=True) or _report("writer"))

    report = runner.run_core_factory(tmp_path, ["전기요금"])

    assert report["pass"] is False
    assert report["blocked_stage"] == "research"
    assert called_after_research["value"] is False


def test_core_factory_rejects_empty_topics(tmp_path: Path) -> None:
    try:
        runner.run_core_factory(tmp_path, ["  "])
    except ValueError as exc:
        assert "topic" in str(exc).lower()
    else:
        raise AssertionError("ValueError expected")

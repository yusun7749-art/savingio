from __future__ import annotations

from pathlib import Path

import factory.factory_core_automation as module


def _report(items=None):
    return {"pass": True, "status": "completed", "items": items or [{"topic": "t", "slug": "s", "qa2_pass": True}]}


def test_factory_core_runs_departments_in_order(monkeypatch, tmp_path: Path) -> None:
    calls: list[str] = []

    monkeypatch.setattr(module, "audit_core_departments", lambda root: {"pass": True, "departments": []})
    monkeypatch.setattr(module, "create_plan", lambda root, count, topics=None: calls.append("planning") or _report())
    monkeypatch.setattr(module, "run_research_queue", lambda root, limit=None: calls.append("research") or _report())
    monkeypatch.setattr(module, "run_writer_queue", lambda root, limit=None: calls.append("writer") or _report())
    monkeypatch.setattr(module, "run_seo_queue", lambda root, limit=None: calls.append("seo") or _report())
    monkeypatch.setattr(module, "run_calculator_batch", lambda root, limit=None, source_items=None: calls.append("calculator") or _report(source_items))
    monkeypatch.setattr(module, "run_image_queue", lambda root, limit=None, source_items=None: calls.append("image") or _report(source_items))
    monkeypatch.setattr(module, "run_qa1_queue", lambda root, limit=None, source_items=None: calls.append("qa1") or _report(source_items))
    monkeypatch.setattr(module, "run_qa2_queue", lambda root, limit=None, source_items=None: calls.append("qa2") or _report(source_items))
    monkeypatch.setattr(module, "run_cms_queue", lambda root, limit=None, source_items=None: calls.append("cms") or _report([{**source_items[0], "article_path": "articles/s.html"}]))

    result = module.run_factory_core(tmp_path, count=1, topics=["topic"])

    assert result["pass"] is True
    assert calls == ["planning", "research", "writer", "seo", "calculator", "image", "qa1", "qa2", "cms"]
    assert result["articles"][0]["article_path"] == "articles/s.html"
    assert (tmp_path / module.REPORT_PATH).is_file()


def test_factory_core_stops_on_failed_stage(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setattr(module, "audit_core_departments", lambda root: {"pass": True, "departments": []})
    monkeypatch.setattr(module, "create_plan", lambda root, count, topics=None: {"pass": False, "failures": ["x"]})

    try:
        module.run_factory_core(tmp_path, count=1, topics=["topic"])
    except RuntimeError as exc:
        assert "planning failed" in str(exc)
    else:
        raise AssertionError("failed stage must stop automation")

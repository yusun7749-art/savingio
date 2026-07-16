from __future__ import annotations

from pathlib import Path

import factory.planning_hq as planning_hq
import factory.research_hq as research_hq
import factory.writer_hq as writer_hq
import factory.seo_hq as seo_hq
import factory.calculator_hq_batch as calculator_hq_batch
import factory.image_hq as image_hq
import factory.qa1_hq as qa1_hq
import factory.qa2_hq as qa2_hq
import factory.cms_hq as cms_hq
from factory.pm_console import run_department_pipeline


def test_department_pipeline_calls_hqs_and_verifies_output(tmp_path: Path, monkeypatch) -> None:
    draft = tmp_path / "factory/output/drafts/sample.html"
    draft.parent.mkdir(parents=True)
    draft.write_text("<html><h1>sample</h1></html>", encoding="utf-8")
    calls: list[str] = []

    monkeypatch.setattr(planning_hq, "create_plan", lambda root, count: calls.append("planning") or {"pass": True})
    monkeypatch.setattr(research_hq, "run_research_queue", lambda root, limit=None: calls.append("research") or {"pass": True})
    monkeypatch.setattr(writer_hq, "run_writer_queue", lambda root, limit=None: calls.append("writer") or {"pass": True})
    monkeypatch.setattr(
        seo_hq,
        "run_seo_queue",
        lambda root, limit=None: calls.append("seo") or {
            "pass": True,
            "items": [{"topic": "sample", "slug": "sample", "draft_path": "factory/output/drafts/sample.html"}],
            "failures": [],
        },
    )
    monkeypatch.setattr(calculator_hq_batch, "run_calculator_batch", lambda root, limit=None, source_items=None: {"pass": True, "items": list(source_items or [])})
    monkeypatch.setattr(image_hq, "run_image_queue", lambda root, limit=None, source_items=None: {"pass": True, "items": list(source_items or [])})
    monkeypatch.setattr(qa1_hq, "run_qa1_queue", lambda root, limit=None, source_items=None: {"pass": True, "items": list(source_items or [])})
    monkeypatch.setattr(qa2_hq, "run_qa2_queue", lambda root, limit=None, source_items=None: {"pass": True, "items": [{**item, "qa2_pass": True} for item in (source_items or [])]})
    monkeypatch.setattr(cms_hq, "run_cms_queue", lambda root, limit=None, source_items=None, overwrite=False: {"pass": True, "items": list(source_items or [])})

    report = run_department_pipeline(tmp_path, 1)

    assert calls == ["planning", "research", "writer", "seo"]
    assert report["pass"] is True
    assert report["verification"]["verified_count"] == 1
    assert (tmp_path / "factory/output/controller_report.json").is_file()
    assert (tmp_path / "factory/output/controller_status.json").is_file()


def test_department_pipeline_fails_verification_for_missing_draft(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr(planning_hq, "create_plan", lambda root, count: {"pass": True})
    monkeypatch.setattr(research_hq, "run_research_queue", lambda root, limit=None: {"pass": True})
    monkeypatch.setattr(writer_hq, "run_writer_queue", lambda root, limit=None: {"pass": True})
    monkeypatch.setattr(
        seo_hq,
        "run_seo_queue",
        lambda root, limit=None: {
            "pass": True,
            "items": [{"topic": "sample", "slug": "sample", "draft_path": "factory/output/drafts/missing.html"}],
            "failures": [],
        },
    )
    monkeypatch.setattr(calculator_hq_batch, "run_calculator_batch", lambda root, limit=None, source_items=None: {"pass": True, "items": list(source_items or [])})
    monkeypatch.setattr(image_hq, "run_image_queue", lambda root, limit=None, source_items=None: {"pass": True, "items": list(source_items or [])})
    monkeypatch.setattr(qa1_hq, "run_qa1_queue", lambda root, limit=None, source_items=None: {"pass": True, "items": list(source_items or [])})
    monkeypatch.setattr(qa2_hq, "run_qa2_queue", lambda root, limit=None, source_items=None: {"pass": True, "items": [{**item, "qa2_pass": True} for item in (source_items or [])]})
    monkeypatch.setattr(cms_hq, "run_cms_queue", lambda root, limit=None, source_items=None, overwrite=False: {"pass": True, "items": list(source_items or [])})

    report = run_department_pipeline(tmp_path, 1)

    assert report["pass"] is False
    assert report["verification"]["verified_count"] == 0
    assert len(report["verification"]["missing_files"]) == 1

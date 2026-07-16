from __future__ import annotations

import json
from pathlib import Path

import factory.calculator_hq_batch as calculator_batch
from factory.calculator_hq_batch import run_calculator_batch
from factory.core_completion import audit_core_departments


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def test_calculator_batch_injects_and_hands_off_to_image(tmp_path: Path, monkeypatch) -> None:
    draft = tmp_path / "factory/output/drafts/sample.html"
    draft.parent.mkdir(parents=True, exist_ok=True)
    draft.write_text("<html><body><h1>sample</h1></body></html>", encoding="utf-8")

    def fake_hq(topic, slug, project_root, html_path=None, execute=False):
        assert execute is True
        assert html_path == draft
        report = project_root / "factory/output/calculator" / f"{slug}-hq-report.json"
        _write_json(report, {"pass": True})
        return {
            "package": {"calculators": [{"calculator_id": "sample"}]},
            "registry_qa": {"pass": True},
            "html": {"changed": True, "executed": True},
        }

    monkeypatch.setattr(calculator_batch, "run_calculator_hq", fake_hq)
    report = run_calculator_batch(tmp_path, source_items=[{
        "topic": "테스트",
        "slug": "sample",
        "draft_path": "factory/output/drafts/sample.html",
    }])

    assert report["pass"] is True
    assert report["completed_count"] == 1
    assert report["items"][0]["calculator_hq_pass"] is True
    queue = json.loads((tmp_path / "factory/output/calculator/image_queue.json").read_text(encoding="utf-8"))
    assert queue["status"] == "ready"
    assert queue["pending"][0]["slug"] == "sample"


def test_calculator_batch_fails_for_missing_draft(tmp_path: Path) -> None:
    report = run_calculator_batch(tmp_path, source_items=[{
        "topic": "누락",
        "slug": "missing",
        "draft_path": "factory/output/drafts/missing.html",
    }])
    assert report["pass"] is False
    assert report["failed_count"] == 1


def test_core_completion_audit_verifies_all_department_contracts(tmp_path: Path) -> None:
    report = audit_core_departments(tmp_path)
    assert report["pass"] is True
    assert report["failed_count"] == 0
    assert report["department_count"] == 9
    assert report["chain"][4] == "Calculator HQ"
    assert (tmp_path / "factory/output/core_completion_report.json").is_file()

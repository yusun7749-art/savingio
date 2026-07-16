from __future__ import annotations

import json
from pathlib import Path

import pytest

from factory import core_automation


DEPARTMENTS = ["planning", "research", "writer", "seo", "image", "qa1", "qa2", "cms"]


def _patch_all(monkeypatch: pytest.MonkeyPatch, calls: list[str], fail_at: str | None = None) -> None:
    monkeypatch.setattr(core_automation, "audit_core_departments", lambda root: {"pass": True})

    def result(name: str):
        def runner(*args, **kwargs):
            calls.append(name)
            return {"department": name, "pass": name != fail_at, "completed_count": 1}
        return runner

    monkeypatch.setattr(core_automation, "create_plan", result("planning"))
    monkeypatch.setattr(core_automation, "run_research_queue", result("research"))
    monkeypatch.setattr(core_automation, "run_writer_queue", result("writer"))
    monkeypatch.setattr(core_automation, "run_seo_queue", result("seo"))
    monkeypatch.setattr(core_automation, "run_image_queue", result("image"))
    monkeypatch.setattr(core_automation, "run_qa1_queue", result("qa1"))
    monkeypatch.setattr(core_automation, "run_qa2_queue", result("qa2"))
    monkeypatch.setattr(core_automation, "run_cms_queue", result("cms"))


def test_full_core_chain_and_checkpoint(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []
    _patch_all(monkeypatch, calls)
    report = core_automation.run_core_automation(tmp_path, count=1, topics=["테스트 주제"])

    assert report["pass"] is True
    assert calls == DEPARTMENTS
    state = json.loads((tmp_path / core_automation.STATE_PATH).read_text(encoding="utf-8"))
    assert state["completed"] == DEPARTMENTS
    assert (tmp_path / core_automation.REPORT_PATH).is_file()


def test_resume_skips_completed_departments(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    state_path = tmp_path / core_automation.STATE_PATH
    state_path.parent.mkdir(parents=True)
    state_path.write_text(json.dumps({
        "completed": ["planning", "research", "writer"],
        "results": {name: {"pass": True} for name in ["planning", "research", "writer"]},
    }), encoding="utf-8")

    calls: list[str] = []
    _patch_all(monkeypatch, calls)
    report = core_automation.run_core_automation(tmp_path, resume=True)

    assert report["pass"] is True
    assert calls == ["seo", "image", "qa1", "qa2", "cms"]
    assert report["skipped"] == ["planning", "research", "writer"]


def test_strict_mode_stops_and_keeps_checkpoint(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []
    _patch_all(monkeypatch, calls, fail_at="seo")

    with pytest.raises(RuntimeError, match="SEO본부 검증 실패"):
        core_automation.run_core_automation(tmp_path, strict=True)

    state = json.loads((tmp_path / core_automation.STATE_PATH).read_text(encoding="utf-8"))
    assert state["completed"] == ["planning", "research", "writer"]
    assert calls == ["planning", "research", "writer", "seo"]


def test_contract_failure_blocks_execution(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(core_automation, "audit_core_departments", lambda root: {
        "pass": False,
        "departments": [{"department": "조사본부", "pass": False}],
    })
    with pytest.raises(RuntimeError, match="조사본부"):
        core_automation.run_core_automation(tmp_path)

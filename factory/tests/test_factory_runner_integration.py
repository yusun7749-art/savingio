from __future__ import annotations

import json
from pathlib import Path

import factory.factory_core_runner as manager


def _integration_ready(monkeypatch) -> None:
    import factory.runner_integration as integration
    monkeypatch.setattr(integration, "audit_runner_integration", lambda root: {
        "pass": True,
        "status": "ready",
        "checks": {},
    })


def test_manager_delegates_to_executor_and_persists_report(tmp_path: Path, monkeypatch) -> None:
    _integration_ready(monkeypatch)
    calls = {}

    def fake_executor(root, topics, *, evidence_files=None, limit=None):
        calls["root"] = root
        calls["topics"] = topics
        calls["evidence_files"] = evidence_files
        calls["limit"] = limit
        return {
            "pass": True,
            "status": "content_ready",
            "blocked_stage": None,
            "article_paths": ["articles/sample.html"],
        }

    import factory.core_factory_runner as executor
    monkeypatch.setattr(executor, "run_core_factory", fake_executor)

    evidence = tmp_path / "evidence.json"
    report = manager.run_managed_factory(
        tmp_path,
        ["  전기 요금  ", ""],
        evidence_files=[evidence],
        limit=1,
    )

    assert report["pass"] is True
    assert report["mode"] == "manager_executor"
    assert report["manager"] == "factory.factory_core_runner"
    assert report["executor"] == "factory.core_factory_runner"
    assert calls["topics"] == ["전기 요금"]
    assert calls["limit"] == 1
    assert report["article_paths"] == ["articles/sample.html"]

    state = json.loads((tmp_path / manager.STATE_PATH).read_text(encoding="utf-8"))
    persisted = json.loads((tmp_path / manager.REPORT_PATH).read_text(encoding="utf-8"))
    assert state["pass"] is True
    assert persisted["executor_report"]["status"] == "content_ready"


def test_manager_preserves_executor_blocked_stage(tmp_path: Path, monkeypatch) -> None:
    _integration_ready(monkeypatch)
    import factory.core_factory_runner as executor
    monkeypatch.setattr(
        executor,
        "run_core_factory",
        lambda *args, **kwargs: {
            "pass": False,
            "status": "blocked",
            "blocked_stage": "research",
            "article_paths": [],
        },
    )

    report = manager.run_managed_factory(tmp_path, ["전기요금"])

    assert report["pass"] is False
    assert report["status"] == "blocked"
    assert report["blocked_stage"] == "research"


def test_manager_converts_executor_exception_to_failed_report(tmp_path: Path, monkeypatch) -> None:
    _integration_ready(monkeypatch)
    import factory.core_factory_runner as executor

    def explode(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(executor, "run_core_factory", explode)
    report = manager.run_managed_factory(tmp_path, ["전기요금"])

    assert report["pass"] is False
    assert report["status"] == "failed"
    assert "RuntimeError: boom" in report["error"]


def test_manager_rejects_empty_topics(tmp_path: Path) -> None:
    try:
        manager.run_managed_factory(tmp_path, ["   "])
    except ValueError as exc:
        assert "topic" in str(exc).lower()
    else:
        raise AssertionError("ValueError expected")


def test_manager_blocks_before_executor_when_integration_fails(tmp_path: Path, monkeypatch) -> None:
    import factory.runner_integration as integration
    import factory.core_factory_runner as executor

    called = {"executor": False}
    monkeypatch.setattr(integration, "audit_runner_integration", lambda root: {"pass": False, "status": "blocked"})
    monkeypatch.setattr(executor, "run_core_factory", lambda *a, **k: called.update(executor=True) or {"pass": True})

    report = manager.run_managed_factory(tmp_path, ["전기요금"])

    assert report["pass"] is False
    assert report["blocked_stage"] == "runner_integration"
    assert called["executor"] is False

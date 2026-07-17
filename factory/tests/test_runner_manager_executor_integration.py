from pathlib import Path

import factory.factory_core_runner as manager
import factory.factory_cli as cli


def test_manager_delegates_topic_runs_to_official_executor(tmp_path: Path, monkeypatch) -> None:
    calls = []

    def fake_executor(root, topics, *, evidence_files=None, limit=None):
        calls.append((root, list(topics), evidence_files, limit))
        return {
            "status": "content_ready",
            "pass": True,
            "blocked_stage": None,
            "article_paths": ["articles/sample.html"],
            "stages": [
                {"name": "planning", "pass": True},
                {"name": "research", "pass": True},
                {"name": "writer", "pass": True},
            ],
        }

    import factory.core_factory_runner as executor
    monkeypatch.setattr(executor, "run_core_factory", fake_executor)

    report = manager.run_factory_core(
        tmp_path,
        count=1,
        resume=False,
        topics=["  전기요금   절약  "],
    )

    assert report["pass"] is True
    assert report["mode"] == "manager_to_executor"
    assert report["completed_stages"] == ["planning", "research", "writer"]
    assert calls == [(tmp_path.resolve(), ["전기요금 절약"], None, 1)]
    assert (tmp_path / manager.STATE_PATH).is_file()
    assert (tmp_path / manager.REPORT_PATH).is_file()


def test_manager_keeps_legacy_queue_mode_without_topics(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setattr(manager, "STAGES", ())
    report = manager.run_factory_core(tmp_path, count=1, resume=False)
    assert report["status"] == "completed"
    assert report["completed_stages"] == []
    assert report["pass"] is True


def test_cli_core_run_routes_to_manager(tmp_path: Path, monkeypatch, capsys) -> None:
    calls = []

    def fake_manager(root, count=20, resume=True, *, topics=None, evidence_files=None):
        calls.append((root, count, resume, topics, evidence_files))
        return {"pass": True, "status": "content_ready"}

    monkeypatch.setattr(manager, "run_factory_core", fake_manager)
    code = cli.main([
        "--project-root", str(tmp_path),
        "core-run", "주제 하나", "주제 둘",
        "--limit", "2",
        "--no-resume",
        "--evidence", "factory/input/research/official.json",
    ])

    assert code == 0
    assert calls == [(
        tmp_path.resolve(),
        2,
        False,
        ["주제 하나", "주제 둘"],
        [tmp_path.resolve() / "factory/input/research/official.json"],
    )]
    assert '"content_ready"' in capsys.readouterr().out

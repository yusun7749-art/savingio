from __future__ import annotations

import json
from pathlib import Path

import factory.run_factory as runner
from factory.preflight import run_preflight


def _minimal_root(tmp_path: Path) -> Path:
    for rel in ("factory/config", "factory/output", "factory/state", "articles", "calculators"):
        (tmp_path / rel).mkdir(parents=True, exist_ok=True)
    (tmp_path / "index.html").write_text("<html></html>", encoding="utf-8")
    (tmp_path / "ads.txt").write_text(
        "google.com, pub-7605193583747751, DIRECT, f08c47fec0942fa0\n",
        encoding="utf-8",
    )
    (tmp_path / "factory/config/article_dna.json").write_text('{"version":"test"}', encoding="utf-8")
    return tmp_path


def test_preflight_passes_minimal_house(tmp_path: Path) -> None:
    root = _minimal_root(tmp_path)
    report = run_preflight(root)
    assert report["pass"] is True
    assert report["publisher"]["wrong"] == {}
    assert (root / "factory/output/preflight_report.json").is_file()


def test_preflight_blocks_wrong_publisher(tmp_path: Path) -> None:
    root = _minimal_root(tmp_path)
    (root / "index.html").write_text("ca-pub-1111111111111111", encoding="utf-8")
    report = run_preflight(root)
    assert report["pass"] is False
    assert "publisher_lock_violation" in report["issues"]


def test_runner_executes_batch_after_preflight(tmp_path: Path, monkeypatch, capsys) -> None:
    root = _minimal_root(tmp_path)

    def fake_brain(project_root, topics, evidence_files=None, stop_on_block=True):
        assert project_root == root.resolve()
        assert topics == ["전기요금 절약"]
        return {"status": "waiting_user_approval", "processed_topics": 1}

    monkeypatch.setattr(runner, "run_factory_brain", fake_brain)
    code = runner.main(["--project-root", str(root), "--topic", "전기요금 절약"])
    assert code == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["processed_topics"] == 1

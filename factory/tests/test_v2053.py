from __future__ import annotations

import json
from pathlib import Path

from factory.start_factory import load_version, run_start_factory


def test_load_version_uses_version_json(tmp_path: Path) -> None:
    (tmp_path / "VERSION.json").write_text(json.dumps({"label": "V2.053"}), encoding="utf-8")
    assert load_version(tmp_path) == "V2.053"


def test_load_version_normalizes_numeric_version(tmp_path: Path) -> None:
    (tmp_path / "VERSION.json").write_text(json.dumps({"version": "2.053"}), encoding="utf-8")
    assert load_version(tmp_path) == "V2.053"


def test_launcher_bat_is_stable_and_visible() -> None:
    root = Path(__file__).resolve().parents[2]
    launcher = root / "00-START-FACTORY.bat"
    assert launcher.exists()
    text = launcher.read_text(encoding="utf-8")
    assert "factory.start_factory" in text
    assert "FACTORY-RELEASE-V2.053" not in text


def test_start_factory_stops_before_release_when_tests_fail(tmp_path: Path, monkeypatch) -> None:
    (tmp_path / "VERSION.json").write_text(json.dumps({"label": "V2.053"}), encoding="utf-8")
    monkeypatch.setattr("factory.start_factory._run", lambda *_args, **_kwargs: {"returncode": 1, "stdout": "", "stderr": "failed"})
    report = run_start_factory(tmp_path, execute=False, push=False)
    assert report["pass"] is False
    assert report["reason"] == "regression_warning_failed"

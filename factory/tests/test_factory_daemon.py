from __future__ import annotations

import json
import subprocess
from pathlib import Path

from factory.factory_daemon import _matching_changes, run_once


def _git_init(root: Path) -> None:
    subprocess.run(["git", "init", "-b", "main"], cwd=root, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=root, check=True)
    subprocess.run(["git", "config", "user.name", "Test"], cwd=root, check=True)


def test_matching_changes_respects_safe_scope(tmp_path: Path) -> None:
    _git_init(tmp_path)
    (tmp_path / "index.html").write_text("old", encoding="utf-8")
    (tmp_path / "other.txt").write_text("old", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=tmp_path, check=True)
    subprocess.run(["git", "commit", "-m", "init"], cwd=tmp_path, check=True, capture_output=True)
    (tmp_path / "index.html").write_text("new", encoding="utf-8")
    (tmp_path / "other.txt").write_text("new", encoding="utf-8")
    assert _matching_changes(tmp_path, ["index.html"]) == ["index.html"]


def test_run_once_is_idle_without_safe_changes(tmp_path: Path) -> None:
    _git_init(tmp_path)
    (tmp_path / "index.html").write_text("old", encoding="utf-8")
    subprocess.run(["git", "add", "."], cwd=tmp_path, check=True)
    subprocess.run(["git", "commit", "-m", "init"], cwd=tmp_path, check=True, capture_output=True)
    config = tmp_path / "factory/config"
    config.mkdir(parents=True)
    (config / "factory_daemon.json").write_text(json.dumps({"include_paths": ["index.html"]}), encoding="utf-8")
    result = run_once(tmp_path)
    assert result["pass"] is True
    assert result["status"] == "idle"

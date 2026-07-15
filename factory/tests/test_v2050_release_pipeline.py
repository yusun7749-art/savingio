import json
from pathlib import Path

import pytest

from factory.one_click_release import GitChange, ReleaseBlocked
from factory.release_scope_manager import (
    build_release_scope,
    preview_release_scope,
    write_release_scope,
)


def test_build_scope_uses_only_nonvolatile_changes(monkeypatch, tmp_path: Path):
    changes = [
        GitChange(" M", "factory/release_pipeline.py"),
        GitChange("??", "factory/output/run.log"),
        GitChange(" M", "articles/unrelated.html"),
    ]
    monkeypatch.setattr("factory.release_scope_manager.git_changes", lambda root: changes)
    scope = build_release_scope(tmp_path, candidates=["factory/release_pipeline.py"])
    assert scope["files"] == ["factory/release_pipeline.py"]
    assert scope["version"] == "V2.050"


def test_build_scope_blocks_unapproved_deletion(monkeypatch, tmp_path: Path):
    monkeypatch.setattr(
        "factory.release_scope_manager.git_changes",
        lambda root: [GitChange(" D", "factory/old.py")],
    )
    with pytest.raises(ReleaseBlocked):
        build_release_scope(tmp_path, candidates=["factory/old.py"])


def test_preview_separates_unrelated_changes(monkeypatch, tmp_path: Path):
    changes = [
        GitChange(" M", "factory/release_pipeline.py"),
        GitChange(" M", "articles/unrelated.html"),
    ]
    monkeypatch.setattr("factory.release_scope_manager.git_changes", lambda root: changes)
    preview = preview_release_scope(tmp_path, {"files": ["factory/release_pipeline.py"]})
    assert preview["pass"] is True
    assert preview["selected_files"] == ["factory/release_pipeline.py"]
    assert preview["unrelated_changes"] == ["articles/unrelated.html"]


def test_write_scope_creates_scope_and_preview(monkeypatch, tmp_path: Path):
    changes = [GitChange("??", "factory/release_pipeline.py")]
    monkeypatch.setattr("factory.release_scope_manager.git_changes", lambda root: changes)
    scope = {"version": "V2.050", "commit_message": "test", "files": ["factory/release_pipeline.py"]}
    preview = write_release_scope(tmp_path, scope)
    saved_scope = json.loads((tmp_path / "factory/config/release_scope.json").read_text(encoding="utf-8"))
    saved_preview = json.loads((tmp_path / "factory/output/release_scope_preview.json").read_text(encoding="utf-8"))
    assert saved_scope["files"] == ["factory/release_pipeline.py"]
    assert saved_preview["selected_count"] == 1
    assert preview["pass"] is True

import json
from pathlib import Path

import pytest

from factory.one_click_release import (
    GitChange,
    ReleaseBlocked,
    _normalize_path,
    load_release_scope,
    scoped_release_changes,
)


def test_normalize_path_rejects_dot_and_parent():
    with pytest.raises(ReleaseBlocked):
        _normalize_path(".")
    with pytest.raises(ReleaseBlocked):
        _normalize_path("../secret.txt")


def test_release_scope_rejects_volatile_files(tmp_path: Path):
    config = tmp_path / "factory/config"
    config.mkdir(parents=True)
    (config / "release_scope.json").write_text(
        json.dumps({"files": ["factory/__pycache__/doctor.pyc"]}),
        encoding="utf-8",
    )
    with pytest.raises(ReleaseBlocked):
        load_release_scope(tmp_path)


def test_release_scope_deduplicates_and_normalizes(tmp_path: Path):
    config = tmp_path / "factory/config"
    config.mkdir(parents=True)
    (config / "release_scope.json").write_text(
        json.dumps({"files": ["./factory/doctor.py", "factory\\doctor.py"]}),
        encoding="utf-8",
    )
    payload = load_release_scope(tmp_path)
    assert payload["files"] == ["factory/doctor.py"]


def test_scoped_changes_leave_unrelated_files_untouched(monkeypatch, tmp_path: Path):
    changes = [
        GitChange(" M", "factory/one_click_release.py"),
        GitChange(" M", "articles/unrelated.html"),
        GitChange(" M", "factory/__pycache__/doctor.pyc"),
    ]
    monkeypatch.setattr("factory.one_click_release.git_changes", lambda root: changes)
    selected, unrelated, unchanged = scoped_release_changes(
        tmp_path,
        ["factory/one_click_release.py", "VERSION.json"],
    )
    assert [item.path for item in selected] == ["factory/one_click_release.py"]
    assert [item.path for item in unrelated] == ["articles/unrelated.html"]
    assert unchanged == ["VERSION.json"]

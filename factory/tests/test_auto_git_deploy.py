from __future__ import annotations

import subprocess
from pathlib import Path

from factory.auto_git_deploy import Change, is_blocked_secret, select_release_changes


def test_secret_files_are_blocked() -> None:
    assert is_blocked_secret(".env")
    assert is_blocked_secret("config/private_key.pem")
    assert not is_blocked_secret("articles/example.html")


def test_selection_excludes_outputs_and_deletions() -> None:
    selected, excluded, blocked = select_release_changes(
        [
            Change(" M", "articles/a.html"),
            Change("??", "factory/output/report.json"),
            Change(" D", "articles/old.html"),
            Change("??", ".env"),
        ]
    )
    assert [item.path for item in selected] == ["articles/a.html"]
    assert {item.path for item in excluded} == {"factory/output/report.json", "articles/old.html"}
    assert [item.path for item in blocked] == [".env"]


def test_git_status_parser_handles_real_repo(tmp_path: Path) -> None:
    subprocess.run(["git", "init", "-b", "main"], cwd=tmp_path, check=True, capture_output=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=tmp_path, check=True)
    subprocess.run(["git", "config", "user.name", "Test"], cwd=tmp_path, check=True)
    (tmp_path / "a.txt").write_text("one", encoding="utf-8")
    subprocess.run(["git", "add", "a.txt"], cwd=tmp_path, check=True)
    subprocess.run(["git", "commit", "-m", "init"], cwd=tmp_path, check=True, capture_output=True)
    (tmp_path / "a.txt").write_text("two", encoding="utf-8")
    from factory.auto_git_deploy import git_changes
    changes = git_changes(tmp_path)
    assert any(change.path == "a.txt" for change in changes)

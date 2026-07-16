from __future__ import annotations

import json
from pathlib import Path

from factory.command_engine import CommandEngine
from factory.command_watcher import CommandWatcher


def test_write_replace_copy_delete(tmp_path: Path) -> None:
    engine = CommandEngine(tmp_path)
    payload = {
        "id": "test-command",
        "actions": [
            {"type": "write_file", "path": "work/a.txt", "content": "hello"},
            {"type": "replace_text", "path": "work/a.txt", "old": "hello", "new": "savingio"},
            {"type": "copy_file", "source": "work/a.txt", "destination": "work/b.txt"},
            {"type": "delete_file", "path": "work/a.txt"},
        ],
    }
    result = engine.execute_payload(payload)
    assert result["status"] == "success"
    assert not (tmp_path / "work/a.txt").exists()
    assert (tmp_path / "work/b.txt").read_text(encoding="utf-8") == "savingio"


def test_path_escape_is_blocked(tmp_path: Path) -> None:
    engine = CommandEngine(tmp_path)
    result = engine.execute_payload({"id": "escape", "actions": [{"type": "write_file", "path": "../outside.txt", "content": "blocked"}]})
    assert result["status"] == "failed"
    assert "path_outside_project" in result["error"]


def test_watcher_moves_success_to_processed(tmp_path: Path) -> None:
    inbox = tmp_path / "factory-command/inbox"
    inbox.mkdir(parents=True)
    command = {"id": "watcher-test", "actions": [{"type": "write_file", "path": "result.txt", "content": "PASS"}]}
    (inbox / "command.json").write_text(json.dumps(command, ensure_ascii=False), encoding="utf-8")
    watcher = CommandWatcher(tmp_path, poll_seconds=0.2)
    results = watcher.process_once()
    assert results[0]["status"] == "success"
    assert (tmp_path / "result.txt").read_text(encoding="utf-8") == "PASS"
    assert (tmp_path / "factory-command/processed/command.json").exists()

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SUPPORTED_ACTIONS = {"replace_text", "write_file", "delete_file", "copy_file", "mkdir"}


class CommandError(RuntimeError):
    pass


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def _inside(root: Path, raw_path: str) -> Path:
    candidate = (root / raw_path).resolve()
    project_root = root.resolve()
    if candidate != project_root and project_root not in candidate.parents:
        raise CommandError(f"path_outside_project:{raw_path}")
    return candidate


def _read_json(path: Path) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise CommandError(f"command_missing:{path}") from exc
    except json.JSONDecodeError as exc:
        raise CommandError(f"invalid_json:{exc}") from exc
    if not isinstance(payload, dict):
        raise CommandError("command_root_must_be_object")
    return payload


@dataclass
class CommandResult:
    command_id: str
    status: str
    changed_files: list[str]
    backups: list[str]
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "command_id": self.command_id,
            "status": self.status,
            "changed_files": self.changed_files,
            "backups": self.backups,
            "error": self.error,
            "finished_at": now_iso(),
        }


class CommandEngine:
    def __init__(self, project_root: Path):
        self.root = project_root.resolve()
        self.factory_root = self.root / "factory-command"
        self.backup_root = self.factory_root / "backups"
        self.report_root = self.factory_root / "reports"
        self.backup_root.mkdir(parents=True, exist_ok=True)
        self.report_root.mkdir(parents=True, exist_ok=True)

    def validate(self, payload: dict[str, Any]) -> None:
        actions = payload.get("actions")
        if not isinstance(actions, list) or not actions:
            raise CommandError("actions_must_be_non_empty_list")
        for index, action in enumerate(actions):
            if not isinstance(action, dict):
                raise CommandError(f"action_{index}_must_be_object")
            action_type = action.get("type")
            if action_type not in SUPPORTED_ACTIONS:
                raise CommandError(f"unsupported_action:{action_type}")

    def _backup(self, path: Path, command_id: str) -> str | None:
        if not path.exists():
            return None
        relative = path.relative_to(self.root)
        destination = self.backup_root / command_id / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        if path.is_dir():
            shutil.copytree(path, destination, dirs_exist_ok=True)
        else:
            shutil.copy2(path, destination)
        return destination.relative_to(self.root).as_posix()

    def _run_action(self, action: dict[str, Any], command_id: str, changed: list[str], backups: list[str]) -> None:
        action_type = action["type"]
        if action_type == "mkdir":
            target = _inside(self.root, str(action["path"]))
            target.mkdir(parents=True, exist_ok=True)
            changed.append(target.relative_to(self.root).as_posix())
            return
        if action_type == "write_file":
            target = _inside(self.root, str(action["path"]))
            backup = self._backup(target, command_id)
            if backup:
                backups.append(backup)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(str(action.get("content", "")), encoding="utf-8")
            changed.append(target.relative_to(self.root).as_posix())
            return
        if action_type == "replace_text":
            target = _inside(self.root, str(action["path"]))
            if not target.exists() or not target.is_file():
                raise CommandError(f"replace_target_missing:{action['path']}")
            old = str(action.get("old", ""))
            new = str(action.get("new", ""))
            if not old:
                raise CommandError("replace_old_must_not_be_empty")
            source = target.read_text(encoding="utf-8")
            count = int(action.get("count", 1))
            occurrences = source.count(old)
            if occurrences < count:
                raise CommandError(f"replace_text_not_found:{action['path']}:needed={count}:found={occurrences}")
            backup = self._backup(target, command_id)
            if backup:
                backups.append(backup)
            target.write_text(source.replace(old, new, count), encoding="utf-8")
            changed.append(target.relative_to(self.root).as_posix())
            return
        if action_type == "delete_file":
            target = _inside(self.root, str(action["path"]))
            if not target.exists():
                if bool(action.get("missing_ok", False)):
                    return
                raise CommandError(f"delete_target_missing:{action['path']}")
            backup = self._backup(target, command_id)
            if backup:
                backups.append(backup)
            if target.is_dir():
                shutil.rmtree(target)
            else:
                target.unlink()
            changed.append(target.relative_to(self.root).as_posix())
            return
        if action_type == "copy_file":
            source = _inside(self.root, str(action["source"]))
            target = _inside(self.root, str(action["destination"]))
            if not source.exists():
                raise CommandError(f"copy_source_missing:{action['source']}")
            backup = self._backup(target, command_id)
            if backup:
                backups.append(backup)
            target.parent.mkdir(parents=True, exist_ok=True)
            if source.is_dir():
                shutil.copytree(source, target, dirs_exist_ok=True)
            else:
                shutil.copy2(source, target)
            changed.append(target.relative_to(self.root).as_posix())
            return
        raise CommandError(f"unreachable_action:{action_type}")

    def execute_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        self.validate(payload)
        command_id = str(payload.get("id") or f"cmd-{uuid.uuid4().hex[:12]}")
        changed: list[str] = []
        backups: list[str] = []
        try:
            for action in payload["actions"]:
                self._run_action(action, command_id, changed, backups)
            result = CommandResult(command_id, "success", changed, backups)
        except Exception as exc:
            result = CommandResult(command_id, "failed", changed, backups, str(exc))
        report_path = self.report_root / f"{command_id}.json"
        report_path.write_text(json.dumps(result.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
        return result.to_dict()

    def execute_file(self, command_path: Path) -> dict[str, Any]:
        return self.execute_payload(_read_json(command_path))


def compile_python(project_root: Path) -> dict[str, Any]:
    process = subprocess.run(
        [sys.executable, "-m", "compileall", "-q", str(project_root / "factory")],
        cwd=project_root,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    return {"pass": process.returncode == 0, "returncode": process.returncode, "stdout": process.stdout.strip(), "stderr": process.stderr.strip()}

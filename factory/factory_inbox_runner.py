from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
import traceback
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any

INBOX_DIR = "factory-inbox"
PROCESSED_DIR = "factory-inbox-processed"
FAILED_DIR = "factory-inbox-failed"
BACKUP_DIR = "factory/backups/inbox"

# Unified output path: use only the project-root factory-output folder.
OUTPUT_ROOT = "factory-output"
OUTPUT_INBOX_DIR = "factory-output/inbox"
STATE_FILE = "factory-output/inbox-runner-state.json"
LOG_FILE = "factory-output/inbox-runner.log"
LOCK_FILE = "factory-output/inbox-runner.lock"

POLL_SECONDS = 5
CREATE_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)


def now() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(path)


def append_log(root: Path, message: str) -> None:
    path = root / LOG_FILE
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as file:
        file.write(f"[{now()}] {message}\n")


def save_state(root: Path, **extra: Any) -> None:
    payload = {
        "version": "1.2.0",
        "pid": os.getpid(),
        "status": extra.pop("status", "watching"),
        "updated_at": now(),
        "heartbeat_at": now(),
        **extra,
    }
    write_json(root / STATE_FILE, payload)


def run_command(root: Path, command: list[str], timeout: int = 1800) -> dict[str, Any]:
    try:
        completed = subprocess.run(
            command,
            cwd=str(root),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
            shell=False,
            creationflags=CREATE_NO_WINDOW,
        )
        return {
            "command": command,
            "returncode": completed.returncode,
            "stdout": completed.stdout.strip(),
            "stderr": completed.stderr.strip(),
        }
    except Exception as exc:
        return {
            "command": command,
            "returncode": -1,
            "stdout": "",
            "stderr": f"{type(exc).__name__}: {exc}",
        }


def acquire_lock(root: Path) -> bool:
    lock = root / LOCK_FILE
    lock.parent.mkdir(parents=True, exist_ok=True)

    if lock.exists():
        try:
            pid = int(lock.read_text(encoding="utf-8").strip())
            os.kill(pid, 0)
            return False
        except Exception:
            lock.unlink(missing_ok=True)

    lock.write_text(str(os.getpid()), encoding="utf-8")
    return True


def release_lock(root: Path) -> None:
    (root / LOCK_FILE).unlink(missing_ok=True)


def safe_member(name: str) -> bool:
    path = Path(name.replace("\\", "/"))
    if path.is_absolute() or ".." in path.parts or not path.parts:
        return False
    return not any(part in {".git", "__pycache__"} for part in path.parts)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_manifest(archive: zipfile.ZipFile) -> dict[str, Any]:
    for name in ("patch-manifest.json", "PATCH-MANIFEST.json", "manifest.json"):
        if name in archive.namelist():
            return json.loads(archive.read(name).decode("utf-8-sig"))
    return {}


def unique_destination(folder: Path, name: str) -> Path:
    folder.mkdir(parents=True, exist_ok=True)
    destination = folder / name
    if destination.exists():
        destination = folder / f"{destination.stem}-{int(time.time())}{destination.suffix}"
    return destination


def move_patch(root: Path, patch: Path, passed: bool) -> Path:
    folder = root / (PROCESSED_DIR if passed else FAILED_DIR)
    destination = unique_destination(folder, patch.name)
    if patch.exists():
        shutil.move(str(patch), str(destination))
    return destination


def rollback_files(root: Path, backup_root: Path, changed_files: list[str]) -> list[str]:
    errors: list[str] = []
    for relative in reversed(changed_files):
        target = root / relative
        backup = backup_root / relative
        try:
            if backup.exists():
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(backup, target)
            else:
                target.unlink(missing_ok=True)
        except Exception as exc:
            errors.append(f"{relative}: {type(exc).__name__}: {exc}")
    return errors


def apply_patch(root: Path, patch: Path) -> dict[str, Any]:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_root = root / BACKUP_DIR / stamp
    staging_root = root / "factory" / "tmp" / f"inbox-{stamp}"

    report: dict[str, Any] = {
        "version": "1.2.0",
        "patch": patch.name,
        "started_at": now(),
        "status": "started",
        "pass": False,
        "changed_files": [],
        "steps": [],
    }

    staging_root.mkdir(parents=True, exist_ok=True)

    try:
        if not zipfile.is_zipfile(patch):
            raise RuntimeError("invalid_zip_file")

        with zipfile.ZipFile(patch) as archive:
            manifest = read_manifest(archive)
            report["manifest"] = manifest

            members = [
                name
                for name in archive.namelist()
                if not name.endswith("/")
                and safe_member(name)
                and Path(name).name
                not in {"patch-manifest.json", "PATCH-MANIFEST.json", "manifest.json"}
            ]

            allowed = manifest.get("files")
            if isinstance(allowed, list) and allowed:
                allowed_set = {Path(str(item)).as_posix() for item in allowed}
                members = [name for name in members if Path(name).as_posix() in allowed_set]

            if not members:
                raise RuntimeError("no_applicable_files")

            for member in members:
                relative = Path(member)
                target = (root / relative).resolve()

                if target != root.resolve() and root.resolve() not in target.parents:
                    raise RuntimeError(f"unsafe_target:{member}")

                extracted = staging_root / relative
                extracted.parent.mkdir(parents=True, exist_ok=True)

                with archive.open(member) as source, extracted.open("wb") as destination:
                    shutil.copyfileobj(source, destination)

                if target.exists() and sha256(target) == sha256(extracted):
                    continue

                if target.exists():
                    backup = backup_root / relative
                    backup.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(target, backup)

                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(extracted, target)
                report["changed_files"].append(relative.as_posix())

        if not report["changed_files"]:
            report.update({"status": "no_changes", "pass": True, "finished_at": now()})
            return report

        checks = [
            ("python_compile", [sys.executable, "-m", "compileall", "-q", "factory"]),
            ("factory_tests", [sys.executable, "-m", "pytest", "-q", "factory/tests"]),
        ]

        for name, command in checks:
            result = run_command(root, command)
            result["name"] = name
            result["pass"] = result["returncode"] == 0
            report["steps"].append(result)
            if not result["pass"]:
                raise RuntimeError(f"{name}_failed")

        stage = run_command(root, ["git", "add", "--", *report["changed_files"]])
        stage["name"] = "git_stage"
        stage["pass"] = stage["returncode"] == 0
        report["steps"].append(stage)
        if not stage["pass"]:
            raise RuntimeError("git_stage_failed")

        staged_diff = run_command(root, ["git", "diff", "--cached", "--quiet"])
        if staged_diff["returncode"] == 0:
            report.update({"status": "no_staged_changes", "pass": True, "finished_at": now()})
            return report

        title = str(report.get("manifest", {}).get("title") or patch.stem)
        commit = run_command(root, ["git", "commit", "-m", f"Factory Inbox: {title}"])
        commit["name"] = "git_commit"
        commit["pass"] = commit["returncode"] == 0
        report["steps"].append(commit)
        if not commit["pass"]:
            raise RuntimeError("git_commit_failed")

        push = run_command(root, ["git", "push", "origin", "main"])
        push["name"] = "git_push"
        push["pass"] = push["returncode"] == 0
        report["steps"].append(push)
        if not push["pass"]:
            raise RuntimeError("git_push_failed")

        report.update({"status": "deployed", "pass": True, "finished_at": now()})
        return report

    except Exception as exc:
        report.update(
            {
                "status": "failed",
                "reason": str(exc),
                "traceback": traceback.format_exc(),
                "finished_at": now(),
            }
        )
        rollback_errors = rollback_files(root, backup_root, report["changed_files"])
        if rollback_errors:
            report["rollback_errors"] = rollback_errors
        return report

    finally:
        shutil.rmtree(staging_root, ignore_errors=True)


def process_patch(root: Path, patch: Path) -> None:
    append_log(root, f"picked:{patch.name}")
    save_state(root, status="processing", current_patch=patch.name)

    report_path = (
        root
        / OUTPUT_INBOX_DIR
        / f"{patch.stem}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    )

    try:
        report = apply_patch(root, patch)
    except Exception as exc:
        report = {
            "version": "1.2.0",
            "patch": patch.name,
            "started_at": now(),
            "finished_at": now(),
            "status": "runner_exception",
            "pass": False,
            "reason": f"{type(exc).__name__}: {exc}",
            "traceback": traceback.format_exc(),
        }

    write_json(report_path, report)
    archived_to = move_patch(root, patch, bool(report.get("pass")))

    append_log(root, f"finished:{patch.name}:{report.get('status')}:{archived_to.name}")
    save_state(
        root,
        status="watching" if report.get("pass") else "blocked",
        last_patch=patch.name,
        last_result=report.get("status"),
        last_report=str(report_path.relative_to(root)),
        archived_to=str(archived_to.relative_to(root)),
        pending_files=[item.name for item in (root / INBOX_DIR).glob("*.zip")],
    )


def main_loop(root: Path, once: bool) -> int:
    for folder in (
        root / INBOX_DIR,
        root / PROCESSED_DIR,
        root / FAILED_DIR,
        root / OUTPUT_ROOT,
        root / OUTPUT_INBOX_DIR,
    ):
        folder.mkdir(parents=True, exist_ok=True)

    append_log(root, f"runner_start:pid={os.getpid()}:root={root}")
    save_state(root, status="watching", pending_files=[])

    while True:
        try:
            inbox = root / INBOX_DIR
            patches = sorted(inbox.glob("*.zip"), key=lambda path: path.stat().st_mtime)

            if patches:
                process_patch(root, patches[0])
            else:
                save_state(root, status="watching", pending_files=[])

        except Exception as exc:
            append_log(root, f"loop_exception:{type(exc).__name__}:{exc}")
            save_state(
                root,
                status="recovering",
                error=f"{type(exc).__name__}: {exc}",
                traceback=traceback.format_exc(),
            )

        if once:
            return 0

        time.sleep(POLL_SECONDS)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--once", action="store_true")
    arguments = parser.parse_args()

    root = Path(arguments.root).resolve()

    if not acquire_lock(root):
        return 0

    try:
        return main_loop(root, arguments.once)
    finally:
        release_lock(root)


if __name__ == "__main__":
    raise SystemExit(main())

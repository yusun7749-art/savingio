from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

from .auto_git_deploy import auto_git_deploy, git_changes
from .utils import now_iso, save_json

CONFIG_PATH = Path("factory/config/factory_daemon.json")
STATE_PATH = Path("factory/output/factory_daemon_state.json")
LOG_PATH = Path("factory/output/factory_daemon.log")
LOCK_PATH = Path("factory/state/factory_daemon.lock")


def _load_config(root: Path) -> dict[str, Any]:
    defaults: dict[str, Any] = {
        "enabled": True,
        "poll_seconds": 15,
        "debounce_seconds": 8,
        "include_paths": ["index.html"],
        "auto_deploy": True,
        "verify": True,
        "commit_message": "Savingio Factory automatic safe release",
        "failure_cooldown_seconds": 600,
    }
    path = root / CONFIG_PATH
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
        defaults.update(data)
    return defaults


def _append_log(root: Path, message: str) -> None:
    path = root / LOG_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(f"[{now_iso()}] {message}\n")


def _write_state(root: Path, **updates: Any) -> dict[str, Any]:
    path = root / STATE_PATH
    current: dict[str, Any] = {}
    if path.exists():
        try:
            current = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            current = {}
    current.update(updates)
    current["updated_at"] = now_iso()
    save_json(path, current)
    return current


def _matching_changes(root: Path, include_paths: list[str]) -> list[str]:
    normalized = [value.replace("\\", "/").strip("/") for value in include_paths]
    matches: list[str] = []
    for change in git_changes(root):
        path = change.path.replace("\\", "/").strip("/")
        if any(path == prefix or path.startswith(prefix + "/") for prefix in normalized):
            matches.append(path)
    return sorted(set(matches))


def _acquire_lock(root: Path) -> bool:
    path = root / LOCK_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        try:
            pid = int(path.read_text(encoding="utf-8").strip())
            if pid > 0:
                os.kill(pid, 0)
                return False
        except (ValueError, OSError):
            pass
    path.write_text(str(os.getpid()), encoding="utf-8")
    return True


def _release_lock(root: Path) -> None:
    path = root / LOCK_PATH
    try:
        if path.exists() and path.read_text(encoding="utf-8").strip() == str(os.getpid()):
            path.unlink()
    except OSError:
        pass


def run_once(root: Path) -> dict[str, Any]:
    config = _load_config(root)
    include_paths = [str(value) for value in config.get("include_paths", ["index.html"])]
    changes = _matching_changes(root, include_paths)
    if not changes:
        state = _write_state(root, status="idle", pass_=True, watched_paths=include_paths, pending_files=[])
        return {"pass": True, "status": "idle", "state": state}

    _append_log(root, f"detected safe changes: {', '.join(changes)}")
    _write_state(root, status="deploying", pending_files=changes, watched_paths=include_paths)
    result = auto_git_deploy(
        root,
        execute=bool(config.get("auto_deploy", True)),
        push=True,
        verify=bool(config.get("verify", True)),
        message=str(config.get("commit_message") or "Savingio Factory automatic safe release"),
        include_paths=include_paths,
    )
    ok = bool(result.get("pass"))
    _append_log(root, f"deploy result: status={result.get('status')} pass={ok} reason={result.get('reason')}")
    _write_state(
        root,
        status="idle" if ok else "blocked",
        pass_=ok,
        last_result=result,
        pending_files=[] if ok else changes,
        watched_paths=include_paths,
    )
    return result


def watch(root: Path) -> int:
    if not _acquire_lock(root):
        print("Savingio Factory Daemon is already running.")
        return 0

    running = True

    def stop_handler(_signum: int, _frame: Any) -> None:
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, stop_handler)
    signal.signal(signal.SIGTERM, stop_handler)
    config = _load_config(root)
    poll_seconds = max(5, int(config.get("poll_seconds", 15)))
    debounce_seconds = max(0, int(config.get("debounce_seconds", 8)))
    _append_log(root, f"daemon started pid={os.getpid()}")
    _write_state(root, status="watching", pid=os.getpid(), started_at=now_iso())

    last_signature: tuple[str, ...] = ()
    stable_since = time.monotonic()
    blocked_signature: tuple[str, ...] = ()
    blocked_until = 0.0
    try:
        while running:
            config = _load_config(root)
            if not bool(config.get("enabled", True)):
                _write_state(root, status="disabled", pid=os.getpid())
                time.sleep(poll_seconds)
                continue
            include_paths = [str(value) for value in config.get("include_paths", ["index.html"])]
            signature = tuple(_matching_changes(root, include_paths))
            if signature != last_signature:
                last_signature = signature
                stable_since = time.monotonic()
                _write_state(root, status="watching", pid=os.getpid(), pending_files=list(signature))
            elif signature and time.monotonic() - stable_since >= debounce_seconds:
                now = time.monotonic()
                if signature == blocked_signature and now < blocked_until:
                    _write_state(
                        root,
                        status="blocked_cooldown",
                        pid=os.getpid(),
                        heartbeat_at=now_iso(),
                        pending_files=list(signature),
                        retry_after_seconds=max(0, int(blocked_until - now)),
                    )
                else:
                    result = run_once(root)
                    if result.get("pass"):
                        blocked_signature = ()
                        blocked_until = 0.0
                    else:
                        blocked_signature = signature
                        blocked_until = now + max(60, int(config.get("failure_cooldown_seconds", 600)))
                    last_signature = ()
                    stable_since = time.monotonic()
            else:
                _write_state(root, status="watching", pid=os.getpid(), heartbeat_at=now_iso(), pending_files=list(signature))
            time.sleep(poll_seconds)
    finally:
        _append_log(root, "daemon stopped")
        _write_state(root, status="stopped", pid=None)
        _release_lock(root)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Savingio always-on safe release daemon")
    parser.add_argument("--root", default=".")
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args(argv)
    root = Path(args.root).resolve()
    if args.once:
        result = run_once(root)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0 if result.get("pass") else 1
    return watch(root)


if __name__ == "__main__":
    raise SystemExit(main())

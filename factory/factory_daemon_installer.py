from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

REPORT_PATH = Path("factory/output/factory_daemon_install_report.json")
STATE_PATH = Path("factory/output/factory_daemon_state.json")
TASK_NAME = "SavingioFactoryDaemon"


def now_iso() -> str:
    from datetime import datetime
    return datetime.now().astimezone().isoformat(timespec="seconds")


def save_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def run(command: list[str], cwd: Path) -> dict[str, Any]:
    completed = subprocess.run(
        command,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        shell=False,
    )
    return {
        "command": command,
        "returncode": completed.returncode,
        "stdout": completed.stdout.strip(),
        "stderr": completed.stderr.strip(),
    }


def pythonw_path() -> Path:
    exe = Path(sys.executable)
    candidate = exe.with_name("pythonw.exe")
    return candidate if candidate.exists() else exe


def task_command(root: Path) -> str:
    pyw = pythonw_path()
    return (
        f'cmd /c cd /d "{root}" && '
        f'set PYTHONUTF8=1 && '
        f'"{pyw}" -m factory.factory_daemon --root "{root}"'
    )


def try_task_scheduler(root: Path) -> dict[str, Any]:
    create = run(
        [
            "schtasks",
            "/Create",
            "/TN",
            TASK_NAME,
            "/SC",
            "ONLOGON",
            "/RL",
            "LIMITED",
            "/F",
            "/TR",
            task_command(root),
        ],
        root,
    )
    result: dict[str, Any] = {"method": "task_scheduler", "create": create, "pass": False}
    if create["returncode"] != 0:
        return result

    start = run(["schtasks", "/Run", "/TN", TASK_NAME], root)
    result["start"] = start
    result["pass"] = start["returncode"] == 0
    return result


def startup_folder() -> Path:
    appdata = os.environ.get("APPDATA")
    if not appdata:
        raise RuntimeError("APPDATA environment variable is unavailable.")
    return Path(appdata) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"


def install_startup_fallback(root: Path) -> dict[str, Any]:
    folder = startup_folder()
    folder.mkdir(parents=True, exist_ok=True)

    launcher = folder / "SavingioFactoryDaemon.vbs"
    pyw = pythonw_path()
    command = (
        f'cd /d "{root}" && '
        f'set PYTHONUTF8=1 && '
        f'""{pyw}" -m factory.factory_daemon --root "{root}""'
    )
    escaped = command.replace('"', '""')
    launcher.write_text(
        'Set shell = CreateObject("WScript.Shell")\n'
        f'shell.Run "cmd /c {escaped}", 0, False\n',
        encoding="utf-8-sig",
    )

    return {
        "method": "startup_folder",
        "pass": launcher.exists(),
        "launcher": str(launcher),
    }


def start_now(root: Path) -> dict[str, Any]:
    pyw = pythonw_path()
    creationflags = 0
    if os.name == "nt":
        creationflags = (
            getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
            | getattr(subprocess, "DETACHED_PROCESS", 0)
            | getattr(subprocess, "CREATE_NO_WINDOW", 0)
        )
    try:
        process = subprocess.Popen(
            [str(pyw), "-m", "factory.factory_daemon", "--root", str(root)],
            cwd=str(root),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
            creationflags=creationflags,
            close_fds=True,
        )
        return {"pass": True, "pid": process.pid, "python": str(pyw)}
    except Exception as exc:
        return {"pass": False, "error": str(exc), "python": str(pyw)}


def wait_for_state(root: Path, seconds: int = 12) -> dict[str, Any]:
    state_path = root / STATE_PATH
    deadline = time.time() + seconds
    while time.time() < deadline:
        if state_path.exists():
            try:
                state = json.loads(state_path.read_text(encoding="utf-8"))
                if state.get("status") in {"watching", "idle", "deploying", "blocked"}:
                    return {"pass": True, "state": state}
            except Exception:
                pass
        time.sleep(1)
    return {"pass": False, "reason": "state_not_confirmed", "path": str(state_path)}


def main() -> int:
    root = Path.cwd().resolve()
    report: dict[str, Any] = {
        "version": "2.0.0",
        "created_at": now_iso(),
        "root": str(root),
        "python": sys.executable,
        "status": "started",
        "pass": False,
        "steps": [],
    }

    module_check = run([sys.executable, "-m", "py_compile", "factory/factory_daemon.py"], root)
    module_check["name"] = "module_check"
    module_check["pass"] = module_check["returncode"] == 0
    report["steps"].append(module_check)
    if not module_check["pass"]:
        report["status"] = "blocked"
        report["reason"] = "factory_daemon_module_check_failed"
        save_json(root / REPORT_PATH, report)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 1

    scheduler = try_task_scheduler(root)
    report["steps"].append(scheduler)

    if scheduler.get("pass"):
        report["install_method"] = "task_scheduler"
    else:
        fallback = install_startup_fallback(root)
        report["steps"].append(fallback)
        if not fallback.get("pass"):
            report["status"] = "blocked"
            report["reason"] = "all_startup_install_methods_failed"
            save_json(root / REPORT_PATH, report)
            print(json.dumps(report, ensure_ascii=False, indent=2))
            return 1
        report["install_method"] = "startup_folder"

    start = start_now(root)
    start["name"] = "start_now"
    report["steps"].append(start)

    state = wait_for_state(root)
    state["name"] = "state_confirmation"
    report["steps"].append(state)

    report["pass"] = bool(start.get("pass")) and bool(state.get("pass"))
    report["status"] = "pass" if report["pass"] else "installed_but_start_unconfirmed"
    save_json(root / REPORT_PATH, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["pass"] else 2


if __name__ == "__main__":
    raise SystemExit(main())

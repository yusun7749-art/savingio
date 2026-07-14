from __future__ import annotations
from pathlib import Path
import subprocess
from .deployment_receipt import build_receipt
from .utils import now_iso

def _run(root: Path, args: list[str]) -> dict:
    process = subprocess.run(args, cwd=root, capture_output=True, text=True, check=False)
    return {
        "command": args,
        "returncode": process.returncode,
        "stdout": process.stdout.strip(),
        "stderr": process.stderr.strip(),
    }

def repository_status(root: Path) -> dict:
    checks = {
        "inside_work_tree": _run(root, ["git", "rev-parse", "--is-inside-work-tree"]),
        "branch": _run(root, ["git", "branch", "--show-current"]),
        "remote": _run(root, ["git", "remote", "get-url", "origin"]),
        "porcelain": _run(root, ["git", "status", "--porcelain"]),
    }
    return {
        "ready": (
            checks["inside_work_tree"]["returncode"] == 0
            and checks["inside_work_tree"]["stdout"].lower() == "true"
            and checks["branch"]["returncode"] == 0
            and bool(checks["branch"]["stdout"])
            and checks["remote"]["returncode"] == 0
            and bool(checks["remote"]["stdout"])
        ),
        "branch": checks["branch"]["stdout"],
        "origin": checks["remote"]["stdout"],
        "dirty": bool(checks["porcelain"]["stdout"]),
        "checks": checks,
        "checked_at": now_iso(),
    }

def execute_release(
    root: Path,
    files: list[str],
    message: str,
    *,
    push: bool = True,
    dry_run: bool = True,
    allowed_branches: list[str] | None = None,
) -> dict:
    allowed_branches = allowed_branches or ["main"]
    clean_files = [value for value in dict.fromkeys(files) if value and value != "."]
    if not clean_files:
        raise ValueError("선택 파일이 없습니다.")
    if any(value.strip() == "." for value in clean_files):
        raise ValueError("git add . 사용 금지")

    status = repository_status(root)
    plan = {
        "files": clean_files,
        "message": message,
        "push": push,
        "dry_run": dry_run,
        "allowed_branches": allowed_branches,
        "branch": status["branch"],
        "origin": status["origin"],
        "commands": [
            ["git", "add", "--", *clean_files],
            ["git", "commit", "-m", message],
        ] + ([["git", "push", "origin", status["branch"]]] if push else []),
    }

    if not status["ready"]:
        return {"status": "blocked", "reason": "repository_not_ready", "repository": status, "plan": plan}

    if status["branch"] not in allowed_branches:
        return {
            "status": "blocked",
            "reason": "branch_not_allowed",
            "repository": status,
            "plan": plan,
        }

    if dry_run:
        return {"status": "dry_run", "repository": status, "plan": plan, "results": []}

    results = []
    for command in plan["commands"]:
        result = _run(root, command)
        results.append(result)
        if result["returncode"] != 0:
            receipt = build_receipt(root, "git", "failed", clean_files, {"results": results})
            return {"status": "failed", "repository": status, "plan": plan, "results": results, "receipt": receipt}

    receipt = build_receipt(root, "git", "completed", clean_files, {"results": results})
    return {"status": "completed", "repository": status, "plan": plan, "results": results, "receipt": receipt}

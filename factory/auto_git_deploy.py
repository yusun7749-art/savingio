from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .adsense_manager import load_identity
from .cloudflare_deploy_verify import verify_latest_deployment
from .deployment_integrity import verify_deployment_integrity
from .utils import now_iso, save_json

REPORT_PATH = Path("factory/output/auto_git_deploy_report.json")
DEFAULT_EXCLUDES = {
    ".git",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "__pycache__",
    "factory/output",
    "factory/backups",
    "factory/state/factory.sqlite3",
}
BLOCKED_NAMES = {
    ".env",
    ".env.local",
    ".env.production",
    "credentials.json",
    "service-account.json",
}
BLOCKED_SUFFIXES = {".pem", ".key", ".p12", ".pfx", ".crt"}


@dataclass(frozen=True)
class Change:
    status: str
    path: str

    @property
    def deleted(self) -> bool:
        return "D" in self.status


def _run(root: Path, args: list[str], timeout: int = 900) -> dict:
    try:
        creationflags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        proc = subprocess.run(
            args,
            cwd=root,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
            timeout=timeout,
            creationflags=creationflags,
        )
        return {
            "command": args,
            "returncode": proc.returncode,
            "stdout": proc.stdout.strip(),
            "stderr": proc.stderr.strip(),
        }
    except FileNotFoundError:
        return {"command": args, "returncode": 127, "stdout": "", "stderr": f"command_not_found:{args[0]}"}
    except subprocess.TimeoutExpired:
        return {"command": args, "returncode": 124, "stdout": "", "stderr": "timeout"}


def _parse_porcelain_z(raw: bytes) -> list[Change]:
    changes: list[Change] = []
    records = raw.split(b"\0")
    index = 0
    while index < len(records):
        record = records[index]
        index += 1
        if not record or len(record) < 4:
            continue
        text = record.decode("utf-8", errors="surrogateescape")
        status = text[:2]
        path = text[3:].replace("\\", "/")
        if status[0] in {"R", "C"} or status[1] in {"R", "C"}:
            if index < len(records) and records[index]:
                path = records[index].decode("utf-8", errors="surrogateescape").replace("\\", "/")
                index += 1
        changes.append(Change(status=status, path=path))
    return changes


def git_changes(root: Path) -> list[Change]:
    creationflags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    proc = subprocess.run(
        ["git", "status", "--porcelain=v1", "-z", "--untracked-files=all"],
        cwd=root,
        capture_output=True,
        check=False,
        creationflags=creationflags,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.decode("utf-8", errors="replace") or "git_status_failed")
    return _parse_porcelain_z(proc.stdout)


def _matches_prefix(path: str, prefix: str) -> bool:
    normalized = path.strip("/")
    prefix = prefix.strip("/")
    return normalized == prefix or normalized.startswith(prefix + "/")


def is_blocked_secret(path: str) -> bool:
    candidate = Path(path)
    name = candidate.name.lower()
    if name in BLOCKED_NAMES or candidate.suffix.lower() in BLOCKED_SUFFIXES:
        return True
    lowered = path.lower()
    return any(token in lowered for token in ("private_key", "api_token.txt", "secret_key"))


def select_release_changes(
    changes: Iterable[Change],
    *,
    include_deletions: bool = False,
    extra_excludes: Iterable[str] = (),
    include_paths: Iterable[str] = (),
) -> tuple[list[Change], list[Change], list[Change]]:
    excludes = set(DEFAULT_EXCLUDES) | {value.replace("\\", "/").strip("/") for value in extra_excludes if value}
    includes = {value.replace("\\", "/").strip("/") for value in include_paths if value}
    selected: list[Change] = []
    excluded: list[Change] = []
    blocked: list[Change] = []
    for change in changes:
        path = change.path.replace("\\", "/").strip("/")
        if is_blocked_secret(path):
            blocked.append(change)
            continue
        if includes and not any(_matches_prefix(path, prefix) for prefix in includes):
            excluded.append(change)
            continue
        if any(_matches_prefix(path, prefix) for prefix in excludes):
            excluded.append(change)
            continue
        if change.deleted and not include_deletions:
            excluded.append(change)
            continue
        selected.append(change)
    return selected, excluded, blocked


def repository_preflight(root: Path) -> dict:
    checks = {
        "inside": _run(root, ["git", "rev-parse", "--is-inside-work-tree"]),
        "branch": _run(root, ["git", "branch", "--show-current"]),
        "origin": _run(root, ["git", "remote", "get-url", "origin"]),
        "conflicts": _run(root, ["git", "diff", "--name-only", "--diff-filter=U"]),
    }
    branch = checks["branch"]["stdout"]
    passed = (
        checks["inside"]["returncode"] == 0
        and checks["inside"]["stdout"].lower() == "true"
        and branch == "main"
        and checks["origin"]["returncode"] == 0
        and bool(checks["origin"]["stdout"])
        and checks["conflicts"]["returncode"] == 0
        and not checks["conflicts"]["stdout"]
    )
    return {"pass": passed, "branch": branch, "origin": checks["origin"]["stdout"], "checks": checks}


def _run_validation(root: Path) -> dict:
    stages: list[dict] = []

    identity = load_identity(root)
    publisher_ok = identity.get("publisher_id") == "pub-7605193583747751"
    stages.append({"name": "publisher_lock", "pass": publisher_ok, "publisher_id": identity.get("publisher_id")})
    if not publisher_ok:
        return {"pass": False, "stages": stages, "reason": "publisher_lock_failed"}

    compile_result = _run(root, [sys.executable, "-m", "compileall", "-q", "factory"], timeout=600)
    stages.append({"name": "python_compile", "pass": compile_result["returncode"] == 0, "result": compile_result})
    if compile_result["returncode"] != 0:
        return {"pass": False, "stages": stages, "reason": "python_compile_failed"}

    tests = _run(root, [sys.executable, "-m", "pytest", "-q", "factory/tests"], timeout=1800)
    stages.append({"name": "factory_tests", "pass": tests["returncode"] == 0, "result": tests})
    if tests["returncode"] != 0:
        return {"pass": False, "stages": stages, "reason": "factory_tests_failed"}

    integrity = verify_deployment_integrity(root, repair=False)
    stages.append({"name": "deployment_integrity", "pass": bool(integrity.get("pass")), "result": integrity})
    return {
        "pass": all(stage["pass"] for stage in stages),
        "stages": stages,
        "reason": None if integrity.get("pass") else "deployment_integrity_failed",
    }


def _remote_head(root: Path, branch: str) -> str:
    result = _run(root, ["git", "ls-remote", "origin", f"refs/heads/{branch}"], timeout=120)
    if result["returncode"] != 0 or not result["stdout"]:
        return ""
    return result["stdout"].split()[0]


def auto_git_deploy(
    root: Path,
    *,
    execute: bool = False,
    push: bool = True,
    verify: bool = True,
    include_deletions: bool = False,
    message: str | None = None,
    include_paths: Iterable[str] = (),
) -> dict:
    root = root.resolve()
    report: dict = {
        "version": "1.0.0",
        "mode": "auto_git_commit_push_deploy_verify",
        "execute": execute,
        "push": push,
        "verify": verify,
        "created_at": now_iso(),
        "stages": [],
        "pass": False,
    }

    preflight = repository_preflight(root)
    report["stages"].append({"name": "git_preflight", "pass": preflight["pass"], "result": preflight})
    if not preflight["pass"]:
        report.update(status="blocked", reason="git_preflight_failed")
        save_json(root / REPORT_PATH, report)
        return report

    validation = _run_validation(root)
    report["stages"].extend(validation["stages"])
    if not validation["pass"]:
        report.update(status="blocked", reason=validation["reason"])
        save_json(root / REPORT_PATH, report)
        return report

    selected, excluded, blocked = select_release_changes(
        git_changes(root),
        include_deletions=include_deletions,
        include_paths=include_paths,
    )
    report["selected_files"] = [change.path for change in selected]
    report["excluded_files"] = [change.path for change in excluded]
    report["blocked_secret_files"] = [change.path for change in blocked]
    if blocked:
        report.update(status="blocked", reason="secret_like_files_detected")
        save_json(root / REPORT_PATH, report)
        return report

    if not selected:
        report.update({"status":"completed_no_changes","pass":True})
        save_json(root / REPORT_PATH, report)
        return report

    commit_message = message or f"Savingio automatic release {now_iso()}"
    commands = [
        ["git", "add", "--", *[change.path for change in selected]],
        ["git", "commit", "-m", commit_message],
    ]
    if push:
        commands.append(["git", "push", "origin", preflight["branch"]])
    report["commands"] = commands

    if not execute:
        report.update({"status":"dry_run","pass":True})
        save_json(root / REPORT_PATH, report)
        return report

    for name, command in zip(("stage", "commit", "push"), commands):
        result = _run(root, command, timeout=900)
        stage = {"name": name, "pass": result["returncode"] == 0, "result": result}
        report["stages"].append(stage)
        if result["returncode"] != 0:
            report.update(status="failed", reason=f"git_{name}_failed")
            save_json(root / REPORT_PATH, report)
            return report

    local_head_result = _run(root, ["git", "rev-parse", "HEAD"])
    local_head = local_head_result["stdout"] if local_head_result["returncode"] == 0 else ""
    report["commit"] = local_head

    if push:
        remote_head = _remote_head(root, preflight["branch"])
        remote_match = bool(local_head) and remote_head == local_head
        report["stages"].append(
            {"name": "remote_commit_verify", "pass": remote_match, "local_head": local_head, "remote_head": remote_head}
        )
        if not remote_match:
            report.update(status="failed", reason="remote_commit_mismatch")
            save_json(root / REPORT_PATH, report)
            return report

    if verify and push:
        deployment = verify_latest_deployment(root, execute=True)
        report["stages"].append({"name": "cloudflare_deploy_verify", "pass": bool(deployment.get("pass")), "result": deployment})
        if not deployment.get("pass"):
            report.update(status="pushed_deploy_verification_failed", reason="cloudflare_verify_failed")
            save_json(root / REPORT_PATH, report)
            return report

    report.update({"status":"completed","pass":True,"finished_at":now_iso()})
    save_json(root / REPORT_PATH, report)
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Savingio automatic Git commit, push and Cloudflare verification")
    parser.add_argument("--root", default=".")
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--no-push", action="store_true")
    parser.add_argument("--no-verify", action="store_true")
    parser.add_argument("--include-deletions", action="store_true")
    parser.add_argument("--message", default=None)
    parser.add_argument(
        "--include-path",
        action="append",
        default=[],
        help="Stage only this path or directory prefix. May be repeated.",
    )
    args = parser.parse_args(argv)
    result = auto_git_deploy(
        Path(args.root),
        execute=args.execute,
        push=not args.no_push,
        verify=not args.no_verify,
        include_deletions=args.include_deletions,
        message=args.message,
        include_paths=args.include_path,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result.get("pass") else 1


if __name__ == "__main__":
    raise SystemExit(main())

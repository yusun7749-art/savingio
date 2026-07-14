from __future__ import annotations

import argparse
import json
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .adsense_manager import load_identity
from .deployment_integrity import verify_deployment_integrity
from .utils import now_iso, save_json

VERSION = "V2.049"
VOLATILE_PARTS = {".git", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache"}
VOLATILE_SUFFIXES = {".pyc", ".pyo", ".tmp", ".temp", ".log"}
REPORT_PATH = Path("factory/output/one_click_release_report.json")
SCOPE_PATH = Path("factory/config/release_scope.json")


@dataclass(frozen=True)
class GitChange:
    status: str
    path: str

    @property
    def deleted(self) -> bool:
        return "D" in self.status


class ReleaseBlocked(RuntimeError):
    """Raised when a release safety rule is violated."""


def _run(root: Path, args: list[str], timeout: int = 300) -> dict:
    try:
        process = subprocess.run(
            args,
            cwd=root,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
            timeout=timeout,
        )
        return {
            "command": args,
            "returncode": process.returncode,
            "stdout": process.stdout.strip(),
            "stderr": process.stderr.strip(),
        }
    except FileNotFoundError:
        return {"command": args, "returncode": 127, "stdout": "", "stderr": f"command_not_found:{args[0]}"}
    except subprocess.TimeoutExpired:
        return {"command": args, "returncode": 124, "stdout": "", "stderr": "timeout"}


def _is_volatile(path: str) -> bool:
    normalized = path.replace("\\", "/")
    parts = set(Path(normalized).parts)
    return bool(parts & VOLATILE_PARTS) or Path(normalized).suffix.lower() in VOLATILE_SUFFIXES


def _normalize_path(path: str) -> str:
    raw = path.replace("\\", "/").strip()
    raw_candidate = Path(raw)
    if not raw or raw == ".":
        raise ReleaseBlocked("empty_or_dot_path")
    if raw_candidate.is_absolute() or ".." in raw_candidate.parts:
        raise ReleaseBlocked(f"unsafe_path:{path}")
    while raw.startswith("./"):
        raw = raw[2:]
    candidate = Path(raw)
    if not raw or raw == ".":
        raise ReleaseBlocked("empty_or_dot_path")
    return candidate.as_posix()


def _parse_porcelain_z(raw: bytes) -> list[GitChange]:
    changes: list[GitChange] = []
    records = raw.split(b"\0")
    index = 0
    while index < len(records):
        record = records[index]
        index += 1
        if not record or len(record) < 4:
            continue
        text = record.decode("utf-8", errors="surrogateescape")
        status = text[:2]
        path = text[3:]
        if status[0] in {"R", "C"} or status[1] in {"R", "C"}:
            if index < len(records) and records[index]:
                path = records[index].decode("utf-8", errors="surrogateescape")
                index += 1
        changes.append(GitChange(status=status, path=path))
    return changes


def git_changes(root: Path) -> list[GitChange]:
    process = subprocess.run(
        ["git", "status", "--porcelain=v1", "-z", "--untracked-files=all"],
        cwd=root,
        capture_output=True,
        check=False,
    )
    if process.returncode != 0:
        raise RuntimeError(process.stderr.decode("utf-8", errors="replace") or "git_status_failed")
    return _parse_porcelain_z(process.stdout)


def load_release_scope(root: Path, scope_path: Path = SCOPE_PATH) -> dict:
    path = root / scope_path
    if not path.exists():
        raise ReleaseBlocked(f"release_scope_missing:{scope_path.as_posix()}")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ReleaseBlocked(f"release_scope_invalid:{exc}") from exc
    raw_files = payload.get("files")
    if not isinstance(raw_files, list) or not raw_files:
        raise ReleaseBlocked("release_scope_files_empty")
    files = list(dict.fromkeys(_normalize_path(str(value)) for value in raw_files))
    volatile = [path for path in files if _is_volatile(path)]
    if volatile:
        raise ReleaseBlocked(f"release_scope_contains_volatile:{','.join(volatile)}")
    payload["files"] = files
    payload.setdefault("version", VERSION)
    payload.setdefault("commit_message", f"{VERSION} safe Git release automation")
    return payload


def scoped_release_changes(root: Path, scope_files: Iterable[str]) -> tuple[list[GitChange], list[GitChange], list[str]]:
    by_path = {change.path.replace("\\", "/"): change for change in git_changes(root)}
    selected: list[GitChange] = []
    unchanged: list[str] = []
    scope = set(scope_files)
    for path in scope_files:
        change = by_path.get(path)
        if change is None:
            unchanged.append(path)
        else:
            selected.append(change)
    unrelated = [change for path, change in by_path.items() if path not in scope and not _is_volatile(path)]
    return selected, unrelated, unchanged


def _repo_preflight(root: Path) -> dict:
    inside = _run(root, ["git", "rev-parse", "--is-inside-work-tree"])
    branch = _run(root, ["git", "branch", "--show-current"])
    origin = _run(root, ["git", "remote", "get-url", "origin"])
    conflicts = _run(root, ["git", "diff", "--name-only", "--diff-filter=U"])
    staged = _run(root, ["git", "diff", "--cached", "--name-only"])
    return {
        "pass": (
            inside["returncode"] == 0
            and inside["stdout"].lower() == "true"
            and branch["stdout"] == "main"
            and origin["returncode"] == 0
            and not conflicts["stdout"]
            and not staged["stdout"]
        ),
        "branch": branch["stdout"],
        "origin": origin["stdout"],
        "preexisting_staged_files": staged["stdout"].splitlines(),
        "checks": {"inside": inside, "branch": branch, "origin": origin, "conflicts": conflicts, "staged": staged},
    }


def _run_tests(root: Path) -> dict:
    result = _run(root, [sys.executable, "-m", "pytest", "-q"], timeout=900)
    return {"pass": result["returncode"] == 0, "result": result}


def _stage_selected(root: Path, changes: Iterable[GitChange]) -> dict:
    paths = list(dict.fromkeys(change.path for change in changes))
    if not paths:
        return {"pass": True, "paths": [], "results": []}
    results = []
    for start in range(0, len(paths), 80):
        chunk = paths[start:start + 80]
        result = _run(root, ["git", "add", "--", *chunk], timeout=300)
        results.append(result)
        if result["returncode"] != 0:
            return {"pass": False, "paths": paths, "results": results}
    return {"pass": True, "paths": paths, "results": results}


def _staged_files(root: Path) -> list[str]:
    result = _run(root, ["git", "diff", "--cached", "--name-only"])
    return result["stdout"].splitlines() if result["returncode"] == 0 else []


def _unstage(root: Path, files: Iterable[str]) -> None:
    paths = list(files)
    if paths:
        _run(root, ["git", "restore", "--staged", "--", *paths], timeout=300)


def run_release(
    root: Path,
    *,
    execute: bool,
    push: bool,
    message: str | None = None,
    include_deletions: bool = False,
    allow_unrelated_changes: bool = True,
) -> dict:
    root = root.resolve()
    report: dict = {
        "version": VERSION,
        "mode": "execute" if execute else "dry_run",
        "created_at": now_iso(),
        "stages": [],
    }

    identity = load_identity(root)
    report["publisher_id"] = identity["publisher_id"]

    try:
        scope = load_release_scope(root)
    except ReleaseBlocked as exc:
        report.update(status="blocked", reason=str(exc), pass_=False)
        report["pass"] = False
        save_json(root / REPORT_PATH, report)
        return report
    report["release_scope"] = scope
    commit_message = message or str(scope["commit_message"])

    repo = _repo_preflight(root)
    report["stages"].append({"name": "git_preflight", "pass": repo["pass"], "result": repo})
    if not repo["pass"]:
        report.update(status="blocked", reason="git_preflight_failed", pass_=False)
        report["pass"] = False
        save_json(root / REPORT_PATH, report)
        return report

    tests = _run_tests(root)
    report["stages"].append({"name": "regression", "pass": tests["pass"], "result": tests})
    if not tests["pass"]:
        report.update(status="blocked", reason="tests_failed", pass_=False)
        report["pass"] = False
        save_json(root / REPORT_PATH, report)
        return report

    integrity = verify_deployment_integrity(root, repair=False)
    report["stages"].append({"name": "deployment_integrity", "pass": bool(integrity.get("pass")), "result": integrity})
    if not integrity.get("pass"):
        report.update(status="blocked", reason="deployment_integrity_failed", pass_=False)
        report["pass"] = False
        save_json(root / REPORT_PATH, report)
        return report

    selected, unrelated, unchanged = scoped_release_changes(root, scope["files"])
    deletions = [change for change in selected if change.deleted]
    if not include_deletions:
        selected = [change for change in selected if not change.deleted]
    report["selected_files"] = [change.path for change in selected]
    report["unrelated_changes"] = [change.path for change in unrelated]
    report["unchanged_scope_files"] = unchanged
    report["skipped_deletions"] = [change.path for change in deletions] if not include_deletions else []

    if unrelated and not allow_unrelated_changes:
        report.update(status="blocked", reason="unrelated_changes_present", pass_=False)
        report["pass"] = False
        save_json(root / REPORT_PATH, report)
        return report

    if not execute:
        report.update(status="dry_run", pass_=True)
        report["pass"] = True
        save_json(root / REPORT_PATH, report)
        return report

    staged = _stage_selected(root, selected)
    report["stages"].append({"name": "stage_release_scope", "pass": staged["pass"], "result": staged})
    if not staged["pass"]:
        _unstage(root, staged.get("paths", []))
        report.update(status="failed", reason="git_stage_failed", pass_=False)
        report["pass"] = False
        save_json(root / REPORT_PATH, report)
        return report

    staged_files = _staged_files(root)
    expected = set(staged["paths"])
    unexpected = [path for path in staged_files if path not in expected]
    report["staged_files"] = staged_files
    report["unexpected_staged_files"] = unexpected
    if unexpected:
        _unstage(root, staged_files)
        report.update(status="blocked", reason="unexpected_staged_files", pass_=False)
        report["pass"] = False
        save_json(root / REPORT_PATH, report)
        return report

    if not staged_files:
        report.update(status="completed_no_changes", pass_=True)
        report["pass"] = True
        save_json(root / REPORT_PATH, report)
        return report

    commit = _run(root, ["git", "commit", "-m", commit_message], timeout=300)
    report["stages"].append({"name": "commit", "pass": commit["returncode"] == 0, "result": commit})
    if commit["returncode"] != 0:
        _unstage(root, staged_files)
        report.update(status="failed", reason="git_commit_failed", pass_=False)
        report["pass"] = False
        save_json(root / REPORT_PATH, report)
        return report

    if push:
        push_result = _run(root, ["git", "push", "origin", "main"], timeout=600)
        report["stages"].append({"name": "push", "pass": push_result["returncode"] == 0, "result": push_result})
        if push_result["returncode"] != 0:
            report.update(status="committed_push_failed", reason="git_push_failed", pass_=False)
            report["pass"] = False
            save_json(root / REPORT_PATH, report)
            return report

    report.update(status="completed", completed_at=now_iso(), pass_=True)
    report["pass"] = True
    save_json(root / REPORT_PATH, report)
    return report


def _print_summary(report: dict) -> None:
    print("=" * 68)
    print(f"Savingio Factory {VERSION} - Safe Release Scope")
    print("=" * 68)
    print(f"STATUS: {report.get('status')}")
    print(f"PUBLISHER: {report.get('publisher_id', '-')}")
    for stage in report.get("stages", []):
        print(f"[{'PASS' if stage.get('pass') else 'FAIL'}] {stage.get('name')}")
    print(f"SELECTED FILES: {len(report.get('selected_files', []))}")
    print(f"UNRELATED CHANGES LEFT UNTOUCHED: {len(report.get('unrelated_changes', []))}")
    print(f"SKIPPED DELETIONS: {len(report.get('skipped_deletions', []))}")
    if report.get("reason"):
        print(f"BLOCKED REASON: {report['reason']}")
    print("=" * 68)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Savingio safe one-click release")
    parser.add_argument("--root", default=".")
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--no-push", action="store_true")
    parser.add_argument("--include-deletions", action="store_true")
    parser.add_argument("--strict-clean", action="store_true", help="Block when changes exist outside release scope")
    parser.add_argument("--message", default=None)
    args = parser.parse_args(argv)

    report = run_release(
        Path(args.root),
        execute=args.execute,
        push=not args.no_push,
        message=args.message,
        include_deletions=args.include_deletions,
        allow_unrelated_changes=not args.strict_clean,
    )
    _print_summary(report)
    return 0 if report.get("pass") else 1


if __name__ == "__main__":
    raise SystemExit(main())

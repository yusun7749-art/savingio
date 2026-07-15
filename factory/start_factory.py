from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

from .cloudflare_deploy_verify import verify_latest_deployment
from .deprecated_api_scan import scan_deprecated_apis
from .one_click_release import run_release
from .utils import now_iso, save_json

REPORT_PATH = Path("factory/output/start_factory_report.json")
VERSION_PATH = Path("VERSION.json")


def load_version(root: Path) -> str:
    path = root / VERSION_PATH
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"version_file_invalid:{exc}") from exc
    label = str(payload.get("label") or payload.get("version") or "").strip()
    if not label:
        raise RuntimeError("version_label_missing")
    return label if label.upper().startswith("V") else f"V{label}"


def _run(root: Path, command: list[str], timeout: int = 1200) -> dict[str, Any]:
    try:
        process = subprocess.run(
            command,
            cwd=root,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
            timeout=timeout,
        )
        return {
            "command": command,
            "returncode": process.returncode,
            "stdout": process.stdout.strip(),
            "stderr": process.stderr.strip(),
        }
    except subprocess.TimeoutExpired:
        return {"command": command, "returncode": 124, "stdout": "", "stderr": "timeout"}


def run_start_factory(root: Path, *, execute: bool = True, push: bool = True) -> dict[str, Any]:
    root = root.resolve()
    version = load_version(root)
    report: dict[str, Any] = {
        "version": version,
        "created_at": now_iso(),
        "status": "running",
        "stages": [],
    }

    tests = _run(root, [sys.executable, "-m", "pytest", "-q", "-W", "error::DeprecationWarning"])
    report["stages"].append({"name": "regression_warning_free", "pass": tests["returncode"] == 0, "result": tests})
    if tests["returncode"] != 0:
        report.update(status="blocked", reason="regression_warning_failed", pass_=False)
        report["pass"] = False
        save_json(root / REPORT_PATH, report)
        return report

    deprecated = scan_deprecated_apis(root)
    report["stages"].append({"name": "deprecated_api_scan", "pass": bool(deprecated.get("pass")), "result": deprecated})
    if not deprecated.get("pass"):
        report.update(status="blocked", reason="deprecated_api_scan_failed", pass_=False)
        report["pass"] = False
        save_json(root / REPORT_PATH, report)
        return report

    release = run_release(
        root,
        execute=execute,
        push=push,
        message=f"{version} single START Factory release center",
        include_deletions=False,
        allow_unrelated_changes=True,
    )
    report["stages"].append({"name": "safe_git_release", "pass": bool(release.get("pass")), "result": release})
    if not release.get("pass"):
        report.update(status="blocked", reason=release.get("reason", "safe_git_release_failed"), pass_=False)
        report["pass"] = False
        save_json(root / REPORT_PATH, report)
        return report

    cloudflare = None
    if execute and push and release.get("status") == "completed":
        cloudflare = verify_latest_deployment(root, execute=True)
        cloudflare_pass = bool(cloudflare.get("pass")) or cloudflare.get("status") == "success"
        report["stages"].append({"name": "cloudflare_verify", "pass": cloudflare_pass, "result": cloudflare})
        if not cloudflare_pass:
            report.update(status="released_cloudflare_unverified", reason=cloudflare.get("reason", "cloudflare_verify_failed"), pass_=False)
            report["pass"] = False
            save_json(root / REPORT_PATH, report)
            return report

    report.update(status="completed", completed_at=now_iso(), pass_=True)
    report["pass"] = True
    report["release"] = release
    report["cloudflare"] = cloudflare
    save_json(root / REPORT_PATH, report)
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Savingio Factory stable single-click launcher")
    parser.add_argument("--root", default=".")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-push", action="store_true")
    args = parser.parse_args(argv)

    report = run_start_factory(Path(args.root), execute=not args.dry_run, push=not args.no_push)
    print(f"VERSION: {report.get('version')}")
    print(f"STATUS: {report.get('status')}")
    for stage in report.get("stages", []):
        print(f"[{'PASS' if stage.get('pass') else 'FAIL'}] {stage.get('name')}")
    return 0 if report.get("pass") else 1


if __name__ == "__main__":
    raise SystemExit(main())

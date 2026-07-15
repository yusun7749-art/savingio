from __future__ import annotations

from pathlib import Path
from datetime import datetime
import json
import os
import subprocess
import time
import urllib.request
import urllib.error

from .deployment_integrity import verify_deployment_integrity
from .adsense_manager import load_identity
from .factory_cleaner import clean_factory
from .utils import now_iso, save_json

DEFAULT_SITE = "https://savingio.com"


def _run(root: Path, args: list[str], timeout: int = 180) -> dict:
    try:
        p = subprocess.run(args, cwd=root, capture_output=True, text=True, check=False, timeout=timeout)
        return {"command": args, "returncode": p.returncode, "stdout": p.stdout.strip(), "stderr": p.stderr.strip()}
    except subprocess.TimeoutExpired as exc:
        return {"command": args, "returncode": 124, "stdout": (exc.stdout or "").strip() if isinstance(exc.stdout, str) else "", "stderr": "timeout"}


def _git_available(root: Path) -> dict:
    checks = {
        "repo": _run(root, ["git", "rev-parse", "--is-inside-work-tree"]),
        "branch": _run(root, ["git", "branch", "--show-current"]),
        "origin": _run(root, ["git", "remote", "get-url", "origin"]),
        "conflicts": _run(root, ["git", "diff", "--name-only", "--diff-filter=U"]),
    }
    return {
        "pass": checks["repo"]["returncode"] == 0 and checks["repo"]["stdout"].lower() == "true"
                and checks["branch"]["stdout"] == "main" and checks["origin"]["returncode"] == 0
                and not checks["conflicts"]["stdout"],
        "branch": checks["branch"]["stdout"],
        "origin": checks["origin"]["stdout"],
        "checks": checks,
    }


def _changed_files(root: Path) -> list[str]:
    result = _run(root, ["git", "status", "--porcelain", "--untracked-files=all"])
    files: list[str] = []
    for line in result["stdout"].splitlines():
        if len(line) < 4:
            continue
        value = line[3:]
        if " -> " in value:
            value = value.split(" -> ", 1)[1]
        value = value.strip().strip('"')
        normalized = value.replace("\\", "/")
        if not normalized or any(part in {".git", "__pycache__", ".pytest_cache"} for part in normalized.split("/")):
            continue
        if normalized.endswith((".pyc", ".pyo", ".tmp", ".log")):
            continue
        files.append(value)
    return list(dict.fromkeys(files))


def _ahead_behind(root: Path) -> dict:
    fetch = _run(root, ["git", "fetch", "origin", "main"])
    if fetch["returncode"] != 0:
        return {"pass": False, "fetch": fetch, "ahead": None, "behind": None}
    count = _run(root, ["git", "rev-list", "--left-right", "--count", "origin/main...HEAD"])
    try:
        behind, ahead = [int(v) for v in count["stdout"].split()]
    except Exception:
        return {"pass": False, "fetch": fetch, "count": count, "ahead": None, "behind": None}
    return {"pass": True, "fetch": fetch, "count": count, "ahead": ahead, "behind": behind}


def _backup_branch(root: Path, version: str) -> dict:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    name = f"backup-auto-{version.lower().replace('.', '-')}-{stamp}"
    result = _run(root, ["git", "branch", name])
    return {"name": name, "result": result, "pass": result["returncode"] == 0}


def _http_text(url: str, timeout: int = 20) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": "SavingioFactory/2.046"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8", errors="replace")
            return {"pass": 200 <= response.status < 400, "status": response.status, "url": url, "body": body}
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        return {"pass": False, "status": None, "url": url, "error": str(exc), "body": ""}


def verify_live_site(base_url: str = DEFAULT_SITE, attempts: int = 12, interval: int = 10) -> dict:
    base = base_url.rstrip("/")
    identity = load_identity(Path(__file__).resolve().parent.parent)
    official_publisher = identity["publisher_id"]
    official_client = identity["adsense_client"]
    history = []
    for attempt in range(1, attempts + 1):
        ads = _http_text(f"{base}/ads.txt")
        home = _http_text(f"{base}/")
        robots = _http_text(f"{base}/robots.txt")
        sitemap = _http_text(f"{base}/sitemap.xml")
        ads_ok = ads["pass"] and ads["body"].strip() == identity["ads_txt_line"]
        home_ok = home["pass"] and official_client in home["body"] and "1993439759222559" not in home["body"]
        result = {
            "attempt": attempt,
            "pass": ads_ok and home_ok and robots["pass"] and sitemap["pass"],
            "ads_txt": {"pass": ads_ok, "status": ads.get("status")},
            "home_publisher": {"pass": home_ok, "status": home.get("status")},
            "robots": {"pass": robots["pass"], "status": robots.get("status")},
            "sitemap": {"pass": sitemap["pass"], "status": sitemap.get("status")},
        }
        history.append(result)
        if result["pass"]:
            return {"pass": True, "attempts": attempt, "history": history, "verified_at": now_iso()}
        if attempt < attempts:
            time.sleep(interval)
    return {"pass": False, "attempts": attempts, "history": history, "verified_at": now_iso()}


def run_auto_release(
    root: Path,
    *,
    version: str = "V2.046",
    message: str | None = None,
    execute: bool = False,
    verify_live: bool = True,
    base_url: str = DEFAULT_SITE,
) -> dict:
    message = message or f"{version} one-click release automation"
    report_path = root / "factory" / "output" / "auto_release_report.json"
    report: dict = {"version": version, "status": "started", "execute": execute, "created_at": now_iso(), "stages": []}

    clean = clean_factory(root)
    report["stages"].append({"stage": "cleaner", "pass": bool(clean.get("pass")), "result": clean})
    if not clean.get("pass"):
        report.update(status="blocked", reason="factory_cleaner_failed")
        save_json(report_path, report); return report

    integrity = verify_deployment_integrity(root, repair=True)
    report["stages"].append({"stage": "deployment_integrity", "pass": bool(integrity.get("pass")), "result": integrity})
    if not integrity.get("pass"):
        report.update(status="blocked", reason="deployment_integrity_failed")
        save_json(report_path, report); return report

    repo = _git_available(root)
    report["stages"].append({"stage": "git_preflight", "pass": repo["pass"], "result": repo})
    if not repo["pass"]:
        report.update(status="blocked", reason="git_preflight_failed")
        save_json(report_path, report); return report

    changed = _changed_files(root)
    report["changed_files"] = changed
    if not execute:
        report["sync_before"] = {"status": "planned_on_execute"}
        report["plan"] = {
            "commands": [["git", "add", "-A"], ["git", "commit", "-m", message], ["git", "push", "origin", "main"]],
            "commit": bool(changed),
            "live_verification": verify_live,
        }
        report.update(status="dry_run")
        report["pass"] = True
        save_json(report_path, report); return report

    sync = _ahead_behind(root)
    report["sync_before"] = sync
    if not sync.get("pass"):
        report.update(status="blocked", reason="git_fetch_failed")
        save_json(report_path, report); return report
    if sync["ahead"] and sync["behind"]:
        backup = _backup_branch(root, version) if execute else {"name": "planned", "pass": True}
        report["backup"] = backup
        report.update(status="blocked", reason="branch_diverged_manual_review_required")
        save_json(report_path, report); return report

    plan = {
        "commands": [["git", "add", "-A"]],
        "commit": bool(changed),
        "message": message,
        "pull_rebase": sync["behind"] > 0,
        "push": True,
    }
    report["plan"] = plan
    backup = _backup_branch(root, version)
    report["backup"] = backup
    if not backup["pass"]:
        report.update(status="blocked", reason="backup_branch_failed")
        save_json(report_path, report); return report

    results = []
    if changed:
        for command in (["git", "add", "-A"], ["git", "commit", "-m", message]):
            result = _run(root, command)
            results.append(result)
            if result["returncode"] != 0:
                report.update(status="failed", reason="git_commit_failed", git_results=results)
                save_json(report_path, report); return report

    if sync["behind"] > 0:
        rebase = _run(root, ["git", "pull", "--rebase", "origin", "main"])
        results.append(rebase)
        if rebase["returncode"] != 0:
            abort = _run(root, ["git", "rebase", "--abort"])
            results.append(abort)
            report.update(status="blocked", reason="rebase_conflict_aborted", git_results=results)
            save_json(report_path, report); return report

    push = _run(root, ["git", "push", "origin", "main"], timeout=300)
    results.append(push)
    report["git_results"] = results
    if push["returncode"] != 0:
        report.update(status="failed", reason="git_push_failed")
        save_json(report_path, report); return report

    if verify_live:
        live = verify_live_site(base_url)
        report["live_verification"] = live
        if not live["pass"]:
            report.update(status="pushed_live_verification_failed", reason="cloudflare_or_live_site_not_ready", pass_=False)
            report["pass"] = False
            save_json(report_path, report); return report

    report.update(status="completed", pass_=True)
    report["pass"] = True
    report["completed_at"] = now_iso()
    save_json(report_path, report)
    return report

from __future__ import annotations

import argparse
from pathlib import Path

from .cloudflare_deploy_verify import verify_latest_deployment
from .one_click_release import run_release
from .release_scope_manager import (
    build_release_scope,
    load_candidates_file,
    write_release_scope,
)
from .utils import now_iso, save_json

VERSION = "V2.050"
REPORT_PATH = Path("factory/output/release_pipeline_report.json")


def run_pipeline(
    root: Path,
    *,
    execute: bool,
    push: bool,
    candidates: list[str] | None = None,
    commit_message: str | None = None,
    include_deletions: bool = False,
    verify_cloudflare: bool = True,
) -> dict:
    root = root.resolve()
    report = {"version": VERSION, "created_at": now_iso(), "stages": []}

    try:
        scope = build_release_scope(
            root,
            version=VERSION,
            commit_message=commit_message,
            candidates=candidates,
            include_deletions=include_deletions,
        )
        preview = write_release_scope(root, scope)
        report["stages"].append({"name": "release_scope", "pass": True, "result": preview})
    except Exception as exc:
        report.update(status="blocked", reason=str(exc), pass_=False)
        report["pass"] = False
        save_json(root / REPORT_PATH, report)
        return report

    release = run_release(
        root,
        execute=execute,
        push=push,
        message=commit_message,
        include_deletions=include_deletions,
        allow_unrelated_changes=True,
    )
    report["stages"].append({"name": "safe_git_release", "pass": bool(release.get("pass")), "result": release})
    if not release.get("pass"):
        report.update(status="blocked", reason=release.get("reason", "release_failed"), pass_=False)
        report["pass"] = False
        save_json(root / REPORT_PATH, report)
        return report

    cloudflare = None
    if verify_cloudflare and execute and push and release.get("status") == "completed":
        cloudflare = verify_latest_deployment(root, execute=True)
        cloudflare_pass = cloudflare.get("status") not in {"blocked", "failed", "error", "timeout"}
        report["stages"].append({"name": "cloudflare_verify", "pass": cloudflare_pass, "result": cloudflare})
        if not cloudflare_pass:
            report.update(status="released_cloudflare_unverified", reason=cloudflare.get("reason", "cloudflare_verify_failed"), pass_=False)
            report["pass"] = False
            save_json(root / REPORT_PATH, report)
            return report

    report.update(status=release.get("status", "completed"), pass_=True, completed_at=now_iso())
    report["pass"] = True
    report["scope"] = scope
    report["cloudflare"] = cloudflare
    save_json(root / REPORT_PATH, report)
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Savingio V2.050 release pipeline")
    parser.add_argument("--root", default=".")
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--no-push", action="store_true")
    parser.add_argument("--no-cloudflare", action="store_true")
    parser.add_argument("--include-deletions", action="store_true")
    parser.add_argument("--message")
    parser.add_argument("--candidates-file")
    args = parser.parse_args(argv)

    candidates = load_candidates_file(Path(args.candidates_file)) if args.candidates_file else None
    report = run_pipeline(
        Path(args.root),
        execute=args.execute,
        push=not args.no_push,
        candidates=candidates,
        commit_message=args.message,
        include_deletions=args.include_deletions,
        verify_cloudflare=not args.no_cloudflare,
    )
    print(f"STATUS: {report.get('status')}")
    for stage in report.get("stages", []):
        print(f"[{'PASS' if stage.get('pass') else 'FAIL'}] {stage.get('name')}")
    return 0 if report.get("pass") else 1


if __name__ == "__main__":
    raise SystemExit(main())

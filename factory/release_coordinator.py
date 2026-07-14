from __future__ import annotations
from pathlib import Path
import json
from .deployment_gate import evaluate_deployment_gate
from .git_release_executor import execute_release
from .cloudflare_pages_client import CloudflarePagesClient
from .cloudflare_deployment_monitor import monitor_with_client, save_monitor_report
from .utils import save_json, now_iso

def coordinate_release(
    project_root: Path,
    files: list[str],
    message: str,
    *,
    execute: bool = False,
    push: bool = True,
    verify_cloudflare: bool = True,
) -> dict:
    gate = evaluate_deployment_gate(project_root)
    if not gate["pass"]:
        result = {
            "status": "blocked",
            "reason": "deployment_gate_failed",
            "gate": gate,
            "created_at": now_iso(),
        }
        save_json(project_root / "factory" / "output" / "release_coordinator_report.json", result)
        return result

    git_result = execute_release(
        project_root,
        files,
        message,
        push=push,
        dry_run=not execute,
        allowed_branches=["main"],
    )
    if git_result["status"] not in {"completed", "dry_run"}:
        result = {
            "status": "failed",
            "stage": "git",
            "git": git_result,
            "created_at": now_iso(),
        }
        save_json(project_root / "factory" / "output" / "release_coordinator_report.json", result)
        return result

    if not execute or not verify_cloudflare:
        result = {
            "status": "dry_run" if not execute else "completed_without_cloudflare_verification",
            "gate": gate,
            "git": git_result,
            "created_at": now_iso(),
        }
        save_json(project_root / "factory" / "output" / "release_coordinator_report.json", result)
        return result

    try:
        client = CloudflarePagesClient.from_env()
    except RuntimeError as exc:
        result = {
            "status": "completed_git_unverified_cloudflare",
            "gate": gate,
            "git": git_result,
            "cloudflare": {
                "status": "blocked",
                "reason": "cloudflare_not_configured",
                "error": str(exc),
            },
            "created_at": now_iso(),
        }
        save_json(project_root / "factory" / "output" / "release_coordinator_report.json", result)
        return result

    cloudflare = save_monitor_report(project_root, monitor_with_client(client))
    result = {
        "status": "completed" if cloudflare["status"] == "success" else "failed_cloudflare",
        "gate": gate,
        "git": git_result,
        "cloudflare": cloudflare,
        "created_at": now_iso(),
    }
    save_json(project_root / "factory" / "output" / "release_coordinator_report.json", result)
    return result

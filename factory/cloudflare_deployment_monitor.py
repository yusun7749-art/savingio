from __future__ import annotations
from pathlib import Path
import json, os, time
from .utils import save_json, now_iso

TERMINAL_SUCCESS = {"success"}
TERMINAL_FAILURE = {"failure", "failed", "canceled", "cancelled"}

def parse_deployment(payload: dict) -> dict:
    deployment = payload.get("deployment") or payload.get("result") or payload
    stage = deployment.get("latest_stage") or {}
    status = str(stage.get("status") or deployment.get("status") or "").lower()
    return {
        "id": deployment.get("id"),
        "status": status,
        "url": deployment.get("url") or deployment.get("aliases", [None])[0] if deployment.get("aliases") else deployment.get("url"),
        "environment": deployment.get("environment"),
        "created_on": deployment.get("created_on"),
        "terminal": status in TERMINAL_SUCCESS | TERMINAL_FAILURE,
        "success": status in TERMINAL_SUCCESS,
    }

def monitor_with_client(client, timeout_seconds: int = 180, poll_seconds: int = 10) -> dict:
    started = time.time()
    history = []
    while time.time() - started <= timeout_seconds:
        response = client.latest_deployment()
        if response.get("status") == "error":
            history.append({"status": "api_error", "error": response.get("error"), "checked_at": now_iso()})
        else:
            parsed = parse_deployment(response)
            parsed["checked_at"] = now_iso()
            history.append(parsed)
            if parsed["terminal"]:
                return {
                    "status": "success" if parsed["success"] else "failure",
                    "deployment": parsed,
                    "history": history,
                    "elapsed_seconds": round(time.time() - started),
                }
        time.sleep(max(1, int(poll_seconds)))
    return {
        "status": "timeout",
        "history": history,
        "elapsed_seconds": round(time.time() - started),
    }

def save_monitor_report(project_root: Path, report: dict) -> dict:
    save_json(project_root / "factory" / "output" / "cloudflare_monitor_report.json", report)
    return report

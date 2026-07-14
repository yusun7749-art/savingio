from __future__ import annotations
from pathlib import Path
import json, os, subprocess
from .utils import save_json, now_iso

def deployment_readiness(project_root: Path) -> dict:
    return {
        "provider":"Cloudflare Pages",
        "mode":"git_push_auto_deploy",
        "git_repo":(project_root/".git").exists(),
        "account_id_configured":bool(os.getenv("CLOUDFLARE_ACCOUNT_ID")),
        "api_token_configured":bool(os.getenv("CLOUDFLARE_API_TOKEN")),
        "project_name":os.getenv("CLOUDFLARE_PAGES_PROJECT",""),
        "direct_api_ready":all([
            os.getenv("CLOUDFLARE_ACCOUNT_ID"),
            os.getenv("CLOUDFLARE_API_TOKEN"),
            os.getenv("CLOUDFLARE_PAGES_PROJECT"),
        ]),
        "git_auto_deploy_ready":(project_root/".git").exists(),
        "checked_at":now_iso(),
    }

def record_deployment_event(project_root: Path, status: str, detail: dict) -> dict:
    payload = {
        "provider":"Cloudflare Pages",
        "status":status,
        "detail":detail,
        "recorded_at":now_iso(),
    }
    path = project_root/"factory"/"output"/"deployment_log.json"
    current = []
    if path.exists():
        current = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(current,list):
            current=[current]
    current.append(payload)
    current=current[-200:]
    save_json(path,current)
    return payload

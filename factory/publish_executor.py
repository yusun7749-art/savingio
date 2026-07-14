from __future__ import annotations
from pathlib import Path
import json
from .deployment_gate import evaluate_deployment_gate
from .git_executor import selective_commit
from .cloudflare_deploy import deployment_readiness, record_deployment_event
from .utils import now_iso

def execute_publication(
    project_root: Path,
    files: list[str],
    message: str,
    push: bool=True,
    dry_run: bool=True,
) -> dict:
    gate = evaluate_deployment_gate(project_root)
    readiness = deployment_readiness(project_root)
    if not gate["pass"]:
        result = {
            "status":"blocked",
            "reason":"deployment_gate_failed",
            "gate":gate,
            "readiness":readiness,
            "created_at":now_iso(),
        }
        record_deployment_event(project_root,"blocked",result)
        return result
    git_result = selective_commit(
        project_root,files,message,push=push,dry_run=dry_run
    )
    status = "planned" if dry_run else git_result["status"]
    result = {
        "status":status,
        "gate":gate,
        "readiness":readiness,
        "git":git_result,
        "created_at":now_iso(),
    }
    record_deployment_event(project_root,status,result)
    return result

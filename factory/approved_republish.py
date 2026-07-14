from __future__ import annotations
from pathlib import Path
import os
from .approved_release_gate import evaluate_approved_release
from .git_release_executor import execute_release
from .cloudflare_pages_client import CloudflarePagesClient
from .cloudflare_new_deployment import deployment_id_from_response, wait_for_new_deployment
from .post_deploy_verifier import verify_deployed_site
from .release_journal import append_release_event
from .utils import save_json, now_iso

def run_approved_republish(
    project_root: Path,
    files: list[str],
    message: str,
    *,
    execute: bool=False,
    verify_cloudflare: bool=True,
    verify_site: bool=True,
) -> dict:
    gate = evaluate_approved_release(project_root,files)
    if not gate["pass"]:
        result = {
            "status":"blocked",
            "stage":"approval_gate",
            "gate":gate,
            "created_at":now_iso(),
        }
        append_release_event(project_root,{"status":"blocked","stage":"approval_gate","blockers":gate["blockers"]})
        save_json(project_root/"factory"/"output"/"approved_republish_report.json",result)
        return result

    cloudflare_client = None
    previous_deployment_id = None
    cloudflare_config_error = None
    if verify_cloudflare:
        try:
            cloudflare_client = CloudflarePagesClient.from_env()
            previous_response = cloudflare_client.latest_deployment()
            previous_deployment_id = deployment_id_from_response(previous_response)
        except RuntimeError as exc:
            cloudflare_config_error = str(exc)

    git_result = execute_release(
        project_root,
        gate["selected_files"],
        message,
        push=True,
        dry_run=not execute,
        allowed_branches=["main"],
    )
    if git_result["status"] not in {"dry_run","completed"}:
        result = {
            "status":"failed",
            "stage":"git",
            "gate":gate,
            "git":git_result,
            "created_at":now_iso(),
        }
        append_release_event(project_root,{"status":"failed","stage":"git","git_status":git_result["status"]})
        save_json(project_root/"factory"/"output"/"approved_republish_report.json",result)
        return result

    if not execute:
        result = {
            "status":"dry_run",
            "gate":gate,
            "git":git_result,
            "cloudflare":{
                "enabled":verify_cloudflare,
                "configured":cloudflare_client is not None,
                "configuration_error":cloudflare_config_error,
                "previous_deployment_id":previous_deployment_id,
            },
            "created_at":now_iso(),
        }
        append_release_event(project_root,{"status":"dry_run","stage":"approved_republish","files":gate["selected_files"]})
        save_json(project_root/"factory"/"output"/"approved_republish_report.json",result)
        return result

    cloudflare = None
    if verify_cloudflare:
        if cloudflare_client is None:
            cloudflare = {
                "status":"blocked",
                "reason":"cloudflare_not_configured",
                "error":cloudflare_config_error,
            }
        else:
            cloudflare = wait_for_new_deployment(
                cloudflare_client,
                previous_deployment_id,
                timeout_seconds=240,
                poll_seconds=10,
            )

    site_verification = None
    if verify_site and (not cloudflare or cloudflare.get("status")=="success"):
        base_url = os.getenv("SAVINGIO_SITE_URL","https://savingio.com")
        article_path = gate.get("rework",{}).get("target")
        site_verification = verify_deployed_site(
            project_root,base_url,article_path=article_path
        )

    success = (
        git_result["status"]=="completed"
        and (not verify_cloudflare or (cloudflare and cloudflare.get("status")=="success"))
        and (not verify_site or (site_verification and site_verification.get("pass")))
    )
    result = {
        "status":"completed" if success else "failed_verification",
        "gate":gate,
        "git":git_result,
        "cloudflare":cloudflare,
        "site_verification":site_verification,
        "created_at":now_iso(),
    }
    append_release_event(project_root,{
        "status":result["status"],
        "stage":"approved_republish",
        "files":gate["selected_files"],
        "cloudflare_status":(cloudflare or {}).get("status"),
        "site_pass":(site_verification or {}).get("pass"),
    })
    save_json(project_root/"factory"/"output"/"approved_republish_report.json",result)
    return result

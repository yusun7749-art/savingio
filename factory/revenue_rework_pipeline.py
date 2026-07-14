from __future__ import annotations
from pathlib import Path
import json
from .revenue_html_rewriter import rewrite_article
from .revenue_qa_recheck import recheck_article
from .revenue_cms_update import update_cms_manifest, append_rework_history
from .utils import save_json, now_iso

def run_revenue_rework(project_root: Path, actions_path: Path | None = None, *, execute: bool=False, limit: int=20) -> dict:
    path = actions_path or project_root/"factory"/"output"/"revenue"/"revenue_ai_actions.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    results = []
    for action in payload.get("actions",[])[:limit]:
        rewrite = rewrite_article(project_root,action,execute=execute)
        item = {"action":action,"rewrite":rewrite}
        if execute and rewrite.get("status")=="completed":
            qa = recheck_article(project_root,project_root/rewrite["target"])
            cms = update_cms_manifest(project_root,rewrite,qa,action)
            item["qa"] = qa
            item["cms"] = cms
        append_rework_history(project_root,item)
        results.append(item)
    report = {"status":"completed","execute":execute,"input_actions":min(len(payload.get("actions",[])),limit),"completed":sum(1 for x in results if x["rewrite"].get("status")=="completed"),"dry_run":sum(1 for x in results if x["rewrite"].get("status")=="dry_run"),"qa_passed":sum(1 for x in results if x.get("cms",{}).get("qa_pass")),"rolled_back":sum(1 for x in results if x.get("cms",{}).get("rollback")),"results":results,"created_at":now_iso()}
    save_json(project_root/"factory"/"output"/"revenue"/"rework_pipeline_report.json",report)
    return report

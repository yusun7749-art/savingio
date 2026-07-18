from __future__ import annotations
from pathlib import Path
from .planner import build_plan
from .researcher import build_research_package
from .research_department import run_research_department
from .seo import build_seo
from .writer import generate_article
from .qa import evaluate
from .cms import save_article
from .catalog import write_catalog, related_links
from .image_engine import build_image_brief, save_image_manifest
from .supervisor import Supervisor
from .approval_center import create_approval_request
from .utils import save_json, now_iso
from .task_dispatcher import TaskDispatcher
from .workflow_state import WorkflowStateManager
from .event_log import DepartmentEventLog
from .rework_manager import ReworkManager
from .approval_checklist import build_final_checklist
from .operation_board import build_operation_board
from .runtime_log_bridge import write_runtime_log


def run_full(topic: str, project_root: Path, evidence_file: Path|None=None) -> dict:
    project_root = project_root.resolve()
    config_dir = project_root / "factory" / "config"
    output_dir = project_root / "factory" / "output"
    output_dir.mkdir(parents=True, exist_ok=True)

    dispatcher = TaskDispatcher(project_root)
    workflow = dispatcher.create_workflow(topic)
    workflow_id = workflow["workflow_id"]
    state_manager = WorkflowStateManager(project_root)
    state_manager.create(workflow_id, topic)
    state_manager.transition(workflow_id, "running")
    events = DepartmentEventLog(project_root)
    events.append("operations", "workflow.started", {"topic": topic}, workflow_id)

    plan = build_plan(topic, config_dir)
    dispatcher.advance(workflow_id, "planning", plan)
    events.append("planning", "department.completed", {"slug": plan["slug"]}, workflow_id)
    research = run_research_department(plan, project_root, [evidence_file] if evidence_file else None)
    dispatcher.advance(workflow_id, "research", research)
    events.append("research", "department.completed", {"evidence_score": research.get("evidence_score", 0)}, workflow_id)
    seo = build_seo(plan, config_dir)
    catalog = write_catalog(project_root, output_dir)
    related = related_links(topic, catalog, limit=5)
    html = generate_article(plan, research, seo, related=related, config_dir=config_dir)
    dispatcher.advance(workflow_id, "writing", {"html_ready": True, "chars": len(html)})
    events.append("writing", "department.completed", {"html_chars": len(html)}, workflow_id)
    dispatcher.advance(workflow_id, "seo", seo)
    events.append("seo", "department.completed", {"canonical": seo.get("canonical")}, workflow_id)
    qa_primary = evaluate(html, plan, research, seo, config_dir)
    dispatcher.advance(workflow_id, "image", {"brief_pending": True})

    rework_log = []
    for attempt in range(2):
        if qa_primary["pass"]:
            break
        rework_log.append({"attempt": attempt+1, "issues": qa_primary["issues"]})
        rework = ReworkManager(project_root).assign(workflow_id, qa_primary["issues"], source="qa_primary")
        events.append("qa_primary", "rework.requested", rework, workflow_id)
        if "text_length" in qa_primary["issues"]:
            html = html.replace("</main>", "<section id='auto-rework'><h2>추가 확인사항</h2><p>적용 대상, 제외 조건, 기준일, 필요 서류, 처리 기간, 문의처를 다시 확인합니다.</p></section></main>")
        qa_primary = evaluate(html, plan, research, seo, config_dir)

    dispatcher.advance(workflow_id, "qa_primary", qa_primary)
    events.append("qa_primary", "department.completed", {"score": qa_primary.get("score")}, workflow_id)
    qa_final = evaluate(html, plan, research, seo, config_dir)
    dispatcher.advance(workflow_id, "qa_final", qa_final)
    events.append("qa_final", "department.completed", {"score": qa_final.get("score")}, workflow_id)
    image_brief = build_image_brief(plan, seo, config_dir)
    image_manifest = save_image_manifest(project_root, image_brief)

    cms_manifest = save_article(project_root, seo, html, qa_final, research, publish=False, overwrite=True)

    dispatcher.advance(workflow_id, "cms", cms_manifest)
    events.append("cms", "department.completed", {"article_path": cms_manifest.get("article_path")}, workflow_id)

    packets = {
        "planning": plan,
        "research": research,
        "writing": {"html": html, "text_chars": qa_final.get("text_chars",0)},
        "seo": seo,
        "image": image_manifest,
        "qa_primary": qa_primary,
        "qa_final": qa_final,
        "cms": cms_manifest,
        "git": {"ready": True, "selected_files_only": True},
        "deploy": {"provider": "Cloudflare Pages", "ready": True},
    }
    supervisor = Supervisor(project_root).final_gate(packets)
    dispatcher.advance(workflow_id, "git", packets["git"])
    dispatcher.advance(workflow_id, "deploy", packets["deploy"])

    result = {
        "factory_version": "2.026",
        "workflow_id": workflow_id,
        "topic": topic,
        "plan": plan,
        "research": research,
        "seo": seo,
        "qa_primary": qa_primary,
        "qa": qa_final,
        "image": image_manifest,
        "cms": cms_manifest,
        "rework_log": rework_log,
        "supervisor": supervisor,
        "deploy": packets["deploy"],
        "completed_at": now_iso(),
    }
    checklist = build_final_checklist(result, project_root)
    result["approval_checklist"] = checklist
    if checklist["ready_for_user_approval"]:
        state_manager.transition(workflow_id, "waiting_approval")
    else:
        state_manager.transition(workflow_id, "rework_required", {"blocking": checklist["blocking_items"]})
    approval = create_approval_request(project_root, result)
    result["approval"] = approval
    result["operation_board"] = build_operation_board(project_root)
    save_json(output_dir / "full_automation_report.json", result)
    write_runtime_log(summary=f"{topic} full automation completed", files="factory/full_automation.py", tests="full automation execution")
    return result

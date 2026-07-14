from __future__ import annotations
from pathlib import Path
import json, py_compile, sqlite3
from .link_graph import build_link_graph
from .adsense_manager import run_adsense_lock

REQUIRED = [
  "adsense_manager.py",
  "auto_release.py",
  "planner.py",
  "researcher.py",
  "writer.py",
  "seo.py",
  "qa.py",
  "cms.py",
  "git_engine.py",
  "deploy.py",
  "pipeline.py",
  "orchestrator.py",
  "state_db.py",
  "scheduler.py",
  "incremental.py",
  "dna_versioning.py",
  "run.py",
  "registry.py",
  "dedupe.py",
  "link_graph.py",
  "publication.py",
  "release.py",
  "adsense_audit.py",
  "eeat.py",
  "indexability.py",
  "source_registry.py",
  "research_collector.py",
  "research_qa.py",
  "research_report.py",
  "research_department.py",
  "web_connector.py",
  "openapi_connector.py",
  "research_cache.py",
  "research_web_runner.py",
  "image_queue.py",
  "image_adapters.py",
  "deployment_gate.py",
  "search_evidence.py",
  "evidence_merge.py",
  "image_result_linker.py",
  "git_executor.py",
  "cloudflare_deploy.py",
  "publish_executor.py",
  "wordpress_connector.py",
  "publish_package.py",
  "wordpress_publisher.py",
  "cloudflare_pages_client.py",
  "cloudflare_deploy_verify.py",
  "service_readiness.py",
  "deployment_receipt.py",
  "git_release_executor.py",
  "cloudflare_deployment_monitor.py",
  "release_coordinator.py",
  "wordpress_taxonomy.py",
  "wordpress_upsert.py",
  "runtime_config.py",
  "wordpress_release_plan.py",
  "cloudflare_health_check.py",
  "government_api_adapters.py",
  "research_ingestion_pipeline.py",
  "image_provider_result.py",
  "google_service_auth.py",
  "search_console_engine.py",
  "ga4_engine.py",
  "analytics_dashboard.py",
  "content_performance_optimizer.py",
  "google_jwt_auth.py",
  "search_console_api.py",
  "ga4_api.py",
  "analytics_scheduler.py",
  "keyword_rank_tracker.py",
  "analytics_rework_bridge.py",
  "google_token_exchange.py",
  "google_access_token.py",
  "article_optimization_executor.py",
  "scheduler_installer.py",
  "department_handoff.py",
  "department_gate.py",
  "automation_cycle.py",
  "auto_rework_engine.py",
  "cycle_dashboard.py",
  "revenue_import.py",
  "revenue_dashboard.py",
  "revenue_ai.py",
  "revenue_task_router.py",
  "revenue_core.py",
  "revenue_html_rewriter.py",
  "revenue_qa_recheck.py",
  "revenue_cms_update.py",
  "revenue_rework_pipeline.py",
  "approved_release_gate.py",
  "cloudflare_new_deployment.py",
  "release_journal.py",
  "post_deploy_verifier.py",
  "approved_republish.py",
  "end_to_end_audit.py",
  "regression_manifest.py",
  "final_release_manifest.py",
  "final_release_coordinator.py",
  "master_checklist.py",
  "external_integration_registry.py",
  "integration_preflight.py",
  "live_verification_plan.py",
  "adsense_report_import.py",
  "adsense_revenue_bridge.py",
  "production_readiness_board.py",
  "operations_snapshot.py",
  "incident_detector.py",
  "recovery_planner.py",
  "retry_policy.py",
  "operations_center.py",
  "credential_onboarding.py",
  "connector_verification_runner.py",
  "connector_verification_receipt.py",
  "production_activation_gate.py",
  "external_verification_center.py",
  "calculator_registry.py",
  "calculator_intent_engine.py",
  "calculator_matcher.py",
  "calculator_generation_request.py",
  "calculator_solution_package.py",
  "calculator_cms_registry.py",
  "calculator_qa.py",
  "calculator_analytics.py",
  "calculator_hq.py",
  "deployment_integrity.py"
]
CONFIGS = [
  "adsense_identity.json",
  "article_dna.json",
  "article_types.json",
  "qa_rules.json",
  "research_rules.json",
  "seo_rules.json",
  "factory_manifest.json",
  "orchestrator_rules.json",
  "publication_rules.json",
  "adsense_rules.json",
  "source_registry.json",
  "research_quality_rules.json",
  "web_connector_rules.json",
  "openapi_sources.json",
  "search_evidence_rules.json",
  "deployment_execution_rules.json",
  "external_services.json",
  "release_rules.json",
  "wordpress_publish_rules.json",
  "government_api_services.json",
  "site_health_rules.json",
  "analytics_rules.json",
  "analytics_schedule_rules.json",
  "automation_execution_rules.json",
  "department_gate_rules.json",
  "revenue_ai_rules.json",
  "revenue_rework_rules.json",
  "approved_republish_rules.json",
  "final_release_rules.json",
  "external_integration_registry.json",
  "production_readiness_rules.json",
  "operations_monitoring_rules.json",
  "external_verification_rules.json",
  "calculator_registry.json",
  "calculator_hq_rules.json",
  "auto_release_rules.json"
]

def run_doctor(project_root: Path, include_publisher_lock: bool=True):
    factory, config = project_root/"factory", project_root/"factory"/"config"
    checks = []

    for name in REQUIRED:
        path = factory/name
        ok, detail = path.exists(), "missing"
        if ok:
            try:
                py_compile.compile(str(path), doraise=True)
                detail = "compiled"
            except Exception as exc:
                ok, detail = False, str(exc)
        checks.append({"name":f"module:{name}","pass":ok,"detail":detail})

    for name in CONFIGS:
        path = config/name
        try:
            json.loads(path.read_text(encoding="utf-8"))
            checks.append({"name":f"config:{name}","pass":True,"detail":"valid json"})
        except Exception as exc:
            checks.append({"name":f"config:{name}","pass":False,"detail":str(exc)})

    db = factory/"state"/"factory.sqlite3"
    try:
        with sqlite3.connect(db) as conn:
            tables = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        required_tables = {"runs","queue","dna_versions","content_registry","approvals","dead_letter"}
        checks.append({
            "name":"sqlite-schema",
            "pass":required_tables.issubset(tables),
            "detail":f"tables={sorted(tables)}"
        })
    except Exception as exc:
        checks.append({"name":"sqlite-schema","pass":False,"detail":str(exc)})

    adsense_lock = None
    if include_publisher_lock:
        adsense_lock = run_adsense_lock(project_root, execute_repair=False, block_on_error=True)
        checks.append({
            "name":"publisher-lock",
            "pass":bool(adsense_lock.get("pass")),
            "detail":f"status={adsense_lock.get('status')} invalid={adsense_lock.get('scan',{}).get('invalid_count')} blockers={adsense_lock.get('blockers',[])}"
        })

    graph = build_link_graph(project_root)
    checks.append({
        "name":"internal-link-scan",
        "pass":True,
        "detail":f"nodes={graph['node_count']} broken={graph['broken_count']} orphans={graph['orphan_count']}"
    })

    return {
        "pass":all(check["pass"] for check in checks),
        "checks":checks,
        "module_count":sum(1 for check in checks if check["name"].startswith("module:")),
        "config_count":sum(1 for check in checks if check["name"].startswith("config:")),
        "adsense_lock":adsense_lock,
        "link_graph_summary":{
            "nodes":graph["node_count"],
            "edges":graph["edge_count"],
            "broken":graph["broken_count"],
            "orphans":graph["orphan_count"],
        }
    }

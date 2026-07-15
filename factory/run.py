import argparse, json, sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from factory.pipeline import execute
    from factory.orchestrator import Orchestrator
    from factory.scheduler import enqueue_many, run_batch
    from factory.doctor import run_doctor
    from factory.incremental import scan_articles, diff_catalog, save_catalog
    from factory.link_graph import save_link_graph
    from factory.publication import approve_package, publish_approved
    from factory.state_db import connect
    from factory.registry import list_content, registry_summary
    from factory.full_automation import run_full
    from factory.approval_center import approve as approve_request, reject as reject_request
    from factory.adsense_audit import audit_site, write_reports
    from factory.eeat import audit_eeat
    from factory.indexability import audit_indexability
    from factory.utils import load_json
    from factory.operation_board import build_operation_board
    from factory.message_bus import DepartmentMessageBus
    from factory.task_dispatcher import TaskDispatcher
    from factory.calculator_analytics import build_calculator_analytics
    from factory.calculator_qa import validate_registry
    from factory.calculator_registry import load_registry, discover_existing_calculators
    from factory.calculator_intent_engine import analyze_calculator_intent
    from factory.calculator_hq import run_calculator_hq
    from factory.calculator_generation_engine import generate_calculator, generate_all_calculators, validate_all_generated
    from factory.calculator_action_engine import build_action_catalog, select_action
    from factory.external_verification_center import run_external_verification_center
    from factory.production_activation_gate import evaluate_production_activation
    from factory.connector_verification_receipt import verify_history
    from factory.connector_verification_runner import run_connector_verification
    from factory.credential_onboarding import build_credential_checklist, write_env_example
    from factory.retry_policy import decide_retry
    from factory.recovery_planner import build_recovery_plan
    from factory.incident_detector import detect_incidents
    from factory.operations_snapshot import build_operations_snapshot
    from factory.operations_center import run_operations_center
    from factory.production_readiness_board import build_production_readiness_board
    from factory.adsense_revenue_bridge import bridge_adsense_to_revenue
    from factory.adsense_report_import import import_adsense_report
    from factory.live_verification_plan import build_live_verification_plan
    from factory.integration_preflight import run_integration_preflight
    from factory.regression_manifest import build_regression_manifest
    from factory.master_checklist import build_master_checklist
    from factory.final_release_coordinator import run_final_release
    from factory.release_journal import verify_release_journal
    from factory.approved_release_gate import evaluate_approved_release
    from factory.approved_republish import run_approved_republish
    from factory.revenue_rework_pipeline import run_revenue_rework
    from factory.revenue_core import run_revenue_core
    from factory.revenue_task_router import route_revenue_actions
    from factory.revenue_ai import analyze_revenue
    from factory.revenue_dashboard import build_revenue_dashboard
    from factory.revenue_import import import_revenue
    from factory.auto_rework_engine import route_issues, execute_analytics_rework
    from factory.cycle_dashboard import build_cycle_dashboard
    from factory.automation_cycle import run_automation_cycle
    from factory.scheduler_installer import generate_scheduler_files
    from factory.article_optimization_executor import execute_actions
    from factory.google_token_exchange import exchange_access_token
    from factory.analytics_scheduler import run_daily_analytics
    from factory.search_console_api import fetch_search_analytics
    from factory.ga4_api import fetch_ga4_report
    from factory.keyword_rank_tracker import build_keyword_rank_report
    from factory.analytics_rework_bridge import dispatch_optimization_actions
    from factory.google_jwt_auth import auth_readiness
    from factory.search_console_engine import import_search_console_export, api_readiness as search_console_readiness
    from factory.ga4_engine import import_ga4_export, api_readiness as ga4_readiness
    from factory.google_service_auth import all_google_services_readiness
    from factory.analytics_dashboard import build_analytics_dashboard
    from factory.content_performance_optimizer import recommend_from_dashboard
    from factory.wordpress_release_plan import execute_wordpress_release
    from factory.cloudflare_health_check import check_site
    from factory.government_api_adapters import run_service, list_services
    from factory.image_provider_result import register_provider_result
    from factory.release_coordinator import coordinate_release
    from factory.runtime_config import write_env_template
    from factory.wordpress_upsert import upsert_post
    from factory.wordpress_connector import WordPressConnector
    from factory.wordpress_publisher import publish_to_wordpress
    from factory.cloudflare_deploy_verify import verify_latest_deployment
    from factory.service_readiness import build_service_readiness
    from factory.search_evidence import convert_search_file
    from factory.evidence_merge import merge_files
    from factory.image_result_linker import register_image_results
    from factory.publish_executor import execute_publication
    from factory.research_web_runner import run_web_research
    from factory.image_queue import ImageQueue
    from factory.deployment_gate import evaluate_deployment_gate
    from factory.factory_cleaner import clean_factory
    from factory.release_packager import build_release_package
    from factory.research_department import run_research_department
    from factory.planner import build_plan
    from factory.auto_release import run_auto_release
else:
    from .pipeline import execute
    from .orchestrator import Orchestrator
    from .scheduler import enqueue_many, run_batch
    from .doctor import run_doctor
    from .incremental import scan_articles, diff_catalog, save_catalog
    from .link_graph import save_link_graph
    from .publication import approve_package, publish_approved
    from .state_db import connect
    from .registry import list_content, registry_summary
    from .full_automation import run_full
    from .approval_center import approve as approve_request, reject as reject_request
    from .adsense_audit import audit_site, write_reports
    from .eeat import audit_eeat
    from .indexability import audit_indexability
    from .utils import load_json
    from .operation_board import build_operation_board
    from .message_bus import DepartmentMessageBus
    from .task_dispatcher import TaskDispatcher
    from .calculator_analytics import build_calculator_analytics
    from .calculator_qa import validate_registry
    from .calculator_registry import load_registry, discover_existing_calculators
    from .calculator_intent_engine import analyze_calculator_intent
    from .calculator_hq import run_calculator_hq
    from .calculator_generation_engine import generate_calculator, generate_all_calculators, validate_all_generated
    from .calculator_action_engine import build_action_catalog, select_action
    from .external_verification_center import run_external_verification_center
    from .production_activation_gate import evaluate_production_activation
    from .connector_verification_receipt import verify_history
    from .connector_verification_runner import run_connector_verification
    from .credential_onboarding import build_credential_checklist, write_env_example
    from .retry_policy import decide_retry
    from .recovery_planner import build_recovery_plan
    from .incident_detector import detect_incidents
    from .operations_snapshot import build_operations_snapshot
    from .operations_center import run_operations_center
    from .production_readiness_board import build_production_readiness_board
    from .adsense_revenue_bridge import bridge_adsense_to_revenue
    from .adsense_report_import import import_adsense_report
    from .live_verification_plan import build_live_verification_plan
    from .integration_preflight import run_integration_preflight
    from .regression_manifest import build_regression_manifest
    from .master_checklist import build_master_checklist
    from .final_release_coordinator import run_final_release
    from .release_journal import verify_release_journal
    from .approved_release_gate import evaluate_approved_release
    from .approved_republish import run_approved_republish
    from .revenue_rework_pipeline import run_revenue_rework
    from .revenue_core import run_revenue_core
    from .revenue_task_router import route_revenue_actions
    from .revenue_ai import analyze_revenue
    from .revenue_dashboard import build_revenue_dashboard
    from .revenue_import import import_revenue
    from .auto_rework_engine import route_issues, execute_analytics_rework
    from .cycle_dashboard import build_cycle_dashboard
    from .automation_cycle import run_automation_cycle
    from .scheduler_installer import generate_scheduler_files
    from .article_optimization_executor import execute_actions
    from .google_token_exchange import exchange_access_token
    from .analytics_scheduler import run_daily_analytics
    from .search_console_api import fetch_search_analytics
    from .ga4_api import fetch_ga4_report
    from .keyword_rank_tracker import build_keyword_rank_report
    from .analytics_rework_bridge import dispatch_optimization_actions
    from .google_jwt_auth import auth_readiness
    from .search_console_engine import import_search_console_export, api_readiness as search_console_readiness
    from .ga4_engine import import_ga4_export, api_readiness as ga4_readiness
    from .google_service_auth import all_google_services_readiness
    from .analytics_dashboard import build_analytics_dashboard
    from .content_performance_optimizer import recommend_from_dashboard
    from .wordpress_release_plan import execute_wordpress_release
    from .cloudflare_health_check import check_site
    from .government_api_adapters import run_service, list_services
    from .image_provider_result import register_provider_result
    from .release_coordinator import coordinate_release
    from .runtime_config import write_env_template
    from .wordpress_upsert import upsert_post
    from .wordpress_connector import WordPressConnector
    from .wordpress_publisher import publish_to_wordpress
    from .cloudflare_deploy_verify import verify_latest_deployment
    from .service_readiness import build_service_readiness
    from .search_evidence import convert_search_file
    from .evidence_merge import merge_files
    from .image_result_linker import register_image_results
    from .publish_executor import execute_publication
    from .research_web_runner import run_web_research
    from .image_queue import ImageQueue
    from .deployment_gate import evaluate_deployment_gate
    from .factory_cleaner import clean_factory
    from .release_packager import build_release_package
    from .research_department import run_research_department
    from .planner import build_plan
    from .auto_release import run_auto_release

def main():
    p=argparse.ArgumentParser(description="Savingio Factory V2.046")
    sub=p.add_subparsers(dest="cmd")

    g=sub.add_parser("generate")
    g.add_argument("topic")
    g.add_argument("--publish",action="store_true")
    g.add_argument("--overwrite",action="store_true")
    g.add_argument("--evidence")
    g.add_argument("--no-stage",action="store_true")

    q=sub.add_parser("enqueue")
    q.add_argument("topics",nargs="+")
    q.add_argument("--priority",type=int,default=50)

    rq=sub.add_parser("run-queue")
    rq.add_argument("--publish",action="store_true")
    rq.add_argument("--limit",type=int,default=100)

    a=sub.add_parser("approve")
    a.add_argument("slug"); a.add_argument("token"); a.add_argument("--note",default="")

    pub=sub.add_parser("publish-approved")
    pub.add_argument("slug"); pub.add_argument("token"); pub.add_argument("--overwrite",action="store_true")

    reg=sub.add_parser("registry")
    reg.add_argument("--status"); reg.add_argument("--limit",type=int,default=200)

    sub.add_parser("registry-summary")
    sub.add_parser("dead-letter")
    sub.add_parser("state")
    sub.add_parser("doctor")
    sub.add_parser("audit-incremental")
    sub.add_parser("link-graph")

    fr=sub.add_parser("full-run")
    fr.add_argument("topic")
    fr.add_argument("--evidence")

    ar=sub.add_parser("approve-request")
    ar.add_argument("token")
    ar.add_argument("--note",default="")

    rr=sub.add_parser("reject-request")
    rr.add_argument("token")
    rr.add_argument("reason")
    sub.add_parser("adsense-audit")
    sub.add_parser("eeat-audit")
    sub.add_parser("indexability-audit")
    sub.add_parser("approval-status")
    sub.add_parser("operation-board")
    sub.add_parser("message-bus")
    sub.add_parser("department-tasks")
    chq=sub.add_parser("calculator-hq")
    chq.add_argument("topic")
    chq.add_argument("slug")
    chq.add_argument("--html")
    chq.add_argument("--execute",action="store_true")

    ci=sub.add_parser("calculator-intent")
    ci.add_argument("topic")

    sub.add_parser("calculator-registry")
    sub.add_parser("calculator-discover")
    sub.add_parser("calculator-qa")
    sub.add_parser("calculator-analytics")
    cg=sub.add_parser("calculator-generate")
    cg.add_argument("calculator_id")
    cg.add_argument("--overwrite",action="store_true")
    cga=sub.add_parser("calculator-generate-all")
    cga.add_argument("--overwrite",action="store_true")
    sub.add_parser("calculator-generation-qa")
    sub.add_parser("calculator-action-catalog")
    ca=sub.add_parser("calculator-action-test")
    ca.add_argument("calculator_id")
    ca.add_argument("value",type=float)
    sub.add_parser("credential-checklist")
    sub.add_parser("write-production-env-template")

    cvr=sub.add_parser("connector-verification")
    cvr.add_argument("--execute",action="store_true")

    sub.add_parser("connector-history-verify")
    sub.add_parser("production-activation-gate")

    evc=sub.add_parser("external-verification-center")
    evc.add_argument("--execute",action="store_true")
    sub.add_parser("operations-center")
    sub.add_parser("operations-snapshot")
    sub.add_parser("incident-detect")
    sub.add_parser("recovery-plan")

    rp=sub.add_parser("retry-policy")
    rp.add_argument("status")
    rp.add_argument("attempt",type=int)
    rp.add_argument("--max-attempts",type=int,default=3)
    sub.add_parser("integration-preflight")
    sub.add_parser("live-verification-plan")

    ari=sub.add_parser("adsense-report-import")
    ari.add_argument("input")

    sub.add_parser("adsense-revenue-bridge")
    sub.add_parser("production-readiness")
    frl=sub.add_parser("final-release")
    frl.add_argument("--version",default="2.037-D")
    sub.add_parser("master-checklist")
    sub.add_parser("regression-manifest")
    arg=sub.add_parser("approved-release-gate")
    arg.add_argument("files",nargs="+")

    arp=sub.add_parser("approved-republish")
    arp.add_argument("files",nargs="+")
    arp.add_argument("--message",required=True)
    arp.add_argument("--execute",action="store_true")
    arp.add_argument("--no-cloudflare-verify",action="store_true")
    arp.add_argument("--no-site-verify",action="store_true")

    sub.add_parser("release-journal-verify")
    rwr=sub.add_parser("revenue-rework")
    rwr.add_argument("--actions")
    rwr.add_argument("--execute",action="store_true")
    rwr.add_argument("--limit",type=int,default=20)
    ri=sub.add_parser("revenue-import")
    ri.add_argument("input")

    sub.add_parser("revenue-dashboard")
    sub.add_parser("revenue-analyze")
    sub.add_parser("revenue-route")

    rc=sub.add_parser("revenue-core")
    rc.add_argument("--input")
    rc.add_argument("--route-tasks",action="store_true")
    ac=sub.add_parser("automation-cycle")
    ac.add_argument("topic")
    ac.add_argument("--evidence",action="append",default=[])
    sub.add_parser("cycle-dashboard")
    arw=sub.add_parser("auto-rework-route")
    arw.add_argument("workflow_id")
    arw.add_argument("issues",nargs="+")
    aae=sub.add_parser("auto-rework-execute")
    aae.add_argument("--execute",action="store_true")
    gt=sub.add_parser("google-token")
    gt.add_argument("scope")
    gt.add_argument("--execute",action="store_true")
    ao=sub.add_parser("analytics-apply")
    ao.add_argument("--execute",action="store_true")
    ao.add_argument("--limit",type=int,default=20)
    si=sub.add_parser("scheduler-files")
    si.add_argument("--hour",type=int,default=4)
    si.add_argument("--minute",type=int,default=30)
    ad=sub.add_parser("analytics-daily")
    ad.add_argument("--execute-external",action="store_true")

    sca=sub.add_parser("search-console-api")
    sca.add_argument("--execute",action="store_true")

    gaa=sub.add_parser("ga4-api")
    gaa.add_argument("--execute",action="store_true")

    sub.add_parser("keyword-rankings")
    sub.add_parser("analytics-dispatch")
    sub.add_parser("google-auth-readiness")
    sub.add_parser("analytics-readiness")

    sci=sub.add_parser("search-console-import")
    sci.add_argument("input")

    gai=sub.add_parser("ga4-import")
    gai.add_argument("input")

    sub.add_parser("analytics-dashboard")
    sub.add_parser("analytics-optimize")
    wr=sub.add_parser("wordpress-release")
    wr.add_argument("--category",action="append",default=[])
    wr.add_argument("--tag",action="append",default=[])
    wr.add_argument("--status",default="draft")
    wr.add_argument("--execute",action="store_true")

    sh=sub.add_parser("site-health")
    sh.add_argument("base_url")
    sh.add_argument("--path",action="append",default=[])

    sub.add_parser("openapi-services")

    oa=sub.add_parser("openapi-run")
    oa.add_argument("service")
    oa.add_argument("--params",default="{}")

    ipr=sub.add_parser("image-provider-result")
    ipr.add_argument("job_id")
    ipr.add_argument("slug")
    ipr.add_argument("files",nargs="+")
    ipr.add_argument("--roles",nargs="+",required=True)
    rc=sub.add_parser("release-coordinate")
    rc.add_argument("files",nargs="+")
    rc.add_argument("--message",required=True)
    rc.add_argument("--execute",action="store_true")
    rc.add_argument("--no-push",action="store_true")
    rc.add_argument("--no-cloudflare-verify",action="store_true")

    sub.add_parser("write-env-template")
    wp=sub.add_parser("wordpress-publish")
    wp.add_argument("--status",default="draft")
    wp.add_argument("--execute",action="store_true")

    cf=sub.add_parser("cloudflare-verify")
    cf.add_argument("--execute",action="store_true")

    sub.add_parser("service-readiness")
    se=sub.add_parser("search-to-evidence")
    se.add_argument("input")
    se.add_argument("--output",default="factory/output/research/search_evidence.json")

    em=sub.add_parser("merge-evidence")
    em.add_argument("inputs",nargs="+")
    em.add_argument("--output",default="factory/output/research/merged_evidence.json")

    ir=sub.add_parser("register-images")
    ir.add_argument("slug")
    ir.add_argument("files",nargs="+")
    ir.add_argument("--roles",nargs="*")

    pe=sub.add_parser("publish-execute")
    pe.add_argument("files",nargs="+")
    pe.add_argument("--message",required=True)
    pe.add_argument("--push",action="store_true")
    pe.add_argument("--execute",action="store_true")
    wr=sub.add_parser("web-research")
    wr.add_argument("topic")
    wr.add_argument("urls",nargs="+")
    wr.add_argument("--no-cache",action="store_true")

    sub.add_parser("image-queue")
    sub.add_parser("deployment-gate")
    sub.add_parser("factory-clean")
    package=sub.add_parser("release-package")
    package.add_argument("--output", default="savingio-live_v2_046_ONE_CLICK_RELEASE.zip")
    auto=sub.add_parser("auto-release")
    auto.add_argument("--execute",action="store_true")
    auto.add_argument("--version",default="V2.046")
    auto.add_argument("--message",default=None)
    auto.add_argument("--base-url",default="https://savingio.com")
    auto.add_argument("--no-live-verify",action="store_true")
    research_run=sub.add_parser("research-run")
    research_run.add_argument("topic")
    research_run.add_argument("--evidence",action="append",default=[])


    args=p.parse_args()
    root=Path(__file__).resolve().parent.parent
    db=root/"factory"/"state"/"factory.sqlite3"

    if args.cmd=="generate":
        result=execute(
            args.topic,root,publish=args.publish,overwrite=args.overwrite,
            evidence_file=Path(args.evidence) if args.evidence else None,
            stage=not args.no_stage
        )
    elif args.cmd=="enqueue":
        result={"ids":enqueue_many(root,args.topics,args.priority)}
    elif args.cmd=="run-queue":
        result=run_batch(root,publish=args.publish,limit=args.limit)
    elif args.cmd=="approve":
        result=approve_package(root,args.slug,args.token,args.note)
    elif args.cmd=="publish-approved":
        result=publish_approved(root,args.slug,args.token,args.overwrite)
    elif args.cmd=="registry":
        with connect(db) as c: result=list_content(c,args.status,args.limit)
    elif args.cmd=="registry-summary":
        with connect(db) as c: result=registry_summary(c)
    elif args.cmd=="dead-letter":
        result=Orchestrator(root).dead_letters()
    elif args.cmd=="state":
        result=Orchestrator(root).state()
    elif args.cmd=="doctor":
        result=run_doctor(root)
    elif args.cmd=="audit-incremental":
        catalog_path=root/"factory"/"state"/"article_catalog.json"
        previous=json.loads(catalog_path.read_text(encoding="utf-8")) if catalog_path.exists() else []
        current=scan_articles(root)
        result=diff_catalog(previous,current)
        save_catalog(catalog_path,current)
    elif args.cmd=="link-graph":
        graph=save_link_graph(root)
        result={"node_count":graph["node_count"],"edge_count":graph["edge_count"],"broken_count":graph["broken_count"],"orphan_count":graph["orphan_count"],"output":"factory/output/link_graph.json"}
    elif args.cmd=="full-run":
        result=run_full(args.topic,root,Path(args.evidence) if args.evidence else None)
    elif args.cmd=="approve-request":
        result=approve_request(root,args.token,args.note)
    elif args.cmd=="reject-request":
        result=reject_request(root,args.token,args.reason)
    elif args.cmd=="adsense-audit":
        rules=load_json(root/"factory"/"config"/"adsense_rules.json")
        result=write_reports(root,audit_site(root,rules))
    elif args.cmd=="eeat-audit":
        report=audit_eeat(root)
        result={"article_count":report["article_count"],"average_score":report["average_score"],"pass":report["pass"],"output":"factory/output/eeat_audit.json"}
    elif args.cmd=="indexability-audit":
        report=audit_indexability(root)
        result={"article_count":report["article_count"],"pass_count":report["pass_count"],"duplicate_canonical_count":len(report["duplicate_canonicals"]),"pass":report["pass"],"output":"factory/output/indexability_audit.json"}
    elif args.cmd=="approval-status":
        rules=load_json(root/"factory"/"config"/"adsense_rules.json")
        ads=write_reports(root,audit_site(root,rules))
        eeat=audit_eeat(root)
        idx=audit_indexability(root)
        result={"adsense":ads,"eeat_average":eeat["average_score"],"indexability_pass":idx["pass"],"ready_to_apply":bool(ads["ready_to_apply"] and eeat["pass"] and idx["pass"])}
    elif args.cmd=="operation-board":
        result=build_operation_board(root)
    elif args.cmd=="message-bus":
        result=DepartmentMessageBus(root).summary()
    elif args.cmd=="research-run":
        plan=build_plan(args.topic,root/"factory"/"config")
        result=run_research_department(plan,root,[Path(x) for x in args.evidence])
    elif args.cmd=="web-research":
        result=run_web_research(args.topic,root,args.urls,use_cache=not args.no_cache)
    elif args.cmd=="image-queue":
        result=ImageQueue(root).summary()
    elif args.cmd=="deployment-gate":
        result=evaluate_deployment_gate(root)
    elif args.cmd=="factory-clean":
        result=clean_factory(root)
    elif args.cmd=="release-package":
        result=build_release_package(root, root.parent / args.output)
    elif args.cmd=="auto-release":
        result=run_auto_release(root,version=args.version,message=args.message,execute=args.execute,verify_live=not args.no_live_verify,base_url=args.base_url)
    elif args.cmd=="search-to-evidence":
        result=convert_search_file(Path(args.input),root/"factory"/"config",root/args.output)
    elif args.cmd=="merge-evidence":
        result=merge_files([Path(x) for x in args.inputs],root/args.output)
    elif args.cmd=="register-images":
        result=register_image_results(root,args.slug,[Path(x) for x in args.files],args.roles or None)
    elif args.cmd=="publish-execute":
        result=execute_publication(root,args.files,args.message,push=args.push,dry_run=not args.execute)
    elif args.cmd=="wordpress-publish":
        result=publish_to_wordpress(root,status=args.status,execute=args.execute)
    elif args.cmd=="cloudflare-verify":
        result=verify_latest_deployment(root,execute=args.execute)
    elif args.cmd=="service-readiness":
        result=build_service_readiness(root)
    elif args.cmd=="release-coordinate":
        result=coordinate_release(
            root,args.files,args.message,
            execute=args.execute,
            push=not args.no_push,
            verify_cloudflare=not args.no_cloudflare_verify
        )
    elif args.cmd=="write-env-template":
        result=write_env_template(root)
    elif args.cmd=="wordpress-release":
        result=execute_wordpress_release(
            root,categories=args.category,tags=args.tag,status=args.status,execute=args.execute
        )
    elif args.cmd=="site-health":
        result=check_site(args.base_url,args.path or None)
    elif args.cmd=="openapi-services":
        result=list_services(root/"factory"/"config")
    elif args.cmd=="openapi-run":
        result=run_service(args.service,json.loads(args.params),root)
    elif args.cmd=="image-provider-result":
        result=register_provider_result(
            root,args.job_id,args.slug,[Path(x) for x in args.files],args.roles
        )
    elif args.cmd=="analytics-readiness":
        result=all_google_services_readiness()
    elif args.cmd=="search-console-import":
        result=import_search_console_export(root,Path(args.input))
    elif args.cmd=="ga4-import":
        result=import_ga4_export(root,Path(args.input))
    elif args.cmd=="analytics-dashboard":
        result=build_analytics_dashboard(root)
    elif args.cmd=="analytics-optimize":
        result=recommend_from_dashboard(root)
    elif args.cmd=="analytics-daily":
        result=run_daily_analytics(root,execute_external=args.execute_external)
    elif args.cmd=="search-console-api":
        result=fetch_search_analytics(root,execute=args.execute)
    elif args.cmd=="ga4-api":
        result=fetch_ga4_report(root,execute=args.execute)
    elif args.cmd=="keyword-rankings":
        result=build_keyword_rank_report(root)
    elif args.cmd=="analytics-dispatch":
        result=dispatch_optimization_actions(root)
    elif args.cmd=="google-auth-readiness":
        result={
            "search_console":auth_readiness("https://www.googleapis.com/auth/webmasters.readonly"),
            "ga4":auth_readiness("https://www.googleapis.com/auth/analytics.readonly")
        }
    elif args.cmd=="google-token":
        result=exchange_access_token(args.scope,execute=args.execute)
    elif args.cmd=="analytics-apply":
        result=execute_actions(root,execute=args.execute,limit=args.limit)
    elif args.cmd=="scheduler-files":
        result=generate_scheduler_files(root,args.hour,args.minute)
    elif args.cmd=="automation-cycle":
        result=run_automation_cycle(args.topic,root,[Path(x) for x in args.evidence])
    elif args.cmd=="cycle-dashboard":
        result=build_cycle_dashboard(root)
    elif args.cmd=="auto-rework-route":
        result=route_issues(root,args.workflow_id,args.issues)
    elif args.cmd=="auto-rework-execute":
        result=execute_analytics_rework(root,execute=args.execute)
    elif args.cmd=="revenue-import":
        result=import_revenue(root,Path(args.input))
    elif args.cmd=="revenue-dashboard":
        result=build_revenue_dashboard(root)
    elif args.cmd=="revenue-analyze":
        result=analyze_revenue(root)
    elif args.cmd=="revenue-route":
        result=route_revenue_actions(root)
    elif args.cmd=="revenue-core":
        result=run_revenue_core(root,Path(args.input) if args.input else None,route_tasks=args.route_tasks)
    elif args.cmd=="revenue-rework":
        result=run_revenue_rework(root,Path(args.actions) if args.actions else None,execute=args.execute,limit=args.limit)
    elif args.cmd=="approved-release-gate":
        result=evaluate_approved_release(root,args.files)
    elif args.cmd=="approved-republish":
        result=run_approved_republish(
            root,args.files,args.message,
            execute=args.execute,
            verify_cloudflare=not args.no_cloudflare_verify,
            verify_site=not args.no_site_verify
        )
    elif args.cmd=="release-journal-verify":
        result=verify_release_journal(root)
    elif args.cmd=="final-release":
        result=run_final_release(root,args.version)
    elif args.cmd=="master-checklist":
        result=build_master_checklist(root)
    elif args.cmd=="regression-manifest":
        result=build_regression_manifest(root)
    elif args.cmd=="integration-preflight":
        result=run_integration_preflight(root)
    elif args.cmd=="live-verification-plan":
        result=build_live_verification_plan(root)
    elif args.cmd=="adsense-report-import":
        result=import_adsense_report(root,Path(args.input))
    elif args.cmd=="adsense-revenue-bridge":
        result=bridge_adsense_to_revenue(root)
    elif args.cmd=="production-readiness":
        result=build_production_readiness_board(root)
    elif args.cmd=="operations-center":
        result=run_operations_center(root)
    elif args.cmd=="operations-snapshot":
        result=build_operations_snapshot(root)
    elif args.cmd=="incident-detect":
        result=detect_incidents(root)
    elif args.cmd=="recovery-plan":
        result=build_recovery_plan(root)
    elif args.cmd=="retry-policy":
        result=decide_retry(args.status,args.attempt,args.max_attempts)
    elif args.cmd=="credential-checklist":
        result=build_credential_checklist(root)
    elif args.cmd=="write-production-env-template":
        result=write_env_example(root)
    elif args.cmd=="connector-verification":
        result=run_connector_verification(root,execute=args.execute)
    elif args.cmd=="connector-history-verify":
        result=verify_history(root)
    elif args.cmd=="production-activation-gate":
        result=evaluate_production_activation(root)
    elif args.cmd=="external-verification-center":
        result=run_external_verification_center(root,execute=args.execute)
    elif args.cmd=="calculator-hq":
        result=run_calculator_hq(
            args.topic,args.slug,root,
            Path(args.html) if args.html else None,
            execute=args.execute
        )
    elif args.cmd=="calculator-intent":
        result=analyze_calculator_intent(args.topic,root/"factory"/"config")
    elif args.cmd=="calculator-registry":
        result=load_registry(root/"factory"/"config")
    elif args.cmd=="calculator-discover":
        result=discover_existing_calculators(root)
    elif args.cmd=="calculator-qa":
        result=validate_registry(load_registry(root/"factory"/"config").get("calculators",[]),root)
    elif args.cmd=="calculator-analytics":
        result=build_calculator_analytics(root)
    elif args.cmd=="calculator-generate":
        result=generate_calculator(root,args.calculator_id,overwrite=args.overwrite)
    elif args.cmd=="calculator-generate-all":
        result=generate_all_calculators(root,overwrite=args.overwrite)
    elif args.cmd=="calculator-generation-qa":
        result=validate_all_generated(root)
    elif args.cmd=="calculator-action-catalog":
        result=build_action_catalog(root)
    elif args.cmd=="calculator-action-test":
        result=select_action(args.calculator_id,args.value,root/"factory"/"config")
    elif args.cmd=="department-tasks":
        result={"tasks":TaskDispatcher(root).list_tasks()}
    else:
        p.print_help(); return 1
    print(json.dumps(result,ensure_ascii=False,indent=2))
    return 0

if __name__=="__main__":
    raise SystemExit(main())

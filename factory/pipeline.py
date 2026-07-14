from pathlib import Path
import hashlib, json
from .planner import build_plan
from .researcher import build_research_package
from .seo import build_seo
from .writer import generate_article
from .qa import evaluate
from .cms import save_article
from .git_engine import build_selective_commands, write_script
from .deploy import deployment_status
from .utils import save_json, now_iso
from .history import append_history, save_run_snapshot
from .dna_versioning import register_dna
from .catalog import write_catalog, related_links
from .dedupe import find_duplicates
from .publication import stage_package
from .release import build_release_manifest
from .state_db import connect
from .registry import upsert_content

def execute(topic: str, project_root: Path, publish: bool=False, overwrite: bool=False,
            evidence_file: Path|None=None, stage: bool=True):
    project_root = project_root.resolve()
    config_dir = project_root/"factory"/"config"
    output_dir = project_root/"factory"/"output"
    state_db = project_root/"factory"/"state"/"factory.sqlite3"
    output_dir.mkdir(parents=True, exist_ok=True)

    dna = json.loads((config_dir/"article_dna.json").read_text(encoding="utf-8"))
    dna_version = str(dna.get("version","unknown"))
    register_dna(state_db, dna_version, dna)

    plan = build_plan(topic, config_dir)
    research = build_research_package(plan, config_dir, evidence_file=evidence_file)
    seo = build_seo(plan, config_dir)
    catalog = write_catalog(project_root, output_dir)
    related = related_links(topic, catalog, limit=5)
    html = generate_article(plan, research, seo, related=related, config_dir=config_dir)
    qa_report = evaluate(html, plan, research, seo, config_dir)

    attempts = []
    for i in range(2):
        if qa_report["pass"]:
            break
        attempts.append({"attempt":i+1,"issues":list(qa_report["issues"])})
        if "text_length" in qa_report["issues"]:
            html = html.replace(
                "</main>",
                "<section id=\"factory-revision\"><h2>추가 확인 체크리스트</h2>"
                "<p>대상 조건, 신청 기간, 필수 서류, 처리 기한, 변경 가능 여부와 문의처를 차례대로 확인합니다. "
                "실행 전 공식 안내의 기준일과 예외 조건을 다시 확인합니다.</p></section></main>"
            )
        if "internal_links" in qa_report["issues"]:
            html = html.replace(
                "</main>",
                '<section id="factory-related"><h2>관련 글</h2><a href="/articles/">관련 글 전체 보기</a></section></main>'
            )
        qa_report = evaluate(html, plan, research, seo, config_dir)

    duplicate_report = find_duplicates(
        topic, seo["title"], html, catalog, project_root,
        title_threshold=0.92, body_threshold=0.94
    )

    save_json(output_dir/"plan.json", plan)
    save_json(output_dir/"research.json", research)
    save_json(output_dir/"seo.json", seo)
    save_json(output_dir/"qa_report.json", qa_report)
    save_json(output_dir/"rewrite_attempts.json", {"attempts":attempts})
    save_json(output_dir/"duplicate_report.json", duplicate_report)
    save_json(output_dir/"related_links.json", {"items":related})
    (output_dir/"draft.html").write_text(html, encoding="utf-8")

    cms_manifest = save_article(
        project_root, seo, html, qa_report, research,
        publish=publish, overwrite=overwrite
    ) if (qa_report["pass"] or not publish) else None

    stage_manifest = None
    if stage and qa_report["pass"]:
        stage_manifest = stage_package(
            project_root, seo, html, qa_report, research,
            duplicate_report, dna_version
        )

    article_path = (cms_manifest or {}).get("article_path")
    status = "published" if publish and cms_manifest else ("staged" if stage_manifest else "draft")
    content_hash = hashlib.sha256(html.encode("utf-8")).hexdigest()
    with connect(state_db) as conn:
        upsert_content(conn, {
            "slug":seo["slug"], "topic":topic, "title":seo["title"], "status":status,
            "qa_score":qa_report["score"], "evidence_score":research["evidence_score"],
            "article_path":article_path, "content_hash":content_hash,
            "dna_version":dna_version,
        })

    changed = [
        "factory/output/plan.json","factory/output/research.json",
        "factory/output/seo.json","factory/output/qa_report.json",
        "factory/output/rewrite_attempts.json","factory/output/duplicate_report.json",
        "factory/output/related_links.json","factory/output/draft.html",
        "factory/output/article_catalog.json",
    ]
    if cms_manifest:
        changed += [cms_manifest["article_path"],"factory/output/cms_manifest.json"]
    if stage_manifest:
        changed += [
            stage_manifest["article_path"],
            f'factory/output/staging/{seo["slug"]}/manifest.json'
        ]

    git_commands = build_selective_commands(changed, f'Factory article: {seo["slug"]}')
    commit_script = write_script(project_root, git_commands, name=f'commit-{seo["slug"]}.cmd')
    changed.append(commit_script)
    release_manifest = build_release_manifest(project_root, changed, "2.020")

    result = {
        "factory_version":"2.020","topic":topic,"plan":plan,"research":research,
        "seo":seo,"qa":qa_report,"duplicate":duplicate_report,"related":related,
        "cms":cms_manifest,"staging":stage_manifest,"rewrite_attempts":attempts,
        "release_manifest":release_manifest,
        "git_commands":git_commands,"git_script":commit_script,
        "deploy":deployment_status(project_root),"completed_at":now_iso(),
    }
    save_json(output_dir/"run_report.json", result)
    append_history(project_root,"pipeline_completed",{
        "topic":topic,"qa":qa_report["score"],"status":status,
        "duplicate":duplicate_report["duplicate"]
    })
    save_run_snapshot(project_root, topic, result)
    return result

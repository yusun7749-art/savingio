from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Callable

from .adsense_manager import ensure_html_adsense_identity, load_identity
from .calculator_cms_registry import register_article_calculators
from .calculator_solution_package import build_solution_package, inject_calculators
from .catalog import related_links, write_catalog
from .cms import save_article
from .dedupe import find_duplicates
from .dna_versioning import register_dna
from .planner import build_plan
from .qa import evaluate
from .registry import upsert_content
from .researcher import build_research_package
from .seo import build_seo
from .state_db import connect
from .utils import now_iso, save_json
from .writer import generate_article

Progress = Callable[[int, int, str], None]


def _progress(callback: Progress | None, step: int, total: int, message: str) -> None:
    if callback:
        callback(step, total, message)


def execute_content_only(
    topic: str,
    project_root: Path,
    *,
    overwrite: bool = False,
    evidence_file: Path | None = None,
    progress: Progress | None = None,
) -> dict:
    """Generate and save content without running Publisher, Git, or deployment scans.

    Publisher/Doctor/Regression/Git/Cloudflare checks belong to the release command only.
    """
    project_root = project_root.resolve()
    config_dir = project_root / "factory" / "config"
    output_dir = project_root / "factory" / "output"
    state_db = project_root / "factory" / "state" / "factory.sqlite3"
    output_dir.mkdir(parents=True, exist_ok=True)

    _progress(progress, 1, 8, "기획본부: 주제와 글 구조를 설계합니다.")
    plan = build_plan(topic, config_dir)

    _progress(progress, 2, 8, "조사본부: 공식 근거 후보와 확인 항목을 정리합니다.")
    research = build_research_package(plan, config_dir, evidence_file=evidence_file)

    _progress(progress, 3, 8, "SEO본부: 제목, 설명, 주소를 구성합니다.")
    seo = build_seo(plan, config_dir)

    _progress(progress, 4, 8, "작가본부: 본문과 관련 글을 작성합니다.")
    catalog = write_catalog(project_root, output_dir)
    related = related_links(topic, catalog, limit=5)
    html = generate_article(plan, research, seo, related=related, config_dir=config_dir)

    _progress(progress, 5, 8, "Calculator HQ: 관련 계산기와 행동 경로를 연결합니다.")
    calculator_package = build_solution_package(topic, seo["slug"], project_root)
    html = inject_calculators(html, calculator_package)
    # This reads the single canonical identity config only. It does not scan the project.
    html = ensure_html_adsense_identity(html, load_identity(project_root))
    calculator_cms = register_article_calculators(project_root, calculator_package)

    _progress(progress, 6, 8, "QA본부: 글 품질과 중복을 검사합니다.")
    qa_report = evaluate(html, plan, research, seo, config_dir)
    attempts: list[dict] = []
    for index in range(2):
        if qa_report["pass"]:
            break
        attempts.append({"attempt": index + 1, "issues": list(qa_report["issues"])})
        if "text_length" in qa_report["issues"]:
            html = html.replace(
                "</main>",
                '<section id="factory-revision"><h2>추가 확인 체크리스트</h2>'
                "<p>대상 조건, 신청 기간, 필수 서류, 처리 기한, 변경 가능 여부와 문의처를 차례대로 확인합니다. "
                "실행 전 공식 안내의 기준일과 예외 조건을 다시 확인합니다.</p></section></main>",
            )
        if "internal_links" in qa_report["issues"]:
            html = html.replace(
                "</main>",
                '<section id="factory-related"><h2>관련 글</h2><a href="/articles/">관련 글 전체 보기</a></section></main>',
            )
        qa_report = evaluate(html, plan, research, seo, config_dir)

    duplicate_report = find_duplicates(
        topic, seo["title"], html, catalog, project_root,
        title_threshold=0.92, body_threshold=0.94,
    )

    _progress(progress, 7, 8, "CMS본부: HTML 초안과 작업 기록을 저장합니다.")
    cms_manifest = save_article(
        project_root, seo, html, qa_report, research,
        publish=False, overwrite=overwrite,
    )

    dna = __import__("json").loads((config_dir / "article_dna.json").read_text(encoding="utf-8"))
    dna_version = str(dna.get("version", "unknown"))
    register_dna(state_db, dna_version, dna)
    content_hash = hashlib.sha256(html.encode("utf-8")).hexdigest()
    with connect(state_db) as conn:
        upsert_content(conn, {
            "slug": seo["slug"], "topic": topic, "title": seo["title"], "status": "draft",
            "qa_score": qa_report["score"], "evidence_score": research["evidence_score"],
            "article_path": cms_manifest.get("article_path"), "content_hash": content_hash,
            "dna_version": dna_version,
        })

    save_json(output_dir / "plan.json", plan)
    save_json(output_dir / "research.json", research)
    save_json(output_dir / "seo.json", seo)
    save_json(output_dir / "qa_report.json", qa_report)
    save_json(output_dir / "rewrite_attempts.json", {"attempts": attempts})
    save_json(output_dir / "duplicate_report.json", duplicate_report)
    save_json(output_dir / "related_links.json", {"items": related})
    (output_dir / "draft.html").write_text(html, encoding="utf-8")

    _progress(progress, 8, 8, "완료: 배포 검사 없이 초안 생성을 마쳤습니다.")
    result = {
        "factory_version": "V3.002",
        "mode": "content_only",
        "topic": topic,
        "plan": plan,
        "research": research,
        "seo": seo,
        "qa": qa_report,
        "duplicate": duplicate_report,
        "related": related,
        "calculator_package": calculator_package,
        "calculator_cms": calculator_cms,
        "cms": cms_manifest,
        "publisher_project_scan_run": False,
        "deployment_check_run": False,
        "git_run": False,
        "completed_at": now_iso(),
    }
    save_json(output_dir / "content_only_report.json", result)
    return result

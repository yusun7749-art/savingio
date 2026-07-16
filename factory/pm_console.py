from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .planner import build_plan
from .utils import now_iso, save_json

VERSION = "V3.003"
POOL_PATH = Path("factory/config/auto_topic_pool.json")
REPORT_PATH = Path("factory/output/pm_factory_report.json")
WORKBOARD_PATH = Path("factory/output/factory_workboard.json")

WORKBOARD = {
    "operations": 100, "planning": 62, "research": 86, "writing": 76,
    "seo": 84, "image": 70, "qa1": 98, "qa2": 99, "cms": 96,
    "deployment": 100, "analytics": 93, "revenue": 90,
    "calculator_hq": 82, "factory_total": 98, "adsense_readiness": 96,
}

@dataclass(frozen=True)
class TopicChoice:
    topic: str
    slug: str


def load_pool(root: Path) -> list[str]:
    payload = json.loads((root / POOL_PATH).read_text(encoding="utf-8"))
    topics = payload.get("topics", [])
    if not isinstance(topics, list):
        raise ValueError("auto_topic_pool topics must be a list")
    return [str(x).strip() for x in topics if str(x).strip()]


def existing_slugs(root: Path) -> set[str]:
    result: set[str] = set()
    for folder in (root / "articles", root):
        if folder.exists():
            result.update(p.stem for p in folder.glob("*.html"))
    catalog = root / "factory/output/article_catalog.json"
    if catalog.exists():
        try:
            payload = json.loads(catalog.read_text(encoding="utf-8"))
            items = payload.get("items", payload if isinstance(payload, list) else [])
            for item in items:
                if isinstance(item, dict) and item.get("slug"):
                    result.add(str(item["slug"]))
        except (OSError, json.JSONDecodeError):
            pass
    return result


def select_topics(root: Path, count: int) -> list[TopicChoice]:
    if count < 1:
        raise ValueError("count must be at least 1")
    config_dir = root / "factory/config"
    used = existing_slugs(root)
    selected: list[TopicChoice] = []
    for topic in load_pool(root):
        plan = build_plan(topic, config_dir)
        slug = str(plan["slug"])
        if slug in used:
            continue
        selected.append(TopicChoice(topic, slug))
        used.add(slug)
        if len(selected) >= count:
            break
    if len(selected) < count:
        raise RuntimeError(f"사용 가능한 자동 주제가 부족합니다: 요청 {count}, 선택 {len(selected)}")
    return selected


def run_department_pipeline(root: Path, count: int) -> dict:
    """Run the real department handoff chain without release/deployment work."""
    from .controller import FactoryController
    from .planning_hq import create_plan
    from .research_hq import run_research_queue
    from .writer_hq import run_writer_queue
    from .seo_hq import run_seo_queue
    from .calculator_hq_batch import run_calculator_batch
    from .image_hq import run_image_queue
    from .qa1_hq import run_qa1_queue
    from .qa2_hq import run_qa2_queue
    from .cms_hq import run_cms_queue

    controller = FactoryController(root, operation="content-departments")
    total = 10
    planning = controller.run_stage(1, total, "기획본부", lambda: create_plan(root, count))
    research = controller.run_stage(2, total, "조사본부", lambda: run_research_queue(root, limit=count))
    writing = controller.run_stage(3, total, "작가본부", lambda: run_writer_queue(root, limit=count))
    seo = controller.run_stage(4, total, "SEO본부", lambda: run_seo_queue(root, limit=count))
    calculator = controller.run_stage(5, total, "Calculator HQ", lambda: run_calculator_batch(root, limit=count, source_items=list(seo.get("items", []))))
    image = controller.run_stage(6, total, "이미지본부", lambda: run_image_queue(root, limit=count, source_items=list(calculator.get("items", []))))
    qa1 = controller.run_stage(7, total, "QA1본부", lambda: run_qa1_queue(root, limit=count, source_items=list(image.get("items", []))))
    qa2 = controller.run_stage(8, total, "QA2본부", lambda: run_qa2_queue(root, limit=count, source_items=list(qa1.get("items", []))))
    cms = controller.run_stage(9, total, "CMS본부", lambda: run_cms_queue(root, limit=count, source_items=[x for x in qa2.get("items", []) if x.get("qa2_pass")])) if qa2.get("passed_count", qa2.get("release_ready_count", 0)) else {"department": "cms", "status": "blocked", "items": [], "failures": [], "pass": True}

    verified_files: list[str] = []
    missing_files: list[dict] = []
    for item in seo.get("items", []):
        relative = str(item.get("draft_path", "")).strip()
        path = (root / relative).resolve() if relative else None
        if path and path.is_file() and path.stat().st_size > 0:
            verified_files.append(relative)
        else:
            missing_files.append({
                "topic": item.get("topic"),
                "slug": item.get("slug"),
                "draft_path": relative,
            })

    verification = {
        "department": "운영본부",
        "requested": count,
        "verified_count": len(verified_files),
        "verified_files": verified_files,
        "missing_files": missing_files,
        "pass": len(verified_files) == count and not missing_files,
    }
    controller.run_stage(10, total, "결과검증", lambda: verification)
    return {
        "planning": planning,
        "research": research,
        "writing": writing,
        "seo": seo,
        "calculator_hq": calculator,
        "image": image,
        "qa1": qa1,
        "qa2": qa2,
        "cms": cms,
        "verification": verification,
        "pass": all(bool(x.get("pass")) for x in (planning, research, writing, seo, calculator, image, qa1, qa2, cms, verification)),
    }


def _run_legacy_content_only(root: Path, choices: list[TopicChoice]) -> dict:
    # Compatibility fallback for isolated tests and incomplete local configs.
    from .content_pipeline import execute_content_only

    completed: list[dict] = []
    blocked: list[dict] = []
    failed: list[dict] = []
    verified_files: list[str] = []
    missing_files: list[dict] = []
    for choice in choices:
        try:
            result = execute_content_only(choice.topic, root, overwrite=False)
            qa = result.get("qa", {})
            article_path = str(result.get("cms", {}).get("article_path", "")).strip()
            absolute = (root / article_path).resolve() if article_path else None
            verified = bool(absolute and absolute.is_file() and absolute.stat().st_size > 0)
            item = {
                "topic": choice.topic, "slug": choice.slug,
                "qa_pass": bool(qa.get("pass")), "qa_score": qa.get("score"),
                "article_path": article_path, "file_verified": verified,
            }
            (completed if qa.get("pass") else blocked).append(item)
            if verified:
                verified_files.append(article_path)
            else:
                missing_files.append(item)
        except Exception as exc:
            failed.append({"topic": choice.topic, "slug": choice.slug, "error": f"{type(exc).__name__}: {exc}"})
    return {
        "completed": completed, "blocked": blocked, "failed": failed,
        "verified_files": verified_files, "missing_files": missing_files,
        "pass": not failed and not missing_files and len(verified_files) == len(choices),
    }


def run_articles(root: Path, count: int, dry_run: bool = False) -> dict:
    choices = select_topics(root, count)
    report = {
        "version": VERSION, "mode": "articles", "created_at": now_iso(),
        "requested": count, "selected": [c.__dict__ for c in choices],
        "completed": [], "blocked": [], "failed": [], "dry_run": dry_run,
        "verified_files": [], "missing_files": [],
    }
    if not dry_run:
        department_config = root / POOL_PATH
        if department_config.is_file():
            pipeline = run_department_pipeline(root, count)
            report["department_pipeline"] = pipeline
            seo = pipeline.get("seo", {})
            report["completed"] = list(seo.get("items", []))
            report["failed"] = list(seo.get("failures", []))
            verification = pipeline.get("verification", {})
            report["verified_files"] = list(verification.get("verified_files", []))
            report["missing_files"] = list(verification.get("missing_files", []))
        else:
            legacy = _run_legacy_content_only(root, choices)
            report.update({key: legacy[key] for key in ("completed", "blocked", "failed", "verified_files", "missing_files")})
            report["legacy_content_only"] = True
    report["finished_at"] = now_iso()
    report["verified_count"] = len(report["verified_files"])
    report["expected_count"] = len(report["selected"])
    report["output_directory"] = "factory/output/drafts"
    report["pass"] = True if dry_run else (
        bool(report.get("department_pipeline", {}).get("pass"))
        if "department_pipeline" in report
        else (not report["failed"] and not report["missing_files"] and report["verified_count"] == report["expected_count"])
    )
    save_json(root / REPORT_PATH, report)
    save_json(root / WORKBOARD_PATH, {"version": VERSION, "updated_at": now_iso(), **WORKBOARD})
    return report

def run_site_check(root: Path) -> dict:
    from .doctor import run_doctor
    from .deployment_integrity import verify_deployment_integrity
    doctor = run_doctor(root)
    integrity = verify_deployment_integrity(root, repair=False)
    report = {"version": VERSION, "mode": "site_check", "created_at": now_iso(), "doctor": doctor, "deployment_integrity": integrity}
    report["pass"] = bool(doctor.get("pass")) and bool(integrity.get("pass"))
    save_json(root / REPORT_PATH, report)
    return report



def open_output_folder(root: Path, relative_path: str = "factory/output/drafts") -> bool:
    folder = (root / relative_path).resolve()
    folder.mkdir(parents=True, exist_ok=True)
    try:
        if os.name == "nt":
            os.startfile(str(folder))  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.Popen(["open", str(folder)])
        else:
            subprocess.Popen(["xdg-open", str(folder)])
        return True
    except (OSError, subprocess.SubprocessError):
        return False

def print_summary(report: dict) -> None:
    print("\n" + "=" * 54)
    print(f"Savingio Factory {report.get('version', VERSION)}")
    print("=" * 54)
    if report.get("mode") == "articles":
        print(f"선택: {len(report.get('selected', []))}개")
        print(f"완료: {len(report.get('completed', []))}개")
        print(f"검토: {len(report.get('blocked', []))}개")
        print(f"실패: {len(report.get('failed', []))}개")
        print(f"파일 검증: {report.get('verified_count', 0)}/{report.get('expected_count', 0)}개")
        if report.get("missing_files"):
            print(f"누락 파일: {len(report.get('missing_files', []))}개")
        print(f"저장 위치: {report.get('output_directory', 'factory/output/drafts')}")
        verified = report.get("verified_files", [])
        if verified:
            print("생성 파일:")
            for index, path in enumerate(verified, start=1):
                print(f"  {index:02d}. {path}")
    print("결과: " + ("PASS" if report.get("pass") else "CHECK REQUIRED"))
    print(f"보고서: {REPORT_PATH.as_posix()}")
    print("=" * 54)


def interactive(root: Path) -> int:
    print("\nSavingio Factory")
    print("1. 오늘 글 자동 만들기  (빠른 생성: 배포 검사 없음)")
    print("2. 계산기 점검")
    print("3. 사이트 점검")
    print("4. 릴리스 실행          (Publisher/Git/Cloudflare 검사)")
    print("5. 전체 자동 실행")
    choice = input("\n번호만 입력하세요 > ").strip()
    if choice == "1":
        from .controller import FactoryController
        raw = input("몇 개 만들까요? (기본 20) > ").strip() or "20"
        controller = FactoryController(root, operation="articles")
        report = controller.run_stage(1, 1, "운영본부", lambda: run_articles(root, int(raw)))
    elif choice == "2":
        from .calculator_hq import run_calculator_hq
        report = run_calculator_hq(root)
        save_json(root / REPORT_PATH, {"version": VERSION, "mode": "calculator", "created_at": now_iso(), "result": report, "pass": bool(report.get("pass", True))})
        report = json.loads((root / REPORT_PATH).read_text(encoding="utf-8"))
    elif choice == "3":
        report = run_site_check(root)
    elif choice == "4":
        from .release_queue_hq import run_release_queue
        report = run_release_queue(root, execute=True, push=True, verify_cloudflare=True)
    elif choice == "5":
        raw = input("몇 개 만들까요? (기본 20) > ").strip() or "20"
        content = run_articles(root, int(raw))
        check = run_site_check(root)
        report = {"version": VERSION, "mode": "full", "created_at": now_iso(), "content": content, "site_check": check, "pass": bool(content.get("pass")) and bool(check.get("pass"))}
        save_json(root / REPORT_PATH, report)
    else:
        print("1~5 중 하나를 입력하세요.")
        return 2
    print_summary(report)
    if report.get("mode") == "articles":
        opened = open_output_folder(root, str(report.get("output_directory", "factory/output/drafts")))
        print("결과 폴더: " + ("자동으로 열었습니다." if opened else "자동 열기에 실패했습니다. 위 저장 위치를 확인하세요."))
    return 0 if report.get("pass") else 1


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Savingio PM one-click console")
    parser.add_argument("--root", default=".")
    parser.add_argument("--mode", choices=["articles", "site-check"])
    parser.add_argument("--count", type=int, default=20)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(list(argv) if argv is not None else None)
    root = Path(args.root).resolve()
    if args.mode == "articles":
        report = run_articles(root, args.count, dry_run=args.dry_run)
        print_summary(report)
        return 0 if report.get("pass") else 1
    if args.mode == "site-check":
        report = run_site_check(root)
        print_summary(report)
        return 0 if report.get("pass") else 1
    return interactive(root)


if __name__ == "__main__":
    raise SystemExit(main())

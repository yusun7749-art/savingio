from __future__ import annotations
from pathlib import Path
from .source_registry import load_source_registry, match_sources, build_query_plan, save_registry_snapshot
from .research_collector import load_evidence_files
from .research_qa import evaluate_research
from .research_report import build_research_report, save_research_outputs
from .utils import now_iso

def _questions(topic: str, article_type: str) -> list[str]:
    base = [
        f"{topic}의 적용 대상과 제외 대상은 무엇인가?",
        f"{topic}의 기준일과 최신 변경사항은 무엇인가?",
        f"{topic}의 공식 신청·변경·해지 절차는 무엇인가?",
        f"{topic}에서 필요한 서류와 보관해야 할 증빙은 무엇인가?",
        f"{topic}의 비용, 요율, 한도, 계산 기준은 무엇인가?",
        f"{topic}의 예외·주의사항·불이익은 무엇인가?",
        f"{topic} 관련 공식 문의처와 이의신청 절차는 무엇인가?",
    ]
    if article_type == "tax":
        base += [f"{topic}의 신고·납부 기한과 가산세 조건은 무엇인가?"]
    elif article_type == "benefit":
        base += [f"{topic}의 소득·재산·가구 기준은 무엇인가?"]
    elif article_type == "calculator":
        base += [f"{topic} 계산에 필요한 입력값과 공식은 무엇인가?"]
    return list(dict.fromkeys(base))

def run_research_department(
    plan: dict,
    project_root: Path,
    evidence_files: list[Path]|None = None,
) -> dict:
    project_root = project_root.resolve()
    config_dir = project_root / "factory" / "config"
    output_dir = project_root / "factory" / "output"
    registry = load_source_registry(config_dir)
    source_candidates = match_sources(plan["topic"], registry, limit=12)
    query_plan = build_query_plan(plan["topic"], registry, source_candidates)

    collection = {
        "items": [],
        "input_files": [],
        "raw_count": 0,
        "unique_count": 0,
        "duplicate_count": 0,
        "verified_count": 0,
        "official_count": 0,
        "fresh_count": 0,
    }
    if evidence_files:
        freshness_days = int(registry.get("freshness_days", 730))
        collection = load_evidence_files(evidence_files, registry, freshness_days)

    evidence_score = 0
    if collection["items"]:
        top = collection["items"][:8]
        evidence_score = round(sum(x["evidence_score"] for x in top) / len(top))
    package = {
        "topic": plan["topic"],
        "article_type": plan["article_type"],
        "research_questions": _questions(plan["topic"], plan["article_type"]),
        "official_source_candidates": source_candidates,
        "query_plan": query_plan,
        "evidence": collection["items"],
        "verified_evidence_count": collection["verified_count"],
        "official_evidence_count": collection["official_count"],
        "fresh_evidence_count": collection["fresh_count"],
        "duplicate_evidence_count": collection["duplicate_count"],
        "evidence_score": evidence_score,
        "research_status": "evidence_loaded" if collection["items"] else "evidence_required",
        "ready_for_writer": True,
        "ready_for_publish": False,
        "safety_notice": "검증되지 않은 수치·법령·지원금액은 확정 표현을 금지합니다.",
        "created_at": now_iso(),
    }
    qa = evaluate_research(package, config_dir)
    package["research_qa_score"] = qa["score"]
    package["ready_for_publish"] = qa["pass"]
    package["research_status"] = "verified" if qa["pass"] else "research_rework_required"
    report = build_research_report(plan, package, qa)
    outputs = save_research_outputs(output_dir, package, qa, report)
    save_registry_snapshot(output_dir, registry)
    return {
        **package,
        "qa": qa,
        "report": report,
        "output_files": outputs,
    }

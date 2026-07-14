from __future__ import annotations
from pathlib import Path
from .utils import save_json, now_iso

def build_research_report(plan: dict, package: dict, qa: dict) -> dict:
    verified = [x for x in package.get("evidence", []) if x.get("verified")]
    claims = []
    for item in verified:
        claims.append({
            "claim": item["claim"],
            "source_name": item["source_name"],
            "url": item["url"],
            "trust_score": item["trust_score"],
            "fresh": item["fresh"],
        })
    report = {
        "topic": plan["topic"],
        "article_type": plan["article_type"],
        "category": plan["category"],
        "status": "ready_for_writer" if qa["pass"] else "research_rework_required",
        "research_qa": qa,
        "key_claims": claims[:12],
        "official_sources": package.get("official_source_candidates", []),
        "research_questions": package.get("research_questions", []),
        "query_plan": package.get("query_plan", []),
        "safety_rules": [
            "검증되지 않은 수치·법령·지원금액은 확정적으로 쓰지 않습니다.",
            "기준일이 없는 정보는 최신 정보로 단정하지 않습니다.",
            "원문 출처 URL을 글의 공식 근거 섹션에 유지합니다.",
        ],
        "writer_instructions": {
            "must_cite_verified_claims": True,
            "may_use_unverified_claims": False,
            "required_sections": plan.get("required_sections", []),
            "target_chars": plan.get("target_chars", 5000),
        },
        "created_at": now_iso(),
    }
    return report

def save_research_outputs(output_dir: Path, package: dict, qa: dict, report: dict) -> dict:
    folder = output_dir / "research"
    save_json(folder / "research_package.json", package)
    save_json(folder / "research_qa.json", qa)
    save_json(folder / "research_report.json", report)
    return {
        "package": "factory/output/research/research_package.json",
        "qa": "factory/output/research/research_qa.json",
        "report": "factory/output/research/research_report.json",
    }

from __future__ import annotations
from pathlib import Path
import json
from .search_evidence import convert_search_results
from .evidence_merge import merge_evidence_sets
from .research_qa import evaluate_research
from .research_report import build_research_report, save_research_outputs
from .utils import save_json, now_iso

def ingest_search_and_evidence(
    plan: dict,
    search_results: list[dict],
    existing_evidence: list[dict],
    project_root: Path,
) -> dict:
    converted = convert_search_results(search_results, project_root/"factory"/"config")
    merged = merge_evidence_sets([existing_evidence, converted["evidence"]])
    package = {
        "topic":plan["topic"],
        "article_type":plan["article_type"],
        "research_questions":[],
        "query_plan":[],
        "official_source_candidates":[],
        "evidence":merged["evidence"],
        "evidence_score":round(sum(x.get("evidence_score",0) for x in merged["evidence"][:8]) / max(1,len(merged["evidence"][:8]))),
        "verified_evidence_count":sum(1 for x in merged["evidence"] if x.get("verified")),
        "official_evidence_count":sum(1 for x in merged["evidence"] if x.get("official")),
        "fresh_evidence_count":sum(1 for x in merged["evidence"] if x.get("fresh") is True),
        "research_status":"ingested",
        "ready_for_writer":True,
        "ready_for_publish":False,
        "created_at":now_iso(),
    }
    qa = evaluate_research(package, project_root/"factory"/"config")
    package["research_qa_score"] = qa["score"]
    package["ready_for_publish"] = qa["pass"]
    package["research_status"] = "verified" if qa["pass"] else "research_rework_required"
    report = build_research_report(plan, package, qa)
    outputs = save_research_outputs(project_root/"factory"/"output", package, qa, report)
    result = {
        "converted":converted,
        "merged":merged,
        "package":package,
        "qa":qa,
        "report":report,
        "output_files":outputs,
    }
    save_json(project_root/"factory"/"output"/"research"/"ingestion_report.json",result)
    return result

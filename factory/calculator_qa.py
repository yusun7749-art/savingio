from __future__ import annotations
from pathlib import Path
from .utils import now_iso

def validate_calculator(calculator: dict, project_root: Path | None = None) -> dict:
    issues=[]
    required=["id","title","category","keywords","article_topics","input_fields","result_fields","next_actions","status"]
    for field in required:
        if field not in calculator or calculator.get(field) in (None,[], ""):
            issues.append(f"missing:{field}")
    if calculator.get("category") not in {"salary","tax","utility","finance","loan","savings","insurance","business","health","life"}:
        issues.append("invalid_category")
    if calculator.get("status")=="active":
        url=calculator.get("url","")
        if not url:
            issues.append("active_without_url")
        elif project_root and not (project_root/url.lstrip("/")).exists():
            issues.append("calculator_file_missing")
    if not calculator.get("article_topics"):
        issues.append("not_linked_to_article_topics")
    if not calculator.get("next_actions"):
        issues.append("missing_next_actions")
    return {"pass":not issues,"issues":issues,"calculator_id":calculator.get("id"),"checked_at":now_iso()}

def validate_registry(calculators: list[dict], project_root: Path | None = None) -> dict:
    results=[validate_calculator(row,project_root) for row in calculators]
    return {
        "pass":all(row["pass"] for row in results),
        "calculator_count":len(results),
        "passed_count":sum(row["pass"] for row in results),
        "failed_count":sum(not row["pass"] for row in results),
        "results":results,
        "checked_at":now_iso(),
    }

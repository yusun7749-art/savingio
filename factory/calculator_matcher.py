from __future__ import annotations
from pathlib import Path
from .calculator_intent_engine import analyze_calculator_intent
from .utils import save_json, now_iso

def match_article_to_calculators(topic: str, slug: str, project_root: Path) -> dict:
    intent = analyze_calculator_intent(topic, project_root/"factory"/"config")
    available = [row for row in intent["matches"] if row.get("status")=="active" and row.get("url") and (project_root / row.get("url", "").lstrip("/")).exists()]
    missing = intent["calculator_required"] and not available
    result = {
        "topic":topic,
        "slug":slug,
        "calculator_required":intent["calculator_required"],
        "linked_calculators":available,
        "generation_required":missing,
        "matched_candidates":intent["matches"],
        "created_at":now_iso(),
    }
    save_json(project_root/"factory"/"output"/"calculator"/f"{slug}-match.json",result)
    return result

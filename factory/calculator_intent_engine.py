from __future__ import annotations
from pathlib import Path
from .calculator_registry import load_registry
from .utils import now_iso

def _score(topic: str, keywords: list[str]) -> int:
    value = topic.lower().replace(" ","")
    score = 0
    for keyword in keywords:
        key = keyword.lower().replace(" ","")
        if key and key in value:
            score += 10 + min(10,len(key))
    return score

def analyze_calculator_intent(topic: str, config_dir: Path) -> dict:
    registry = load_registry(config_dir)
    matches = []
    for calculator in registry.get("calculators", []):
        keywords = list(calculator.get("keywords", [])) + list(calculator.get("article_topics", []))
        score = _score(topic, keywords)
        if score > 0:
            matches.append({
                "calculator_id":calculator["id"],
                "title":calculator["title"],
                "category":calculator["category"],
                "url":calculator.get("url"),
                "status":calculator.get("status","planned"),
                "score":score,
                "reason":"keyword_match",
            })
    matches.sort(key=lambda item:(-item["score"],item["calculator_id"]))
    required = bool(matches) or any(token in topic for token in ["얼마","계산","예상","비교","실수령","요금","이자","수수료","세후","환산"])
    return {
        "topic":topic,
        "calculator_required":required,
        "matched_count":len(matches),
        "matches":matches[:5],
        "created_at":now_iso(),
    }

from __future__ import annotations
from pathlib import Path
from urllib.parse import urlparse
import json
from .utils import load_json, save_json, now_iso

def _normalise_domain(value: str) -> str:
    value = value.strip().lower()
    if "://" in value:
        value = urlparse(value).netloc.lower()
    return value.removeprefix("www.").split(":")[0]

def load_source_registry(config_dir: Path) -> dict:
    payload = load_json(config_dir / "source_registry.json")
    sources = payload.get("sources", [])
    if not sources:
        raise ValueError("source_registry.json에 sources가 없습니다.")
    seen = set()
    for source in sources:
        source["domain"] = _normalise_domain(source["domain"])
        if source["domain"] in seen:
            raise ValueError(f"중복 출처 도메인: {source['domain']}")
        seen.add(source["domain"])
    return payload

def match_sources(topic: str, registry: dict, limit: int = 10) -> list[dict]:
    low = topic.lower()
    scored = []
    for source in registry.get("sources", []):
        keywords = source.get("keywords", [])
        hits = [k for k in keywords if k.lower() in low]
        if not hits and not source.get("always_include", False):
            continue
        trust = int(source.get("trust_score", 50))
        priority = int(source.get("priority", 99))
        score = trust + len(hits) * 10 - priority
        scored.append({
            "name": source["name"],
            "domain": source["domain"],
            "category": source.get("category", "general"),
            "trust_score": trust,
            "priority": priority,
            "matched_keywords": hits,
            "query_templates": source.get("query_templates", []),
            "score": score,
        })
    scored.sort(key=lambda x: (-x["score"], x["priority"], x["name"]))
    return scored[:limit]

def trust_for_url(url: str, registry: dict) -> dict:
    domain = _normalise_domain(url)
    for source in registry.get("sources", []):
        registered = _normalise_domain(source["domain"])
        if domain == registered or domain.endswith("." + registered):
            return {
                "official": True,
                "source_name": source["name"],
                "domain": domain,
                "trust_score": int(source.get("trust_score", 50)),
                "category": source.get("category", "general"),
            }
    return {
        "official": False,
        "source_name": domain or "unknown",
        "domain": domain,
        "trust_score": 20 if domain else 0,
        "category": "unregistered",
    }

def build_query_plan(topic: str, registry: dict, sources: list[dict]) -> list[dict]:
    plans = []
    for source in sources:
        templates = source.get("query_templates") or [
            'site:{domain} "{topic}"',
            'site:{domain} "{topic}" 조건',
            'site:{domain} "{topic}" 신청',
        ]
        for template in templates:
            plans.append({
                "source_name": source["name"],
                "domain": source["domain"],
                "query": template.format(domain=source["domain"], topic=topic),
                "priority": source["priority"],
                "trust_score": source["trust_score"],
            })
    return plans

def save_registry_snapshot(output_dir: Path, registry: dict) -> str:
    path = output_dir / "research" / "source_registry_snapshot.json"
    save_json(path, {"created_at": now_iso(), **registry})
    return path.as_posix()

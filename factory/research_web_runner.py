from __future__ import annotations
from pathlib import Path
from .source_registry import load_source_registry, match_sources, build_query_plan
from .web_connector import fetch_many
from .research_cache import ResearchCache
from .utils import save_json, now_iso

def run_web_research(topic: str, project_root: Path, urls: list[str], use_cache: bool=True) -> dict:
    config_dir = project_root / "factory" / "config"
    registry = load_source_registry(config_dir)
    candidates = match_sources(topic, registry, limit=12)
    allowed_domains = [x["domain"] for x in registry["sources"]]
    query_plan = build_query_plan(topic, registry, candidates)
    cache = ResearchCache(project_root, ttl_seconds=86400)

    results = []
    misses = []
    for url in urls:
        cached = cache.get(url) if use_cache else None
        if cached:
            item = dict(cached)
            item["cache_hit"] = True
            results.append(item)
        else:
            misses.append(url)

    if misses:
        fetched = fetch_many(misses, allowed_domains)
        for item in fetched["results"]:
            item["cache_hit"] = False
            results.append(item)
            if item["status"] == "ok":
                cache.put(item["url"], item)

    report = {
        "topic": topic,
        "query_plan": query_plan,
        "source_candidates": candidates,
        "requested_urls": len(urls),
        "cache_hits": sum(1 for x in results if x.get("cache_hit")),
        "successful_fetches": sum(1 for x in results if x["status"] == "ok"),
        "blocked_domains": sum(1 for x in results if x["status"] == "blocked_domain"),
        "failed_fetches": sum(1 for x in results if x["status"] == "error"),
        "results": results,
        "created_at": now_iso(),
    }
    save_json(project_root/"factory"/"output"/"research"/"web_research_report.json", report)
    return report

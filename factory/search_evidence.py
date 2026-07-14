from __future__ import annotations
from pathlib import Path
from urllib.parse import urlparse
import hashlib, json, re
from .source_registry import load_source_registry, trust_for_url
from .research_collector import normalise_evidence
from .utils import save_json, now_iso, text_only

def _clean_title(value: str) -> str:
    return re.sub(r"\s+", " ", text_only(value or "")).strip()

def _clean_snippet(value: str) -> str:
    return re.sub(r"\s+", " ", text_only(value or "")).strip()

def _claim_from_result(title: str, snippet: str) -> str:
    title = _clean_title(title)
    snippet = _clean_snippet(snippet)
    if snippet:
        return snippet[:300]
    return title[:300]

def _dedupe_key(item: dict) -> str:
    raw = "|".join([
        item.get("url","").strip().lower(),
        item.get("claim","").strip().lower(),
    ])
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def convert_search_results(results: list[dict], config_dir: Path) -> dict:
    registry = load_source_registry(config_dir)
    converted = []
    rejected = []
    for index, row in enumerate(results):
        url = str(row.get("url") or row.get("link") or "").strip()
        title = _clean_title(str(row.get("title","")))
        snippet = _clean_snippet(str(row.get("snippet") or row.get("description") or ""))
        if not url or urlparse(url).scheme not in {"http","https"}:
            rejected.append({"index":index,"reason":"invalid_url","row":row})
            continue
        trust = trust_for_url(url, registry)
        if not trust["official"]:
            rejected.append({"index":index,"reason":"unregistered_domain","url":url})
            continue
        claim = _claim_from_result(title, snippet)
        if len(claim) < 10:
            rejected.append({"index":index,"reason":"claim_too_short","url":url})
            continue
        evidence = normalise_evidence({
            "source_name": trust["source_name"],
            "url": url,
            "claim": claim,
            "excerpt": snippet or title,
            "published_at": str(row.get("published_at") or row.get("date") or ""),
            "retrieved_at": now_iso(),
            "verified": bool(row.get("verified", False)),
        }, registry)
        evidence["search_rank"] = index + 1
        evidence["title"] = title
        converted.append(evidence)

    unique = {}
    duplicate_count = 0
    for item in converted:
        key = _dedupe_key(item)
        if key in unique:
            duplicate_count += 1
            if item["evidence_score"] > unique[key]["evidence_score"]:
                unique[key] = item
        else:
            unique[key] = item

    items = sorted(
        unique.values(),
        key=lambda x: (-int(x.get("official",False)), -x.get("evidence_score",0), x.get("search_rank",999)),
    )
    return {
        "evidence": items,
        "converted_count": len(items),
        "rejected_count": len(rejected),
        "duplicate_count": duplicate_count,
        "rejected": rejected,
        "created_at": now_iso(),
    }

def convert_search_file(input_path: Path, config_dir: Path, output_path: Path) -> dict:
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    rows = payload.get("results", payload if isinstance(payload, list) else [])
    if not isinstance(rows, list):
        raise ValueError("검색 결과 JSON은 list 또는 results 배열이어야 합니다.")
    report = convert_search_results(rows, config_dir)
    save_json(output_path, report)
    return report

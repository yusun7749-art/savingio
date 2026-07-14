from __future__ import annotations
from pathlib import Path
from urllib.parse import urlparse
import hashlib, json, re
from datetime import datetime, timezone
from .source_registry import trust_for_url
from .utils import load_json, now_iso, text_only

def _fingerprint(item: dict) -> str:
    raw = "|".join([
        item.get("url","").strip().lower(),
        item.get("claim","").strip().lower(),
        item.get("source_name","").strip().lower(),
    ])
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def _parse_date(value: str|None):
    if not value:
        return None
    value = value.strip().replace("Z","+00:00")
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        try:
            return datetime.strptime(value[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        except ValueError:
            return None

def normalise_evidence(item: dict, registry: dict, freshness_days: int = 730) -> dict:
    url = str(item.get("url","")).strip()
    trust = trust_for_url(url, registry)
    claim = text_only(str(item.get("claim",""))).strip()
    excerpt = text_only(str(item.get("excerpt",""))).strip()
    published_at = str(item.get("published_at","")).strip()
    parsed = _parse_date(published_at)
    age_days = None
    fresh = None
    if parsed:
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        now = datetime.now(parsed.tzinfo)
        age_days = max(0, (now - parsed).days)
        fresh = age_days <= freshness_days
    validity = {
        "has_url": bool(urlparse(url).scheme in {"http","https"} and urlparse(url).netloc),
        "has_claim": len(claim) >= 10,
        "has_source": bool(item.get("source_name") or trust["source_name"]),
        "has_excerpt": len(excerpt) >= 20,
    }
    verified = bool(
        validity["has_url"] and validity["has_claim"] and
        validity["has_source"] and trust["trust_score"] >= 60
    )
    score = 0
    score += trust["trust_score"] * 0.45
    score += 20 if validity["has_claim"] else 0
    score += 15 if validity["has_excerpt"] else 0
    score += 10 if fresh is True else (4 if fresh is None else 0)
    score += 10 if item.get("verified") is True else 0
    score = min(100, round(score))
    result = {
        "source_name": str(item.get("source_name") or trust["source_name"]).strip(),
        "url": url,
        "claim": claim,
        "excerpt": excerpt,
        "published_at": published_at,
        "retrieved_at": str(item.get("retrieved_at") or now_iso()),
        "official": trust["official"],
        "domain": trust["domain"],
        "trust_score": trust["trust_score"],
        "fresh": fresh,
        "age_days": age_days,
        "verified": verified,
        "evidence_score": score,
        "validity": validity,
        "issues": [name for name, passed in validity.items() if not passed],
    }
    result["fingerprint"] = _fingerprint(result)
    return result

def load_evidence_files(paths: list[Path], registry: dict, freshness_days: int = 730) -> dict:
    raw_items = []
    input_files = []
    for path in paths:
        if not path.exists():
            raise FileNotFoundError(path)
        payload = load_json(path)
        items = payload.get("evidence", payload if isinstance(payload, list) else [])
        if not isinstance(items, list):
            raise ValueError(f"evidence 형식 오류: {path}")
        raw_items.extend(items)
        input_files.append(str(path))
    normalised = [normalise_evidence(item, registry, freshness_days) for item in raw_items]
    unique = {}
    duplicates = []
    for item in normalised:
        fp = item["fingerprint"]
        if fp in unique:
            duplicates.append(item)
            if item["evidence_score"] > unique[fp]["evidence_score"]:
                unique[fp] = item
        else:
            unique[fp] = item
    items = sorted(unique.values(), key=lambda x: (-x["evidence_score"], x["source_name"]))
    return {
        "items": items,
        "input_files": input_files,
        "raw_count": len(raw_items),
        "unique_count": len(items),
        "duplicate_count": len(duplicates),
        "verified_count": sum(1 for x in items if x["verified"]),
        "official_count": sum(1 for x in items if x["official"]),
        "fresh_count": sum(1 for x in items if x["fresh"] is True),
    }

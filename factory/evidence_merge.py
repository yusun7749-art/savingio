from __future__ import annotations
from pathlib import Path
import hashlib, json
from .utils import save_json, now_iso

def _key(item: dict) -> str:
    raw = "|".join([
        str(item.get("url","")).strip().lower(),
        str(item.get("claim","")).strip().lower(),
    ])
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def merge_evidence_sets(sets: list[list[dict]]) -> dict:
    merged = {}
    conflicts = []
    input_count = 0
    for source_index, items in enumerate(sets):
        for item in items:
            input_count += 1
            key = _key(item)
            if key not in merged:
                merged[key] = {**item, "sources_seen":[source_index]}
                continue
            current = merged[key]
            current["sources_seen"] = sorted(set(current.get("sources_seen",[]) + [source_index]))
            if item.get("evidence_score",0) > current.get("evidence_score",0):
                merged[key] = {**item, "sources_seen":current["sources_seen"]}
            elif item.get("claim") != current.get("claim"):
                conflicts.append({
                    "url":item.get("url"),
                    "claim_a":current.get("claim"),
                    "claim_b":item.get("claim"),
                })
    items = sorted(
        merged.values(),
        key=lambda x:(-x.get("evidence_score",0), -int(bool(x.get("official"))), x.get("source_name",""))
    )
    return {
        "input_count":input_count,
        "unique_count":len(items),
        "duplicate_count":input_count-len(items),
        "conflict_count":len(conflicts),
        "conflicts":conflicts,
        "evidence":items,
        "created_at":now_iso(),
    }

def merge_files(paths: list[Path], output_path: Path) -> dict:
    sets = []
    for path in paths:
        payload = json.loads(path.read_text(encoding="utf-8"))
        items = payload.get("evidence", payload if isinstance(payload,list) else [])
        if not isinstance(items,list):
            raise ValueError(f"evidence 배열이 없습니다: {path}")
        sets.append(items)
    result = merge_evidence_sets(sets)
    save_json(output_path,result)
    return result

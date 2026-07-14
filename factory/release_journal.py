from __future__ import annotations
from pathlib import Path
import hashlib, json
from .utils import save_json, now_iso

def _digest(payload: dict) -> str:
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",",":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def append_release_event(project_root: Path, event: dict) -> dict:
    path = project_root/"factory"/"output"/"release_journal.json"
    journal = []
    if path.exists():
        payload = json.loads(path.read_text(encoding="utf-8"))
        journal = payload if isinstance(payload, list) else payload.get("events",[])
    previous_hash = journal[-1].get("event_hash","") if journal else ""
    item = {
        **event,
        "sequence":len(journal)+1,
        "previous_hash":previous_hash,
        "recorded_at":now_iso(),
    }
    item["event_hash"] = _digest(item)
    journal.append(item)
    save_json(path,journal[-1000:])
    return item

def verify_release_journal(project_root: Path) -> dict:
    path = project_root/"factory"/"output"/"release_journal.json"
    if not path.exists():
        return {"pass":True,"event_count":0,"issues":[]}
    journal = json.loads(path.read_text(encoding="utf-8"))
    issues = []
    previous_hash = ""
    for index, item in enumerate(journal):
        expected_previous = item.get("previous_hash","")
        if expected_previous != previous_hash:
            issues.append(f"previous_hash_mismatch:{index+1}")
        stored_hash = item.get("event_hash","")
        copy = dict(item)
        copy.pop("event_hash",None)
        calculated = _digest(copy)
        if stored_hash != calculated:
            issues.append(f"event_hash_mismatch:{index+1}")
        previous_hash = stored_hash
    return {"pass":not issues,"event_count":len(journal),"issues":issues}

from __future__ import annotations
from pathlib import Path
import hashlib, json
from .utils import save_json, now_iso

def _digest(payload: dict) -> str:
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",",":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def append_verification_receipt(project_root: Path, report: dict) -> dict:
    path = project_root/"factory"/"output"/"connector_verification_history.json"
    history = []
    if path.exists():
        payload = json.loads(path.read_text(encoding="utf-8"))
        history = payload if isinstance(payload,list) else payload.get("items",[])
    previous_hash = history[-1].get("receipt_hash","") if history else ""
    item = {
        "sequence": len(history)+1,
        "execute": report.get("execute",False),
        "passed_count": report.get("passed_count",0),
        "total_count": report.get("total_count",0),
        "statuses": report.get("statuses",[]),
        "previous_hash": previous_hash,
        "created_at": now_iso(),
    }
    item["receipt_hash"] = _digest(item)
    history.append(item)
    save_json(path, history[-500:])
    return item

def verify_history(project_root: Path) -> dict:
    path = project_root/"factory"/"output"/"connector_verification_history.json"
    if not path.exists():
        return {"pass":True,"count":0,"issues":[]}
    history = json.loads(path.read_text(encoding="utf-8"))
    issues = []
    previous_hash = ""
    for index,item in enumerate(history):
        if item.get("previous_hash","") != previous_hash:
            issues.append(f"previous_hash_mismatch:{index+1}")
        stored = item.get("receipt_hash","")
        copy = dict(item)
        copy.pop("receipt_hash",None)
        if _digest(copy) != stored:
            issues.append(f"receipt_hash_mismatch:{index+1}")
        previous_hash = stored
    return {"pass":not issues,"count":len(history),"issues":issues}

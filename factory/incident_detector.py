from __future__ import annotations
from pathlib import Path
import json, hashlib
from .utils import save_json, now_iso

SEVERITY = {"critical":100,"high":80,"medium":50,"low":20}

def _fingerprint(parts: list[str]) -> str:
    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()[:16]

def detect_incidents(project_root: Path, snapshot_path: Path | None = None) -> dict:
    path = snapshot_path or project_root/"factory"/"output"/"operations_snapshot.json"
    snapshot = json.loads(path.read_text(encoding="utf-8"))
    incidents = []

    for row in snapshot.get("sources",[]):
        source = row["source"]
        state = row["state"]
        status = row.get("status") or ""
        if state == "attention":
            severity = "critical" if source in {"approved_republish","final_release"} else "high"
            incidents.append({
                "incident_id": _fingerprint([source,state,status]),
                "source": source,
                "severity": severity,
                "score": SEVERITY[severity],
                "issue": status or "attention_required",
                "action": "inspect_and_recover",
            })
        elif state == "missing" and source in {"integration_preflight","production_readiness"}:
            incidents.append({
                "incident_id": _fingerprint([source,state]),
                "source": source,
                "severity": "medium",
                "score": SEVERITY["medium"],
                "issue": "required_operational_report_missing",
                "action": "generate_report",
            })

    incidents.sort(key=lambda item:(-item["score"],item["source"]))
    result = {
        "incident_count": len(incidents),
        "critical_count": sum(1 for item in incidents if item["severity"]=="critical"),
        "high_count": sum(1 for item in incidents if item["severity"]=="high"),
        "incidents": incidents,
        "created_at": now_iso(),
    }
    save_json(project_root/"factory"/"output"/"incidents.json", result)
    return result

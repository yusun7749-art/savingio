from __future__ import annotations
from pathlib import Path
import hashlib, json
from .state_db import connect
from .utils import now_iso

def checksum_payload(payload: dict):
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()

def register_dna(db_path: Path, version: str, payload: dict):
    checksum = checksum_payload(payload)
    with connect(db_path) as c:
        c.execute(
            "INSERT OR REPLACE INTO dna_versions(version,checksum,payload_json,created_at) VALUES(?,?,?,?)",
            (version, checksum, json.dumps(payload, ensure_ascii=False), now_iso()),
        )
    return {"version": version, "checksum": checksum}

def latest_dna(db_path: Path):
    with connect(db_path) as c:
        row = c.execute("SELECT * FROM dna_versions ORDER BY id DESC LIMIT 1").fetchone()
        if not row:
            return None
        return {
            "version": row["version"],
            "checksum": row["checksum"],
            "payload": json.loads(row["payload_json"]),
            "created_at": row["created_at"],
        }

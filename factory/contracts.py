from __future__ import annotations
from pathlib import Path
import json
from .utils import load_json, save_json, now_iso

REQUIRED_DEPARTMENTS = [
    "planning","research","writing","seo","image","qa_primary",
    "qa_final","cms","git","deploy"
]

def load_contracts(config_dir: Path) -> dict:
    payload = load_json(config_dir / "department_contracts.json")
    missing = [name for name in REQUIRED_DEPARTMENTS if name not in payload.get("departments", {})]
    if missing:
        raise ValueError(f"부서 계약 누락: {missing}")
    return payload

def validate_packet(packet: dict, contract: dict) -> dict:
    required = contract.get("required_output_fields", [])
    missing = [field for field in required if field not in packet]
    return {
        "pass": not missing,
        "missing": missing,
        "checked_at": now_iso(),
    }

def write_handoff(output_dir: Path, department: str, packet: dict) -> str:
    path = output_dir / "handoffs" / f"{department}.json"
    save_json(path, packet)
    return path.as_posix()

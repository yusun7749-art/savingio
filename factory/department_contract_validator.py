from __future__ import annotations

from pathlib import Path
from typing import Mapping, Any

from .utils import load_json, now_iso


def validate_department_packet(
    department: str,
    packet: Mapping[str, Any] | None,
    config_dir: Path,
) -> dict:
    contracts = load_json(config_dir / "department_contracts.json").get("departments", {})
    definition = contracts.get(department)
    if definition is None:
        return {
            "department": department,
            "pass": False,
            "missing_fields": [],
            "blockers": [f"unknown_department:{department}"],
            "checked_at": now_iso(),
        }

    payload = dict(packet or {})
    required = definition.get("required_output_fields", [])
    missing = [field for field in required if field not in payload]
    blockers = [f"missing_field:{field}" for field in missing]
    return {
        "department": department,
        "pass": not blockers,
        "required_fields": required,
        "missing_fields": missing,
        "blockers": blockers,
        "checked_at": now_iso(),
    }


def validate_department_chain(packets: Mapping[str, Mapping[str, Any]], config_dir: Path) -> dict:
    contracts = load_json(config_dir / "department_contracts.json").get("departments", {})
    results = [
        validate_department_packet(name, packets.get(name), config_dir)
        for name in contracts
    ]
    blockers = [
        f"{row['department']}:{blocker}"
        for row in results
        for blocker in row["blockers"]
    ]
    return {
        "pass": not blockers,
        "departments": results,
        "blockers": blockers,
        "checked_at": now_iso(),
    }

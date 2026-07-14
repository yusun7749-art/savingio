from __future__ import annotations
from pathlib import Path
import os
from .external_integration_registry import list_integrations
from .utils import save_json, now_iso

def _masked_state(name: str) -> dict:
    value = os.getenv(name, "")
    return {
        "name": name,
        "configured": bool(value),
        "length": len(value),
        "fingerprint": (str(abs(hash(value)))[:10] if value else ""),
    }

def run_integration_preflight(project_root: Path) -> dict:
    integrations = []
    for item in list_integrations(project_root/"factory"/"config"):
        required = [_masked_state(name) for name in item["required_env"]]
        optional = [_masked_state(name) for name in item["optional_env"]]
        missing = [row["name"] for row in required if not row["configured"]]
        integrations.append({
            **item,
            "ready": not missing,
            "missing_required_env": missing,
            "required_env_state": required,
            "optional_env_state": optional,
        })

    git_ready = (project_root/".git").exists()
    result = {
        "integrations": integrations,
        "ready_count": sum(1 for row in integrations if row["ready"]),
        "total_count": len(integrations),
        "git_repository_ready": git_ready,
        "all_required_integrations_ready": all(row["ready"] for row in integrations),
        "checked_at": now_iso(),
    }
    save_json(project_root/"factory"/"output"/"integration_preflight.json", result)
    return result

from __future__ import annotations
from pathlib import Path
import json
from .utils import load_json, now_iso

def load_registry(config_dir: Path) -> dict:
    return load_json(config_dir/"external_integration_registry.json")

def list_integrations(config_dir: Path) -> list[dict]:
    registry = load_registry(config_dir)
    return [
        {
            "name": item["name"],
            "purpose": item["purpose"],
            "required_env": item.get("required_env", []),
            "optional_env": item.get("optional_env", []),
            "execution_mode": item.get("execution_mode", "manual"),
            "live_verification_required": bool(item.get("live_verification_required", True)),
        }
        for item in registry.get("integrations", [])
    ]

def integration_names(config_dir: Path) -> list[str]:
    return [item["name"] for item in list_integrations(config_dir)]

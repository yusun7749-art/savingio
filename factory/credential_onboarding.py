from __future__ import annotations
from pathlib import Path
import json, os
from .external_integration_registry import list_integrations
from .utils import save_json, now_iso

def build_credential_checklist(project_root: Path) -> dict:
    integrations = list_integrations(project_root/"factory"/"config")
    required = []
    optional = []
    for item in integrations:
        for name in item.get("required_env", []):
            if name not in required:
                required.append(name)
        for name in item.get("optional_env", []):
            if name not in optional and name not in required:
                optional.append(name)
    rows = []
    for name in required + optional:
        value = os.getenv(name, "")
        rows.append({
            "name": name,
            "required": name in required,
            "configured": bool(value),
            "length": len(value),
        })
    result = {
        "required_count": len(required),
        "optional_count": len(optional),
        "configured_required_count": sum(1 for row in rows if row["required"] and row["configured"]),
        "missing_required": [row["name"] for row in rows if row["required"] and not row["configured"]],
        "credentials": rows,
        "created_at": now_iso(),
    }
    save_json(project_root/"factory"/"output"/"credential_checklist.json", result)
    return result

def write_env_example(project_root: Path) -> dict:
    checklist = build_credential_checklist(project_root)
    path = project_root/"factory"/".env.production.example"
    lines = [
        "# Savingio Factory production credentials",
        "# Fill values locally. Never commit real secrets.",
    ]
    for row in checklist["credentials"]:
        lines.append(f"{row['name']}=")
    path.write_text("\n".join(lines)+"\n", encoding="utf-8")
    return {
        "path": path.relative_to(project_root).as_posix(),
        "variable_count": len(checklist["credentials"]),
        "created_at": now_iso(),
    }

def validate_service_account_json() -> dict:
    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
    if not raw:
        return {"configured":False,"valid":False,"error":"missing"}
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        return {"configured":True,"valid":False,"error":str(exc)}
    required = ["client_email","private_key","token_uri"]
    missing = [name for name in required if not payload.get(name)]
    return {
        "configured":True,
        "valid":not missing,
        "missing_fields":missing,
        "client_email_present":bool(payload.get("client_email")),
        "private_key_present":bool(payload.get("private_key")),
        "token_uri_present":bool(payload.get("token_uri")),
    }

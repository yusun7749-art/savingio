from __future__ import annotations
from pathlib import Path
import json, os
from .utils import now_iso

REQUIRED_KEYS = {
    "search_console": ["GOOGLE_SERVICE_ACCOUNT_JSON", "SEARCH_CONSOLE_SITE_URL"],
    "ga4": ["GOOGLE_SERVICE_ACCOUNT_JSON", "GA4_PROPERTY_ID"],
}

def service_readiness(service: str) -> dict:
    required = REQUIRED_KEYS[service]
    missing = [key for key in required if not os.getenv(key)]
    credentials_valid = False
    credentials_error = None
    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
    if raw:
        try:
            payload = json.loads(raw)
            credentials_valid = bool(payload.get("client_email") and payload.get("private_key"))
            if not credentials_valid:
                credentials_error = "missing_client_email_or_private_key"
        except json.JSONDecodeError as exc:
            credentials_error = str(exc)
    return {
        "service": service,
        "ready": not missing and credentials_valid,
        "missing_env": missing,
        "credentials_valid": credentials_valid,
        "credentials_error": credentials_error,
        "checked_at": now_iso(),
    }

def all_google_services_readiness() -> dict:
    services = {name: service_readiness(name) for name in REQUIRED_KEYS}
    return {
        "services": services,
        "ready_count": sum(1 for item in services.values() if item["ready"]),
        "total_count": len(services),
        "checked_at": now_iso(),
    }

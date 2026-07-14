from __future__ import annotations
import base64, hashlib, json, os, time
from .utils import now_iso

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")

def load_service_account_from_env() -> dict:
    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
    if not raw:
        raise RuntimeError("missing_env:GOOGLE_SERVICE_ACCOUNT_JSON")
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"invalid_service_account_json:{exc}") from exc
    required = ["client_email", "private_key", "token_uri"]
    missing = [name for name in required if not payload.get(name)]
    if missing:
        raise RuntimeError("missing_service_account_fields:" + ",".join(missing))
    return payload

def build_unsigned_jwt_claims(service_account: dict, scope: str, lifetime_seconds: int = 3600) -> dict:
    issued = int(time.time())
    return {
        "iss": service_account["client_email"],
        "scope": scope,
        "aud": service_account.get("token_uri", "https://oauth2.googleapis.com/token"),
        "iat": issued,
        "exp": issued + int(lifetime_seconds),
    }

def build_jwt_header() -> dict:
    return {"alg":"RS256","typ":"JWT"}

def build_signing_input(service_account: dict, scope: str) -> dict:
    header = build_jwt_header()
    claims = build_unsigned_jwt_claims(service_account, scope)
    encoded_header = _b64url(json.dumps(header, separators=(",",":")).encode("utf-8"))
    encoded_claims = _b64url(json.dumps(claims, separators=(",",":")).encode("utf-8"))
    signing_input = encoded_header + "." + encoded_claims
    return {
        "header": header,
        "claims": claims,
        "signing_input": signing_input,
        "private_key_fingerprint": hashlib.sha256(service_account["private_key"].encode("utf-8")).hexdigest()[:16],
        "created_at": now_iso(),
    }

def auth_readiness(scope: str) -> dict:
    try:
        account = load_service_account_from_env()
        payload = build_signing_input(account, scope)
        return {
            "ready": True,
            "client_email": account["client_email"],
            "token_uri": account.get("token_uri"),
            "scope": scope,
            "private_key_fingerprint": payload["private_key_fingerprint"],
            "created_at": now_iso(),
        }
    except RuntimeError as exc:
        return {"ready":False,"error":str(exc),"scope":scope,"created_at":now_iso()}

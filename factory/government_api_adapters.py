from __future__ import annotations
from pathlib import Path
import json
from .openapi_connector import call_openapi
from .utils import load_json, save_json, now_iso

def load_services(config_dir: Path) -> dict:
    return load_json(config_dir/"government_api_services.json")

def run_service(service_name: str, params: dict, project_root: Path) -> dict:
    config_dir = project_root/"factory"/"config"
    services = load_services(config_dir)
    service = next((x for x in services.get("services",[]) if x["name"]==service_name), None)
    if not service:
        raise KeyError(f"unknown_service:{service_name}")
    result = call_openapi(
        service["base_url"],
        {**service.get("default_params",{}), **params},
        [service["domain"]],
        api_key_env=service.get("api_key_env"),
        api_key_param=service.get("api_key_param","serviceKey"),
        timeout=int(service.get("timeout_seconds",20)),
    )
    report = {
        "service":service_name,
        "status":result.get("status"),
        "result":result,
        "created_at":now_iso(),
    }
    safe = service_name.replace("/","-").replace(" ","-")
    save_json(project_root/"factory"/"output"/"research"/f"openapi-{safe}.json",report)
    return report

def list_services(config_dir: Path) -> list[dict]:
    payload = load_services(config_dir)
    return [
        {
            "name":x["name"],
            "domain":x["domain"],
            "enabled":x.get("enabled",False),
            "required_env":[x["api_key_env"]] if x.get("api_key_env") else [],
        }
        for x in payload.get("services",[])
    ]

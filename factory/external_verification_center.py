from __future__ import annotations
from pathlib import Path
from .credential_onboarding import build_credential_checklist, write_env_example
from .connector_verification_runner import run_connector_verification
from .connector_verification_receipt import append_verification_receipt
from .production_activation_gate import evaluate_production_activation
from .utils import save_json, now_iso

def run_external_verification_center(project_root: Path, execute: bool=False) -> dict:
    credentials = build_credential_checklist(project_root)
    env_template = write_env_example(project_root)
    verification = run_connector_verification(project_root, execute=execute)
    receipt = append_verification_receipt(project_root, verification)
    activation = evaluate_production_activation(project_root)
    result = {
        "status":"completed",
        "execute":execute,
        "credentials":credentials,
        "env_template":env_template,
        "verification":verification,
        "receipt":receipt,
        "activation":activation,
        "created_at":now_iso(),
    }
    save_json(project_root/"factory"/"output"/"external_verification_center.json", result)
    return result

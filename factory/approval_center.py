from __future__ import annotations
from pathlib import Path
import json, secrets
from .utils import save_json, now_iso

def create_approval_request(project_root: Path, run_report: dict) -> dict:
    token = secrets.token_urlsafe(20)
    request = {
        "token": token,
        "status": "waiting_user_approval",
        "topic": run_report["topic"],
        "slug": run_report["seo"]["slug"],
        "qa_score": run_report["qa"]["score"],
        "evidence_score": run_report["research"]["evidence_score"],
        "article_path": (run_report.get("cms") or {}).get("article_path"),
        "image_ready": (run_report.get("image") or {}).get("ready", False),
        "supervisor_pass": (run_report.get("supervisor") or {}).get("pass", False),
        "created_at": now_iso(),
    }
    save_json(project_root / "factory" / "output" / "approval_request.json", request)
    return request

def approve(project_root: Path, token: str, note: str="") -> dict:
    path = project_root / "factory" / "output" / "approval_request.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    if token != payload.get("token"):
        raise PermissionError("승인 토큰이 일치하지 않습니다.")
    payload["status"] = "approved"
    payload["note"] = note
    payload["approved_at"] = now_iso()
    save_json(path, payload)
    return payload

def reject(project_root: Path, token: str, reason: str) -> dict:
    path = project_root / "factory" / "output" / "approval_request.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    if token != payload.get("token"):
        raise PermissionError("승인 토큰이 일치하지 않습니다.")
    payload["status"] = "rejected"
    payload["reason"] = reason
    payload["rejected_at"] = now_iso()
    save_json(path, payload)
    return payload

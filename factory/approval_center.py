from __future__ import annotations
from pathlib import Path
import json, secrets
from .utils import save_json, now_iso


def _approval_fields(run_report: dict) -> dict:
    if "seo" in run_report and "qa" in run_report:
        return {
            "topic": run_report["topic"],
            "slug": run_report["seo"]["slug"],
            "qa_score": run_report["qa"]["score"],
            "evidence_score": run_report["research"]["evidence_score"],
            "article_path": (run_report.get("cms") or {}).get("article_path"),
            "image_ready": (run_report.get("image") or {}).get("ready", False),
            "supervisor_pass": (run_report.get("supervisor") or {}).get("pass", False),
            "release_status": (run_report.get("cms") or {}).get("release_status"),
        }

    items = run_report.get("items", [])
    if not isinstance(items, list) or not items:
        pending = run_report.get("pending", [])
        items = pending if isinstance(pending, list) else []
    if not items and isinstance(run_report.get("executor_report"), dict):
        for stage in run_report["executor_report"].get("stages", []):
            if isinstance(stage, dict) and stage.get("name") == "cms":
                report = stage.get("report", {})
                items = report.get("items", []) if isinstance(report, dict) else []
                break
    if not items or not isinstance(items[0], dict):
        raise ValueError("승인 요청에 사용할 CMS 완료 항목이 없습니다.")

    item = items[0]
    return {
        "topic": item.get("topic"),
        "slug": item.get("slug"),
        "qa_score": item.get("qa1_score", item.get("writer_qa_score", 0)),
        "evidence_score": item.get("research_qa_score", 0),
        "article_path": item.get("article_path"),
        "image_ready": bool(item.get("image_ready", False)),
        "supervisor_pass": bool(item.get("qa2_pass", False)),
        "release_status": item.get("release_status"),
    }


def create_approval_request(project_root: Path, run_report: dict) -> dict:
    token = secrets.token_urlsafe(20)
    fields = _approval_fields(run_report)
    request = {
        "token": token,
        "status": "waiting_user_approval",
        **fields,
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

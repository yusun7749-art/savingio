from __future__ import annotations

from pathlib import Path
from typing import Any

from .utils import save_json, now_iso


def build_final_checklist(run_report: dict[str, Any], project_root: Path) -> dict[str, Any]:
    research = run_report.get("research", {})
    qa = run_report.get("qa", {})
    image = run_report.get("image", {})
    supervisor = run_report.get("supervisor", {})
    cms = run_report.get("cms", {})
    items = [
        {"id": "planning", "label": "기획 패킷 완료", "pass": bool(run_report.get("plan"))},
        {"id": "research", "label": "조사 패킷 완료", "pass": bool(research)},
        {"id": "evidence", "label": "공식 근거 발행 기준 충족", "pass": bool(research.get("ready_for_publish"))},
        {"id": "qa", "label": "최종 QA 95점 이상", "pass": bool(qa.get("pass") and qa.get("score", 0) >= 95)},
        {"id": "image", "label": "이미지 생성 완료", "pass": bool(image.get("ready"))},
        {"id": "supervisor", "label": "리나 통합검수 통과", "pass": bool(supervisor.get("pass"))},
        {"id": "cms", "label": "CMS 초안 저장", "pass": bool(cms.get("article_path"))},
        {"id": "deploy", "label": "배포 대상 준비", "pass": bool(run_report.get("deploy", {}).get("ready", True))},
    ]
    blocking = [item["id"] for item in items if not item["pass"]]
    report = {
        "pass": not blocking,
        "blocking_items": blocking,
        "items": items,
        "ready_for_user_approval": not blocking,
        "created_at": now_iso(),
    }
    save_json(project_root / "factory" / "output" / "final_approval_checklist.json", report)
    return report

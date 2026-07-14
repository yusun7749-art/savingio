from __future__ import annotations

from pathlib import Path
from typing import Any
import json

from .message_bus import DepartmentMessageBus
from .utils import now_iso


ISSUE_OWNER = {
    "text_length": "writing",
    "faq_count": "writing",
    "required_sections": "writing",
    "title_length": "seo",
    "description_length": "seo",
    "canonical": "seo",
    "schema": "seo",
    "internal_links": "seo",
    "evidence_safety": "research",
    "forbidden_placeholders": "qa_primary",
    "image_missing": "image",
}


class ReworkManager:
    def __init__(self, project_root: Path):
        self.project_root = project_root.resolve()
        self.bus = DepartmentMessageBus(self.project_root)
        self.log_path = self.project_root / "factory" / "output" / "rework_requests.json"

    def assign(self, workflow_id: str, issues: list[str], source: str = "qa_final") -> dict[str, Any]:
        grouped: dict[str, list[str]] = {}
        for issue in issues:
            owner = ISSUE_OWNER.get(issue, "writing")
            grouped.setdefault(owner, []).append(issue)
        requests = []
        for department, department_issues in grouped.items():
            message = self.bus.publish(
                source,
                department,
                "rework.requested",
                {"issues": department_issues, "workflow_id": workflow_id},
                workflow_id,
            )
            requests.append({"department": department, "issues": department_issues, "message_id": message["id"]})
        report = {
            "workflow_id": workflow_id,
            "request_count": len(requests),
            "requests": requests,
            "created_at": now_iso(),
        }
        history = []
        if self.log_path.exists():
            history = json.loads(self.log_path.read_text(encoding="utf-8")).get("items", [])
        history.append(report)
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        self.log_path.write_text(json.dumps({"items": history[-200:]}, ensure_ascii=False, indent=2), encoding="utf-8")
        return report

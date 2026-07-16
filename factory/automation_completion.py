from __future__ import annotations

from pathlib import Path
from typing import Iterable

from .department_contract_validator import validate_department_chain
from .house_integrity import audit_house
from .integration_preflight import run_integration_preflight
from .orchestrator import Orchestrator
from .utils import now_iso, save_json


def _clean_topics(topics: Iterable[str]) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for topic in topics:
        value = " ".join(str(topic).split()).strip()
        if value and value not in seen:
            cleaned.append(value)
            seen.add(value)
    return cleaned


def run_automation_completion(
    project_root: Path,
    topics: Iterable[str] = (),
    *,
    publish: bool = False,
    limit: int = 100,
) -> dict:
    """Run the maximum safe local automation cycle.

    External integrations are checked but never reported as ready unless their
    required credentials are present. House integrity blocks execution so a
    nested Savingio project cannot be modified accidentally.
    """
    root = project_root.resolve()
    house = audit_house(root)
    integrations = run_integration_preflight(root)
    topic_list = _clean_topics(topics)

    if not house["pass"]:
        result = {
            "pass": False,
            "status": "blocked",
            "topics": topic_list,
            "house_integrity": house,
            "integrations": integrations,
            "queue_results": [],
            "department_contracts": None,
            "blockers": house["blockers"],
            "completed_at": now_iso(),
        }
        save_json(root / "factory" / "output" / "automation_completion.json", result)
        return result

    orchestrator = Orchestrator(root)
    queue_ids = [orchestrator.enqueue(topic) for topic in topic_list]
    queue_results = orchestrator.run_until_empty(publish=publish, limit=max(1, int(limit)))

    completed = [row for row in queue_results if row.get("status") == "completed"]
    rejected = [row for row in queue_results if row.get("status") in {"rejected", "retry", "dead_letter"}]

    latest_packets = {}
    if completed:
        latest = completed[-1].get("result", {})
        latest_packets = {
            "planning": latest.get("plan", {}),
            "research": latest.get("research", {}),
            "writing": {
                "html": (root / "factory" / "output" / "draft.html").read_text(encoding="utf-8")
                if (root / "factory" / "output" / "draft.html").exists() else "",
                "text_chars": latest.get("qa", {}).get("text_chars", 0),
            },
            "seo": latest.get("seo", {}),
            "image": latest.get("image", {}),
            "qa_primary": latest.get("qa", {}),
            "qa_final": latest.get("qa", {}),
            "cms": latest.get("cms", {}) or {},
            "git": {
                "ready": bool(latest.get("git_script")),
                "selected_files_only": bool(latest.get("git_commands")),
            },
            "deploy": latest.get("deploy", {}) or {},
        }
    contracts = validate_department_chain(latest_packets, root / "factory" / "config") if latest_packets else None

    blockers: list[str] = []
    if rejected:
        blockers.append(f"queue_failures:{len(rejected)}")
    if contracts and not contracts["pass"]:
        blockers.extend(contracts["blockers"])

    result = {
        "pass": not blockers,
        "status": "completed" if not blockers else "completed_with_blockers",
        "topics": topic_list,
        "queue_ids": queue_ids,
        "queue_results": queue_results,
        "house_integrity": house,
        "integrations": integrations,
        "department_contracts": contracts,
        "blockers": blockers,
        "completed_at": now_iso(),
    }
    save_json(root / "factory" / "output" / "automation_completion.json", result)
    return result

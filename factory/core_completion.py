from __future__ import annotations

import importlib
from pathlib import Path
from typing import Iterable

from .utils import now_iso, save_json

REPORT_PATH = Path("factory/output/core_completion_report.json")

CORE_CONTRACTS: tuple[tuple[str, str, str], ...] = (
    ("기획본부", "factory.planning_hq", "create_plan"),
    ("조사본부", "factory.research_hq", "run_research_queue"),
    ("작가본부", "factory.writer_hq", "run_writer_queue"),
    ("SEO본부", "factory.seo_hq", "run_seo_queue"),
    ("Calculator HQ", "factory.calculator_hq_batch", "run_calculator_batch"),
    ("이미지본부", "factory.image_hq", "run_image_queue"),
    ("QA1본부", "factory.qa1_hq", "run_qa1_queue"),
    ("QA2본부", "factory.qa2_hq", "run_qa2_queue"),
    ("CMS본부", "factory.cms_hq", "run_cms_queue"),
)


def audit_core_departments(root: Path, contracts: Iterable[tuple[str, str, str]] = CORE_CONTRACTS) -> dict:
    """Verify that every core department has an importable executable contract."""
    root = root.resolve()
    departments: list[dict] = []
    for name, module_name, function_name in contracts:
        try:
            module = importlib.import_module(module_name)
            function = getattr(module, function_name)
            passed = callable(function)
            error = None if passed else "contract_not_callable"
        except Exception as exc:
            passed = False
            error = f"{type(exc).__name__}: {exc}"
        departments.append({
            "department": name,
            "module": module_name,
            "entrypoint": function_name,
            "status": "ready" if passed else "failed",
            "pass": passed,
            "error": error,
        })

    try:
        automation_module = importlib.import_module("factory.automation_hq")
        automation_entrypoint = getattr(automation_module, "run_factory_core")
        automation_pass = callable(automation_entrypoint)
        automation_error = None if automation_pass else "contract_not_callable"
    except Exception as exc:
        automation_pass = False
        automation_error = f"{type(exc).__name__}: {exc}"

    automation = {
        "module": "factory.automation_hq",
        "entrypoint": "run_factory_core",
        "status": "ready" if automation_pass else "failed",
        "pass": automation_pass,
        "error": automation_error,
    }

    passed_count = sum(1 for item in departments if item["pass"])
    report = {
        "created_at": now_iso(),
        "department_count": len(departments),
        "passed_count": passed_count,
        "failed_count": len(departments) - passed_count,
        "departments": departments,
        "automation": automation,
        "chain": [item[0] for item in CORE_CONTRACTS],
        "content_release_separated": True,
        "pass": passed_count == len(departments) and automation_pass,
    }
    save_json(root / REPORT_PATH, report)
    return report

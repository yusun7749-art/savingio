from __future__ import annotations

import importlib
import inspect
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .utils import now_iso, save_json

REGISTRY_PATH = Path("factory/engine_registry.json")
REPORT_PATH = Path("factory/output/runner_integration_audit.json")


@dataclass(frozen=True)
class EngineContract:
    name: str
    module: str
    entrypoint: str
    aliases: tuple[str, ...] = ()


CORE_ENGINES: tuple[EngineContract, ...] = (
    EngineContract("planning", "factory.planning_hq", "create_plan"),
    EngineContract("research", "factory.research_hq", "run_research_queue"),
    EngineContract("writer", "factory.writer_hq", "run_writer_queue", ("writing",)),
    EngineContract("seo", "factory.seo_hq", "run_seo_queue"),
    EngineContract("calculator", "factory.calculator_hq_batch", "run_calculator_batch", ("calculator_hq",)),
    EngineContract("image", "factory.image_hq", "run_image_queue"),
    EngineContract("qa1", "factory.qa1_hq", "run_qa1_queue", ("qa_primary",)),
    EngineContract("qa2", "factory.qa2_hq", "run_qa2_queue", ("qa_final",)),
    EngineContract("cms", "factory.cms_hq", "run_cms_queue"),
)


def canonical_stage_name(value: str) -> str:
    normalized = str(value).strip().lower().replace("-", "_")
    for contract in CORE_ENGINES:
        if normalized == contract.name or normalized in contract.aliases:
            return contract.name
    return normalized


def _load_registry(root: Path) -> tuple[dict, str | None]:
    path = root / REGISTRY_PATH
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return {}, f"{type(exc).__name__}: {exc}"
    if not isinstance(payload, dict):
        return {}, "registry_root_must_be_object"
    return payload, None


def _callable_contract(module_name: str, entrypoint: str) -> dict:
    try:
        module = importlib.import_module(module_name)
        target = getattr(module, entrypoint)
        if not callable(target):
            return {
                "module": module_name,
                "entrypoint": entrypoint,
                "pass": False,
                "error": "entrypoint_not_callable",
            }
        return {
            "module": module_name,
            "entrypoint": entrypoint,
            "pass": True,
            "signature": str(inspect.signature(target)),
            "error": None,
        }
    except Exception as exc:
        return {
            "module": module_name,
            "entrypoint": entrypoint,
            "pass": False,
            "error": f"{type(exc).__name__}: {exc}",
        }


def audit_runner_integration(
    root: Path,
    contracts: Iterable[EngineContract] = CORE_ENGINES,
) -> dict:
    root = root.resolve()
    registry, registry_error = _load_registry(root)

    manager = _callable_contract("factory.factory_core_runner", "run_managed_factory")
    executor = _callable_contract("factory.core_factory_runner", "run_core_factory")

    configured_manager = registry.get("manager")
    configured_executor = registry.get("executor") or registry.get("runner")
    configured_engines = registry.get("engines", [])
    if not isinstance(configured_engines, list):
        configured_engines = []
    configured_names = [
        canonical_stage_name(item.get("name", "") if isinstance(item, dict) else str(item))
        for item in configured_engines
    ]

    engine_results: list[dict] = []
    required_names: list[str] = []
    for contract in contracts:
        required_names.append(contract.name)
        result = _callable_contract(contract.module, contract.entrypoint)
        result.update({
            "name": contract.name,
            "aliases": list(contract.aliases),
            "registered": contract.name in configured_names,
        })
        result["pass"] = bool(result["pass"] and result["registered"])
        if not result["registered"] and not result.get("error"):
            result["error"] = "engine_not_registered"
        engine_results.append(result)

    missing_registered = [name for name in required_names if name not in configured_names]
    unknown_registered = sorted({name for name in configured_names if name and name not in required_names})

    manager_match = configured_manager in {None, "factory.factory_core_runner", "factory_core_runner.py"}
    executor_match = configured_executor in {
        "factory.core_factory_runner",
        "core_factory_runner.py",
    }

    checks = {
        "registry_loaded": registry_error is None,
        "manager_callable": bool(manager.get("pass")),
        "executor_callable": bool(executor.get("pass")),
        "manager_registry_match": manager_match,
        "executor_registry_match": executor_match,
        "all_core_engines_registered": not missing_registered,
        "all_core_engines_callable": all(item["pass"] for item in engine_results),
    }

    report = {
        "created_at": now_iso(),
        "status": "ready" if all(checks.values()) else "blocked",
        "pass": all(checks.values()),
        "manager": manager,
        "executor": executor,
        "registry": {
            "path": REGISTRY_PATH.as_posix(),
            "error": registry_error,
            "configured_manager": configured_manager,
            "configured_executor": configured_executor,
            "configured_engines": configured_names,
            "missing_core_engines": missing_registered,
            "unknown_engines": unknown_registered,
        },
        "engines": engine_results,
        "checks": checks,
    }
    save_json(root / REPORT_PATH, report)
    return report

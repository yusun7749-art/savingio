from __future__ import annotations

import json
from pathlib import Path

import factory.runner_integration as integration


def _registry(tmp_path: Path, engines: list[str]) -> None:
    path = tmp_path / integration.REGISTRY_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({
        "manager": "factory.factory_core_runner",
        "executor": "factory.core_factory_runner",
        "engines": engines,
    }), encoding="utf-8")


def test_runner_integration_audit_passes_with_all_core_engines(tmp_path: Path) -> None:
    _registry(tmp_path, [contract.name for contract in integration.CORE_ENGINES])

    report = integration.audit_runner_integration(tmp_path)

    assert report["pass"] is True
    assert report["status"] == "ready"
    assert report["registry"]["missing_core_engines"] == []
    assert (tmp_path / integration.REPORT_PATH).is_file()


def test_runner_integration_accepts_stage_aliases(tmp_path: Path) -> None:
    _registry(tmp_path, [
        "planning", "research", "writing", "seo", "calculator_hq",
        "image", "qa_primary", "qa_final", "cms",
    ])

    report = integration.audit_runner_integration(tmp_path)

    assert report["pass"] is True
    assert report["registry"]["configured_engines"] == [
        "planning", "research", "writer", "seo", "calculator",
        "image", "qa1", "qa2", "cms",
    ]


def test_runner_integration_blocks_missing_engine(tmp_path: Path) -> None:
    _registry(tmp_path, ["planning"])

    report = integration.audit_runner_integration(tmp_path)

    assert report["pass"] is False
    assert "research" in report["registry"]["missing_core_engines"]
    assert report["checks"]["all_core_engines_registered"] is False

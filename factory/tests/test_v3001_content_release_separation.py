from pathlib import Path

import factory.pm_console as pm
from factory.content_pipeline import execute_content_only


def _root() -> Path:
    return Path(__file__).resolve().parents[2]


def test_pm_console_uses_content_only_pipeline():
    source = Path(pm.__file__).read_text(encoding="utf-8")
    assert "execute_content_only" in source
    assert "from .pipeline import execute" not in source


def test_content_pipeline_does_not_run_project_release_scans():
    source = Path(execute_content_only.__code__.co_filename).read_text(encoding="utf-8")
    assert "run_adsense_lock" not in source
    assert "verify_deployment_integrity" not in source
    assert "build_selective_commands" not in source
    assert "run_release" not in source


def test_version_is_at_least_v3001():
    assert pm.VERSION in {"V3.001", "V3.002", "V3.003"}

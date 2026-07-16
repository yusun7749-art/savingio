from pathlib import Path

from factory.controller import FactoryController


def test_controller_writes_status_log_and_report(tmp_path: Path) -> None:
    controller = FactoryController(tmp_path, operation="unit-test")
    result = controller.run_stage(1, 1, "운영본부", lambda: {"pass": True})
    assert result["pass"] is True
    assert (tmp_path / "factory/output/controller_status.json").is_file()
    assert (tmp_path / "factory/output/controller.log").is_file()
    assert (tmp_path / "factory/output/controller_report.json").is_file()

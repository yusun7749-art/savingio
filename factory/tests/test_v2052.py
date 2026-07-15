from datetime import datetime
from pathlib import Path

from factory.department_board import status
from factory.deprecated_api_scan import scan_deprecated_apis
from factory.doctor import run_doctor

ROOT = Path(__file__).resolve().parents[2]


def test_department_timestamps_are_timezone_aware():
    board = status()
    assert board
    for department in board.values():
        parsed = datetime.fromisoformat(department["updated"])
        assert parsed.tzinfo is not None
        assert parsed.utcoffset().total_seconds() == 0


def test_deprecated_api_scan_is_clean():
    report = scan_deprecated_apis(ROOT)
    assert report["pass"], report["findings"]
    assert report["finding_count"] == 0


def test_doctor_includes_deprecated_api_gate():
    report = run_doctor(ROOT, include_publisher_lock=False)
    check = next(item for item in report["checks"] if item["name"] == "deprecated-api-scan")
    assert check["pass"]
    assert report["deprecated_api_scan"]["finding_count"] == 0

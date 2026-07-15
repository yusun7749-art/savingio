from __future__ import annotations

from pathlib import Path
from typing import Iterable

DEPRECATED_PATTERNS = {
    "datetime.utcnow": ("datetime.utcnow(", "datetime.datetime.utcnow("),
}
DEFAULT_EXCLUDES = {".git", "__pycache__", ".pytest_cache", "output", "state"}


def _python_files(factory_root: Path) -> Iterable[Path]:
    for path in factory_root.rglob("*.py"):
        if path.name == "deprecated_api_scan.py":
            continue
        if any(part in DEFAULT_EXCLUDES for part in path.parts):
            continue
        if "tests" in path.parts:
            continue
        yield path


def scan_deprecated_apis(project_root: Path) -> dict:
    project_root = Path(project_root).resolve()
    factory_root = project_root / "factory"
    findings = []
    for path in _python_files(factory_root):
        text = path.read_text(encoding="utf-8", errors="replace")
        for line_number, line in enumerate(text.splitlines(), start=1):
            for api_name, patterns in DEPRECATED_PATTERNS.items():
                if any(pattern in line for pattern in patterns):
                    findings.append({
                        "api": api_name,
                        "path": path.relative_to(project_root).as_posix(),
                        "line": line_number,
                        "source": line.strip(),
                    })
    return {
        "pass": not findings,
        "finding_count": len(findings),
        "findings": findings,
        "scanned_root": factory_root.relative_to(project_root).as_posix(),
    }

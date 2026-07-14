from __future__ import annotations

from pathlib import Path
import shutil

from .utils import now_iso, save_json

CACHE_DIR_NAMES = {"__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache"}
CACHE_SUFFIXES = {".pyc", ".pyo"}
TEMP_SUFFIXES = {".tmp", ".temp"}


def clean_factory(project_root: Path, *, include_temp: bool = True) -> dict:
    """Remove generated runtime caches without touching source, Git history or reports."""
    root = project_root.resolve()
    removed_dirs: list[str] = []
    removed_files: list[str] = []

    for path in sorted(root.rglob("*"), key=lambda p: len(p.parts), reverse=True):
        try:
            rel = path.relative_to(root).as_posix()
        except ValueError:
            continue
        if ".git" in path.parts:
            continue
        if path.is_dir() and path.name in CACHE_DIR_NAMES:
            shutil.rmtree(path, ignore_errors=True)
            removed_dirs.append(rel)
        elif path.is_file() and (
            path.suffix.lower() in CACHE_SUFFIXES
            or (include_temp and path.suffix.lower() in TEMP_SUFFIXES)
        ):
            try:
                path.unlink()
                removed_files.append(rel)
            except FileNotFoundError:
                pass

    result = {
        "pass": True,
        "status": "clean",
        "removed_directory_count": len(removed_dirs),
        "removed_file_count": len(removed_files),
        "removed_directories": removed_dirs,
        "removed_files": removed_files,
        "git_preserved": (root / ".git").exists(),
        "cleaned_at": now_iso(),
    }
    save_json(root / "factory" / "output" / "factory_cleaner_report.json", result)
    return result

from __future__ import annotations

from pathlib import Path
from typing import Iterable

from .utils import now_iso, save_json

_REQUIRED_DIRS = ("factory", "articles", "calculators", "css", "js")
_REQUIRED_FILES = ("index.html",)


def _relative(root: Path, paths: Iterable[Path]) -> list[str]:
    return [path.relative_to(root).as_posix() for path in paths]


def audit_house(project_root: Path, *, write_report: bool = True) -> dict:
    """Validate that Savingio is a single house with Factory inside it.

    This audit is intentionally read-only. It detects nested project copies and
    missing core paths without deleting user files.
    """
    root = project_root.resolve()
    missing_dirs = [name for name in _REQUIRED_DIRS if not (root / name).is_dir()]
    missing_files = [name for name in _REQUIRED_FILES if not (root / name).is_file()]

    nested_candidates: list[Path] = []
    quarantine_root = root / "factory" / "quarantine"
    for candidate in root.rglob("savingio-live"):
        if candidate == root or not candidate.is_dir():
            continue
        if quarantine_root in candidate.parents:
            continue
        if (candidate / "factory").is_dir() or (candidate / "articles").is_dir():
            nested_candidates.append(candidate)

    duplicate_factory_roots = [
        path.parent for path in root.rglob("factory")
        if path.is_dir() and path.parent != root and quarantine_root not in path.parents and (path.parent / "articles").is_dir()
    ]

    blockers: list[str] = []
    blockers.extend(f"missing_directory:{name}" for name in missing_dirs)
    blockers.extend(f"missing_file:{name}" for name in missing_files)
    blockers.extend(f"nested_house:{path.relative_to(root).as_posix()}" for path in nested_candidates)
    blockers.extend(
        f"duplicate_project_root:{path.relative_to(root).as_posix()}"
        for path in duplicate_factory_roots
        if path not in nested_candidates
    )

    result = {
        "pass": not blockers,
        "project_root": root.as_posix(),
        "required_directories": list(_REQUIRED_DIRS),
        "missing_directories": missing_dirs,
        "missing_files": missing_files,
        "nested_houses": _relative(root, nested_candidates),
        "duplicate_project_roots": _relative(root, duplicate_factory_roots),
        "blockers": sorted(set(blockers)),
        "checked_at": now_iso(),
    }
    if write_report:
        save_json(root / "factory" / "output" / "house_integrity.json", result)
    return result


def repair_nested_houses(project_root: Path) -> dict:
    """Move nested Savingio project copies into Factory quarantine.

    No files are deleted. Only directories reported by audit_house as nested
    houses are moved, preserving a recovery path.
    """
    import shutil
    from datetime import datetime, timezone

    root = project_root.resolve()
    before = audit_house(root, write_report=False)
    moved: list[dict] = []
    quarantine = root / "factory" / "quarantine" / (
        "nested-house-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    )
    for relative in before["nested_houses"]:
        source = root / relative
        if not source.exists() or source == root:
            continue
        quarantine.mkdir(parents=True, exist_ok=True)
        target = quarantine / source.name
        suffix = 1
        while target.exists():
            target = quarantine / f"{source.name}-{suffix}"
            suffix += 1
        shutil.move(str(source), str(target))
        moved.append({
            "source": relative,
            "target": target.relative_to(root).as_posix(),
        })

    after = audit_house(root, write_report=True)
    result = {
        "pass": after["pass"],
        "moved": moved,
        "before": before,
        "after": after,
        "checked_at": now_iso(),
    }
    save_json(root / "factory" / "output" / "house_repair.json", result)
    return result

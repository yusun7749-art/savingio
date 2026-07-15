from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

from .one_click_release import (
    GitChange,
    ReleaseBlocked,
    _is_volatile,
    _normalize_path,
    git_changes,
)
from .utils import now_iso, save_json

VERSION = "V2.050"
DEFAULT_SCOPE_PATH = Path("factory/config/release_scope.json")
DEFAULT_PREVIEW_PATH = Path("factory/output/release_scope_preview.json")


def _clean_candidates(paths: Iterable[str]) -> list[str]:
    normalized = list(dict.fromkeys(_normalize_path(str(path)) for path in paths))
    volatile = [path for path in normalized if _is_volatile(path)]
    if volatile:
        raise ReleaseBlocked(f"release_scope_contains_volatile:{','.join(volatile)}")
    return normalized


def changed_paths(root: Path, *, include_deletions: bool = False) -> list[str]:
    selected: list[str] = []
    for change in git_changes(root):
        normalized = _normalize_path(change.path)
        if _is_volatile(normalized):
            continue
        if change.deleted and not include_deletions:
            continue
        selected.append(normalized)
    return list(dict.fromkeys(selected))


def build_release_scope(
    root: Path,
    *,
    version: str = VERSION,
    commit_message: str | None = None,
    candidates: Iterable[str] | None = None,
    include_deletions: bool = False,
) -> dict:
    root = root.resolve()
    files = _clean_candidates(
        candidates if candidates is not None else changed_paths(root, include_deletions=include_deletions)
    )
    if not files:
        raise ReleaseBlocked("release_scope_files_empty")

    existing = {change.path.replace("\\", "/"): change for change in git_changes(root)}
    missing_from_changes = [path for path in files if path not in existing]
    if missing_from_changes:
        raise ReleaseBlocked(f"scope_files_not_changed:{','.join(missing_from_changes)}")

    deletions = [path for path in files if existing[path].deleted]
    if deletions and not include_deletions:
        raise ReleaseBlocked(f"scope_contains_deletions:{','.join(deletions)}")

    return {
        "version": version,
        "commit_message": commit_message or f"{version} finish safe release automation",
        "files": files,
        "include_deletions": include_deletions,
        "generated_at": now_iso(),
    }


def preview_release_scope(root: Path, scope: dict) -> dict:
    root = root.resolve()
    changes = {change.path.replace("\\", "/"): change for change in git_changes(root)}
    scope_files = _clean_candidates(scope.get("files", []))
    selected = [changes[path] for path in scope_files if path in changes]
    unrelated = [
        change for path, change in changes.items()
        if path not in set(scope_files) and not _is_volatile(path)
    ]
    unchanged = [path for path in scope_files if path not in changes]
    return {
        "version": scope.get("version", VERSION),
        "pass": bool(selected) and not unchanged,
        "selected_files": [change.path for change in selected],
        "selected_count": len(selected),
        "unrelated_changes": [change.path for change in unrelated],
        "unrelated_count": len(unrelated),
        "unchanged_scope_files": unchanged,
        "deletions": [change.path for change in selected if change.deleted],
        "created_at": now_iso(),
    }


def write_release_scope(
    root: Path,
    scope: dict,
    *,
    scope_path: Path = DEFAULT_SCOPE_PATH,
    preview_path: Path = DEFAULT_PREVIEW_PATH,
) -> dict:
    root = root.resolve()
    preview = preview_release_scope(root, scope)
    if not preview["pass"]:
        raise ReleaseBlocked("release_scope_preview_failed")
    save_json(root / scope_path, scope)
    save_json(root / preview_path, preview)
    return preview


def load_candidates_file(path: Path) -> list[str]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    values = payload.get("files") if isinstance(payload, dict) else payload
    if not isinstance(values, list):
        raise ReleaseBlocked("candidate_file_invalid")
    return [str(value) for value in values]

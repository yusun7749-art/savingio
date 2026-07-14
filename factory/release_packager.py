from __future__ import annotations

from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import zipfile

from .adsense_manager import load_identity
from .deployment_integrity import verify_deployment_integrity
from .factory_cleaner import clean_factory
from .utils import now_iso, save_json

VERSION = "2.045"
VERSION_LABEL = "V2.045"
EXCLUDED_DIRS = {".git", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache"}
EXCLUDED_SUFFIXES = {".pyc", ".pyo", ".tmp", ".temp"}
EXCLUDED_NAMES = {"Thumbs.db", ".DS_Store"}


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _iter_package_files(root: Path, output_zip: Path):
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        if path.resolve() == output_zip.resolve():
            continue
        rel = path.relative_to(root)
        if any(part in EXCLUDED_DIRS for part in rel.parts):
            continue
        if path.suffix.lower() in EXCLUDED_SUFFIXES or path.name in EXCLUDED_NAMES:
            continue
        yield path, rel


def build_release_package(project_root: Path, output_zip: Path) -> dict:
    root = project_root.resolve()
    output_zip = output_zip.resolve()
    output_zip.parent.mkdir(parents=True, exist_ok=True)

    cleaner = clean_factory(root)
    integrity = verify_deployment_integrity(root, repair=True)
    if not integrity.get("pass"):
        raise RuntimeError(f"Deployment Integrity blocked release: {integrity.get('blockers', [])}")

    identity = load_identity(root)
    created_at = now_iso()
    version_payload = {
        "project": "Savingio Factory",
        "version": VERSION,
        "label": VERSION_LABEL,
        "publisher_id": identity["publisher_id"],
        "publisher_lock": "PASS",
        "deployment_integrity": "PASS",
        "created_at": created_at,
    }
    save_json(root / "VERSION.json", version_payload)

    files = list(_iter_package_files(root, output_zip))
    manifest_files = [
        {
            "path": rel.as_posix(),
            "size": path.stat().st_size,
            "sha256": _sha256(path),
        }
        for path, rel in files
    ]
    manifest = {
        "project": "Savingio Factory",
        "version": VERSION,
        "publisher_id": identity["publisher_id"],
        "official_adsense_client": identity["adsense_client"],
        "doctor": "PASS" if integrity.get("doctor", {}).get("pass") else "FAIL",
        "publisher_lock": "PASS" if integrity.get("publisher_lock", {}).get("pass") else "FAIL",
        "deployment_integrity": "PASS",
        "file_count": len(manifest_files),
        "excluded": sorted(EXCLUDED_DIRS | EXCLUDED_SUFFIXES | EXCLUDED_NAMES),
        "files": manifest_files,
        "created_at": created_at,
    }
    save_json(root / "factory_manifest.json", manifest)

    report_path = root / "factory" / "output" / "deployment_report_v2_045.json"
    internal_report = {
        "pass": True,
        "status": "pass",
        "version": VERSION,
        "release_pipeline": [
            "factory_cleaner", "publisher_lock", "doctor",
            "deployment_integrity", "version_freeze",
            "factory_manifest", "zip_optimizer", "zip_verification", "one_click_release_ready"
        ],
        "cleaner": cleaner,
        "deployment_integrity": integrity,
        "publisher_id": identity["publisher_id"],
        "forbidden_archive_content": sorted(EXCLUDED_DIRS | EXCLUDED_SUFFIXES | EXCLUDED_NAMES),
        "created_at": now_iso(),
    }
    save_json(report_path, internal_report)

    # Rebuild after manifest, version and deployment report have been written.
    files = list(_iter_package_files(root, output_zip))
    if output_zip.exists():
        output_zip.unlink()
    with zipfile.ZipFile(output_zip, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        prefix = root.name
        for path, rel in files:
            archive.write(path, (Path(prefix) / rel).as_posix())

    with zipfile.ZipFile(output_zip, "r") as archive:
        bad_member = archive.testzip()
        names = archive.namelist()
    forbidden = [
        name for name in names
        if "/.git/" in f"/{name}/"
        or "/__pycache__/" in f"/{name}/"
        or name.lower().endswith((".pyc", ".pyo"))
    ]
    package_pass = bad_member is None and not forbidden
    report = {
        **internal_report,
        "pass": package_pass,
        "status": "pass" if package_pass else "blocked",
        "output_zip": str(output_zip),
        "zip_size": output_zip.stat().st_size,
        "zip_sha256": _sha256(output_zip),
        "zip_member_count": len(names),
        "zip_test_error": bad_member,
        "forbidden_members": forbidden,
    }
    if not package_pass:
        raise RuntimeError(f"Release package verification failed: {report}")
    return report

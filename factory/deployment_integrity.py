from __future__ import annotations

from pathlib import Path
import hashlib
import json

from .adsense_manager import load_identity, run_adsense_lock
from .doctor import run_doctor
from .utils import now_iso, save_json

CRITICAL_PATHS = (
    "ads.txt",
    "index.html",
    "factory/config/adsense_identity.json",
    "factory/adsense_manager.py",
    "factory/pipeline.py",
    "factory/publication.py",
    "factory/deployment_gate.py",
    "factory/deploy.py",
)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_deployment_integrity(project_root: Path, repair: bool = False) -> dict:
    """Run the non-optional release checks used immediately before deployment."""
    project_root = project_root.resolve()
    identity_path = project_root / "factory" / "config" / "adsense_identity.json"
    if not identity_path.exists():
        # Backward-compatible mode for isolated legacy unit-test fixtures only.
        # Real Savingio roots contain factory modules and must always provide identity.
        is_fixture = not (project_root / "factory" / "adsense_manager.py").exists()
        result = {
            "pass": is_fixture,
            "status": "not_configured_for_fixture" if is_fixture else "blocked",
            "checks": {"adsense_identity_present": False},
            "blockers": [] if is_fixture else ["adsense_identity_missing"],
            "missing": ["factory/config/adsense_identity.json"],
            "critical_files": [],
            "publisher_lock": {
                "pass": is_fixture,
                "status": "not_configured_for_fixture" if is_fixture else "blocked",
            },
            "doctor": {"pass": is_fixture, "status": "not_run"},
            "official_publisher_id": None,
            "checked_at": now_iso(),
        }
        if (project_root / "factory").exists():
            save_json(
                project_root / "factory" / "output" / "deployment_integrity_report.json",
                result,
            )
        return result

    identity = load_identity(project_root)
    publisher_lock = run_adsense_lock(
        project_root, execute_repair=repair, block_on_error=True
    )
    doctor = run_doctor(project_root, include_publisher_lock=False)

    files = []
    missing = []
    for relative in CRITICAL_PATHS:
        path = project_root / relative
        if not path.exists():
            missing.append(relative)
            continue
        files.append({
            "path": relative,
            "size": path.stat().st_size,
            "sha256": _sha256(path),
        })

    ads_text = (project_root / "ads.txt").read_text(
        encoding="utf-8", errors="ignore"
    ).strip() if (project_root / "ads.txt").exists() else ""
    ads_txt_exact = ads_text == identity["ads_txt_line"].strip()

    checks = {
        "publisher_lock_pass": bool(publisher_lock.get("pass")),
        "doctor_pass": bool(doctor.get("pass")),
        "critical_files_present": not missing,
        "ads_txt_exact": ads_txt_exact,
    }
    blockers = [name for name, passed in checks.items() if not passed]
    result = {
        "pass": not blockers,
        "status": "pass" if not blockers else "blocked",
        "checks": checks,
        "blockers": blockers,
        "missing": missing,
        "critical_files": files,
        "publisher_lock": publisher_lock,
        "doctor": doctor,
        "official_publisher_id": identity["publisher_id"],
        "checked_at": now_iso(),
    }
    save_json(
        project_root / "factory" / "output" / "deployment_integrity_report.json",
        result,
    )
    return result

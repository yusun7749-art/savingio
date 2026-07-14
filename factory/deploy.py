from pathlib import Path
from .deployment_integrity import verify_deployment_integrity


def deployment_status(project_root: Path) -> dict:
    project_root = project_root.resolve()
    integrity = verify_deployment_integrity(project_root, repair=False)
    safe = bool(integrity.get("pass"))
    return {
        "provider": "Cloudflare Pages",
        "mode": "git_push_auto_deploy",
        "git_connected": (project_root / ".git").exists(),
        "manual_deploy_required": False,
        "safe_to_deploy": safe,
        "publisher_lock": integrity.get("publisher_lock"),
        "doctor": integrity.get("doctor"),
        "integrity": integrity,
        "instruction": (
            "V2.044 Deployment Release Integrity PASS. 선택 커밋 후 Cloudflare Pages 자동 배포."
            if safe else
            "V2.044 Deployment Release Integrity FAIL. Git push와 배포가 차단되었습니다."
        ),
    }

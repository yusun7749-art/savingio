from __future__ import annotations

import json
import shutil
import tempfile
from pathlib import Path

from .core_factory_runner import run_core_factory
from .utils import now_iso, save_json

REPORT_PATH = Path("factory/output/runner_integration_audit.json")
TOPIC = "Factory Runner 통합 검사"


def _ignore(_path: str, names: list[str]) -> set[str]:
    ignored = {".git", ".pytest_cache", "__pycache__"}
    if "output" in names:
        ignored.add("output")
    return ignored


def _evidence_payload() -> dict:
    return {
        "evidence": [
            {
                "source_name": "정부24",
                "url": "https://www.gov.kr/portal/main/nologin",
                "claim": "정부24는 대한민국 정부의 공식 민원 및 행정정보 포털이다.",
                "excerpt": "공식 서비스 안내와 행정정보를 확인할 수 있는 정부 대표 포털이다.",
                "published_at": "2026-07-01",
                "verified": True,
            },
            {
                "source_name": "국가법령정보센터",
                "url": "https://www.law.go.kr/",
                "claim": "국가법령정보센터는 현행 법령과 행정규칙을 제공하는 공식 서비스다.",
                "excerpt": "법령의 원문과 시행일, 개정 이력을 공식적으로 조회할 수 있다.",
                "published_at": "2026-07-01",
                "verified": True,
            },
        ]
    }


def run_audit(project_root: Path) -> dict:
    project_root = project_root.resolve()
    with tempfile.TemporaryDirectory(prefix="savingio-runner-audit-") as temp_dir:
        sandbox = Path(temp_dir) / "savingio-live"
        shutil.copytree(project_root, sandbox, ignore=_ignore)

        evidence_path = sandbox / "factory" / "output" / "audit_evidence.json"
        evidence_path.parent.mkdir(parents=True, exist_ok=True)
        evidence_path.write_text(
            json.dumps(_evidence_payload(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        result = run_core_factory(
            sandbox,
            [TOPIC],
            evidence_files=[evidence_path],
            limit=1,
        )
        stages = [
            {
                "name": stage.get("name"),
                "pass": bool(stage.get("pass")),
                "status": stage.get("status"),
            }
            for stage in result.get("stages", [])
        ]
        article_paths = [str(path) for path in result.get("article_paths", []) if path]
        verified_articles = [
            path for path in article_paths
            if (sandbox / path).is_file() and (sandbox / path).stat().st_size > 0
        ]
        passed = bool(result.get("pass")) and len(verified_articles) == len(article_paths) and bool(article_paths)
        report = {
            "status": "passed" if passed else "failed",
            "pass": passed,
            "mode": "isolated_manager_executor_integration",
            "topic": TOPIC,
            "stages": stages,
            "blocked_stage": result.get("blocked_stage"),
            "article_paths": article_paths,
            "verified_articles": verified_articles,
            "created_at": now_iso(),
        }

    save_json(project_root / REPORT_PATH, report)
    return report


def main() -> int:
    root = Path.cwd()
    report = run_audit(root)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report["pass"] else 2


if __name__ == "__main__":
    raise SystemExit(main())

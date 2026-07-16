from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Callable

from .calculator_hq_batch import run_calculator_batch
from .cms_hq import run_cms_queue
from .core_completion import audit_core_departments
from .image_hq import run_image_queue
from .planning_hq import create_plan
from .qa1_hq import run_qa1_queue
from .qa2_hq import run_qa2_queue
from .research_hq import run_research_queue
from .seo_hq import run_seo_queue
from .utils import now_iso, save_json
from .writer_hq import run_writer_queue

REPORT_PATH = Path("factory/output/core_automation/core_automation_report.json")


def _require_pass(stage: str, report: dict) -> None:
    if not report.get("pass", False):
        failures = report.get("failures") or report.get("departments") or []
        raise RuntimeError(f"{stage} failed: {failures}")


def run_factory_core(
    root: Path,
    *,
    count: int = 1,
    topics: list[str] | None = None,
    publish_to_cms: bool = True,
) -> dict:
    """Run the full internal Factory chain without Git/Cloudflare/release actions."""
    root = root.resolve()
    if count < 1:
        raise ValueError("count must be at least 1")

    stages: list[dict] = []

    contracts = audit_core_departments(root)
    _require_pass("core_contracts", contracts)
    stages.append({"stage": "core_contracts", "report": contracts})

    planning = create_plan(root, count=count, topics=topics)
    _require_pass("planning", planning)
    stages.append({"stage": "planning", "report": planning})

    research = run_research_queue(root, limit=count)
    _require_pass("research", research)
    stages.append({"stage": "research", "report": research})

    writer = run_writer_queue(root, limit=count)
    _require_pass("writer", writer)
    stages.append({"stage": "writer", "report": writer})

    seo = run_seo_queue(root, limit=count)
    _require_pass("seo", seo)
    stages.append({"stage": "seo", "report": seo})

    calculator = run_calculator_batch(root, limit=count, source_items=seo["items"])
    _require_pass("calculator", calculator)
    stages.append({"stage": "calculator", "report": calculator})

    image = run_image_queue(root, limit=count, source_items=calculator["items"])
    _require_pass("image", image)
    stages.append({"stage": "image", "report": image})

    qa1 = run_qa1_queue(root, limit=count, source_items=image["items"])
    _require_pass("qa1", qa1)
    stages.append({"stage": "qa1", "report": qa1})

    qa2 = run_qa2_queue(root, limit=count, source_items=qa1["items"])
    _require_pass("qa2", qa2)
    stages.append({"stage": "qa2", "report": qa2})

    cms = None
    if publish_to_cms:
        approved = [item for item in qa2["items"] if item.get("qa2_pass")]
        if len(approved) != count:
            raise RuntimeError(f"cms blocked: approved={len(approved)} requested={count}")
        cms = run_cms_queue(root, limit=count, source_items=approved)
        _require_pass("cms", cms)
        stages.append({"stage": "cms", "report": cms})

    report = {
        "factory_version": "V3.011",
        "mode": "factory_core_automation",
        "created_at": now_iso(),
        "requested_count": count,
        "completed_count": len((cms or qa2).get("items", [])),
        "publish_to_cms": publish_to_cms,
        "external_release_executed": False,
        "git_executed": False,
        "cloudflare_executed": False,
        "stage_count": len(stages),
        "stages": [
            {
                "stage": item["stage"],
                "pass": bool(item["report"].get("pass")),
                "status": item["report"].get("status", "completed"),
                "completed_count": item["report"].get("completed_count", item["report"].get("passed_count")),
                "failed_count": item["report"].get("failed_count", 0),
            }
            for item in stages
        ],
        "articles": [
            {
                "topic": item.get("topic"),
                "slug": item.get("slug"),
                "article_path": item.get("article_path"),
                "image_status": item.get("image_status"),
                "qa2_pass": item.get("qa2_pass"),
            }
            for item in (cms or qa2).get("items", [])
        ],
        "pass": all(bool(item["report"].get("pass")) for item in stages),
    }
    save_json(root / REPORT_PATH, report)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Savingio Factory core automation")
    parser.add_argument("--root", default=".")
    parser.add_argument("--count", type=int, default=1)
    parser.add_argument("--topic", action="append", dest="topics")
    parser.add_argument("--no-cms", action="store_true")
    args = parser.parse_args()

    result = run_factory_core(
        Path(args.root),
        count=args.count,
        topics=args.topics,
        publish_to_cms=not args.no_cms,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

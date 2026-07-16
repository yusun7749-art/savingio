from __future__ import annotations

import json
import traceback
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable

from .orchestrator import Orchestrator
from .pipeline import execute
from .planner import build_plan
from .utils import now_iso, save_json


@dataclass(frozen=True)
class AutomationOptions:
    publish: bool = False
    overwrite: bool = False
    stage: bool = True
    continue_on_error: bool = True
    max_items: int = 100


class FactoryAutomationProgram:
    """One entry point for planning, queueing, executing and resuming Factory work."""

    def __init__(self, project_root: Path):
        self.project_root = Path(project_root).resolve()
        self.factory_dir = self.project_root / "factory"
        self.config_dir = self.factory_dir / "config"
        self.output_dir = self.factory_dir / "output" / "automation"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.checkpoint_path = self.output_dir / "checkpoint.json"

    def preflight(self) -> dict:
        required = [
            self.project_root / "articles",
            self.project_root / "calculators",
            self.factory_dir,
            self.config_dir / "article_types.json",
            self.config_dir / "article_dna.json",
            self.config_dir / "qa_rules.json",
            self.config_dir / "adsense_identity.json",
        ]
        missing = [str(path.relative_to(self.project_root)) for path in required if not path.exists()]
        nested_house = self.project_root / "savingio-live"
        result = {
            "pass": not missing,
            "missing": missing,
            "nested_house_detected": nested_house.is_dir(),
            "publisher_identity_present": (self.config_dir / "adsense_identity.json").exists(),
            "checked_at": now_iso(),
        }
        save_json(self.output_dir / "preflight.json", result)
        return result

    @staticmethod
    def normalize_topics(topics: Iterable[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for raw in topics:
            topic = " ".join(str(raw).split()).strip()
            if not topic or topic.startswith("#"):
                continue
            key = topic.casefold()
            if key not in seen:
                normalized.append(topic)
                seen.add(key)
        return normalized

    def topics_from_file(self, path: Path) -> list[str]:
        path = Path(path)
        if not path.is_absolute():
            path = self.project_root / path
        if not path.exists():
            raise FileNotFoundError(path)
        if path.suffix.lower() == ".json":
            payload = json.loads(path.read_text(encoding="utf-8-sig"))
            if isinstance(payload, dict):
                payload = payload.get("topics", [])
            if not isinstance(payload, list):
                raise ValueError("JSON topic file must contain a list or {'topics': [...]}.")
            return self.normalize_topics(str(item) for item in payload)
        return self.normalize_topics(path.read_text(encoding="utf-8-sig").splitlines())

    def plan(self, topics: Iterable[str]) -> dict:
        normalized = self.normalize_topics(topics)
        plans = [build_plan(topic, self.config_dir) for topic in normalized]
        result = {"count": len(plans), "plans": plans, "created_at": now_iso()}
        save_json(self.output_dir / "batch_plan.json", result)
        return result

    def enqueue(self, topics: Iterable[str], priority: int = 50) -> dict:
        orchestrator = Orchestrator(self.project_root)
        queued = [orchestrator.enqueue(topic, priority=priority) for topic in self.normalize_topics(topics)]
        result = {"queued": len(queued), "items": queued, "created_at": now_iso()}
        save_json(self.output_dir / "queue_result.json", result)
        return result

    def run_batch(self, topics: Iterable[str], options: AutomationOptions | None = None) -> dict:
        options = options or AutomationOptions()
        preflight = self.preflight()
        if not preflight["pass"]:
            raise RuntimeError(f"Factory preflight failed: {preflight['missing']}")

        normalized = self.normalize_topics(topics)[: options.max_items]
        checkpoint = self._load_checkpoint()
        completed_topics = set(checkpoint.get("completed_topics", []))
        results: list[dict] = []

        for topic in normalized:
            if topic in completed_topics:
                results.append({"topic": topic, "status": "skipped_completed"})
                continue
            try:
                result = execute(
                    topic,
                    self.project_root,
                    publish=options.publish,
                    overwrite=options.overwrite,
                    stage=options.stage,
                )
                qa = result.get("qa") or {}
                publish_ready = bool(result.get("publish_ready"))
                published = bool(result.get("published"))
                if not qa.get("pass"):
                    status = "qa_failed"
                elif options.publish and not publish_ready:
                    status = "draft_review_required"
                else:
                    status = "published" if published else "completed"
                results.append({
                    "topic": topic,
                    "status": status,
                    "qa_score": qa.get("score"),
                    "article_path": (result.get("cms") or {}).get("article_path"),
                    "published_article_path": (result.get("published") or {}).get("article_path"),
                    "research_status": (result.get("research") or {}).get("research_status"),
                })
                if status in {"completed", "published", "draft_review_required"}:
                    completed_topics.add(topic)
                self._save_checkpoint(completed_topics, results)
                if status != "completed" and not options.continue_on_error:
                    break
            except Exception as exc:  # persisted for deterministic resume
                results.append({
                    "topic": topic,
                    "status": "error",
                    "error": str(exc),
                    "traceback": traceback.format_exc(),
                })
                self._save_checkpoint(completed_topics, results)
                if not options.continue_on_error:
                    break

        summary = {
            "options": asdict(options),
            "requested": len(normalized),
            "completed": sum(item["status"] in {"completed", "published"} for item in results),
            "published": sum(item["status"] == "published" for item in results),
            "review_required": sum(item["status"] == "draft_review_required" for item in results),
            "failed": sum(item["status"] in {"error", "qa_failed"} for item in results),
            "skipped": sum(item["status"] == "skipped_completed" for item in results),
            "results": results,
            "finished_at": now_iso(),
        }
        save_json(self.output_dir / "last_batch_run.json", summary)
        return summary

    def run_queue(self, options: AutomationOptions | None = None) -> list[dict]:
        options = options or AutomationOptions()
        preflight = self.preflight()
        if not preflight["pass"]:
            raise RuntimeError(f"Factory preflight failed: {preflight['missing']}")
        return Orchestrator(self.project_root).run_until_empty(
            publish=options.publish,
            limit=options.max_items,
        )

    def reset_checkpoint(self) -> None:
        if self.checkpoint_path.exists():
            self.checkpoint_path.unlink()

    def _load_checkpoint(self) -> dict:
        if not self.checkpoint_path.exists():
            return {"completed_topics": []}
        try:
            return json.loads(self.checkpoint_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {"completed_topics": []}

    def _save_checkpoint(self, completed_topics: set[str], results: list[dict]) -> None:
        save_json(self.checkpoint_path, {
            "completed_topics": sorted(completed_topics),
            "last_results": results[-20:],
            "updated_at": now_iso(),
        })

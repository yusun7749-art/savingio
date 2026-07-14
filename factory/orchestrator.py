from __future__ import annotations
from pathlib import Path
import traceback
from .pipeline import execute
from .state_db import (
    add_queue_item, fetch_next_queue_item, update_queue_item,
    record_run_start, record_run_finish, get_state, move_to_dead_letter, list_dead_letter
)

class Orchestrator:
    def __init__(self, project_root: Path, max_attempts: int = 3):
        self.project_root = project_root.resolve()
        self.db_path = self.project_root / "factory" / "state" / "factory.sqlite3"
        self.max_attempts = int(max_attempts)

    def enqueue(self, topic: str, priority: int = 50):
        return add_queue_item(self.db_path, topic, priority)

    def run_once(self, publish: bool = False):
        item = fetch_next_queue_item(self.db_path)
        if not item:
            return {"status": "idle", "message": "대기 중인 작업이 없습니다."}
        update_queue_item(self.db_path, item["id"], "running", increment_attempt=True)
        run_id = record_run_start(self.db_path, item["topic"])
        try:
            result = execute(item["topic"], self.project_root, publish=publish)
            article_path = (result.get("cms") or {}).get("article_path")
            status = "completed" if result["qa"]["pass"] else "rejected"
            update_queue_item(self.db_path, item["id"], status)
            record_run_finish(
                self.db_path, run_id, status,
                qa_score=result["qa"]["score"],
                article_path=article_path,
                payload=result,
            )
            return {"status": status, "queue_item": item, "result": result}
        except Exception as e:
            payload = {"error": str(e), "traceback": traceback.format_exc()}
            attempts = int(item.get("attempts", 0)) + 1
            if attempts >= self.max_attempts:
                move_to_dead_letter(self.db_path, {**item, "attempts": attempts}, str(e))
                status = "dead_letter"
            else:
                update_queue_item(self.db_path, item["id"], "pending")
                status = "retry"
            record_run_finish(self.db_path, run_id, status, payload=payload)
            return {"status": status, "queue_item": item, "error": str(e), "attempts": attempts}

    def run_until_empty(self, publish: bool = False, limit: int = 100):
        results = []
        for _ in range(limit):
            result = self.run_once(publish=publish)
            results.append(result)
            if result["status"] == "idle":
                break
        return results

    def state(self):
        return get_state(self.db_path)

    def dead_letters(self, limit: int = 100):
        return list_dead_letter(self.db_path, limit)

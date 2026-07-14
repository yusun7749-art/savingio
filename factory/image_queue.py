from __future__ import annotations
from pathlib import Path
import json, uuid
from .utils import save_json, now_iso

class ImageQueue:
    def __init__(self, project_root: Path):
        self.root = project_root/"factory"/"state"/"image_queue"
        self.pending_dir = self.root/"pending"
        self.done_dir = self.root/"done"
        self.failed_dir = self.root/"failed"
        for d in (self.pending_dir,self.done_dir,self.failed_dir):
            d.mkdir(parents=True, exist_ok=True)

    def enqueue(self, brief: dict) -> dict:
        job = {
            "job_id": uuid.uuid4().hex,
            "status":"pending",
            "attempts":0,
            "brief":brief,
            "created_at":now_iso(),
            "updated_at":now_iso(),
        }
        save_json(self.pending_dir/f"{job['job_id']}.json", job)
        return job

    def list_pending(self) -> list[dict]:
        return [json.loads(p.read_text(encoding="utf-8")) for p in sorted(self.pending_dir.glob("*.json"))]

    def complete(self, job_id: str, files: list[str]) -> dict:
        source = self.pending_dir/f"{job_id}.json"
        if not source.exists():
            raise FileNotFoundError(source)
        job = json.loads(source.read_text(encoding="utf-8"))
        job.update({"status":"completed","files":files,"updated_at":now_iso()})
        save_json(self.done_dir/source.name, job)
        source.unlink()
        return job

    def fail(self, job_id: str, error: str) -> dict:
        source = self.pending_dir/f"{job_id}.json"
        if not source.exists():
            raise FileNotFoundError(source)
        job = json.loads(source.read_text(encoding="utf-8"))
        job["attempts"] = int(job.get("attempts",0))+1
        job.update({"status":"failed","error":error,"updated_at":now_iso()})
        save_json(self.failed_dir/source.name, job)
        source.unlink()
        return job

    def summary(self) -> dict:
        return {
            "pending":len(list(self.pending_dir.glob("*.json"))),
            "completed":len(list(self.done_dir.glob("*.json"))),
            "failed":len(list(self.failed_dir.glob("*.json"))),
            "updated_at":now_iso(),
        }

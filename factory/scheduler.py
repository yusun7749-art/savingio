from __future__ import annotations
from pathlib import Path
from .orchestrator import Orchestrator

def enqueue_many(project_root: Path, topics: list[str], base_priority: int = 50):
    orch = Orchestrator(project_root)
    ids = []
    for i, topic in enumerate(topics):
        topic = topic.strip()
        if topic:
            ids.append(orch.enqueue(topic, max(1, base_priority - i)))
    return ids

def run_batch(project_root: Path, publish: bool = False, limit: int = 100):
    orch = Orchestrator(project_root)
    return orch.run_until_empty(publish=publish, limit=limit)

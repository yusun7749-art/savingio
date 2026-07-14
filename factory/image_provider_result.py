from __future__ import annotations
from pathlib import Path
import json
from .image_queue import ImageQueue
from .image_result_linker import register_image_results
from .utils import save_json, now_iso

def register_provider_result(
    project_root: Path,
    job_id: str,
    slug: str,
    files: list[Path],
    roles: list[str],
) -> dict:
    manifest = register_image_results(project_root, slug, files, roles)
    queue = ImageQueue(project_root)
    queue_result = queue.complete(job_id, [x["path"] for x in manifest["generated_files"]])
    result = {
        "status":"completed",
        "job_id":job_id,
        "manifest":manifest,
        "queue":queue_result,
        "created_at":now_iso(),
    }
    save_json(project_root/"factory"/"output"/"image_provider_result.json",result)
    return result

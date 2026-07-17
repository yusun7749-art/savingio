from __future__ import annotations
from pathlib import Path
import json
from .image_queue import ImageQueue
from .image_result_linker import inject_images_into_html, register_image_results
from .utils import save_json, now_iso


def _load_object(path: Path) -> dict:
    if not path.is_file():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        return payload if isinstance(payload, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def _find_image_item(project_root: Path, job_id: str, slug: str) -> dict:
    candidates = [
        project_root / "factory/output/image/image_hq_report.json",
        project_root / "factory/output/image/qa1_queue.json",
    ]
    for path in candidates:
        payload = _load_object(path)
        groups = [payload.get("items", [])]
        groups.extend(payload.get(key, []) for key in ("pending", "completed"))
        for group in groups:
            if not isinstance(group, list):
                continue
            for item in group:
                if not isinstance(item, dict):
                    continue
                if str(item.get("image_job_id", "")) == job_id or str(item.get("slug", "")) == slug:
                    return dict(item)
    return {}


def _inject_registered_images(project_root: Path, item: dict, slug: str, manifest: dict) -> list[str]:
    candidates = {
        str(item.get("draft_path", "")).strip(),
        str(item.get("writer_archive_path", "")).strip(),
        f"articles/{slug}.html",
    }
    updated: list[str] = []
    for relative in sorted(value for value in candidates if value):
        path = project_root / relative
        if not path.is_file():
            continue
        original = path.read_text(encoding="utf-8")
        rendered = inject_images_into_html(original, manifest)
        if rendered != original:
            path.write_text(rendered, encoding="utf-8")
        updated.append(relative)
    return updated


def _update_image_brief(project_root: Path, item: dict, manifest: dict) -> str | None:
    relative = str(item.get("image_brief_path", "")).strip()
    if not relative:
        return None
    path = project_root / relative
    payload = _load_object(path)
    if not payload:
        return None
    payload.update({
        "status": "completed",
        "generated_files": manifest.get("generated_files", []),
        "requires_external_image_generation": False,
        "completed_at": now_iso(),
    })
    save_json(path, payload)
    return relative


def _continue_content_pipeline(project_root: Path, item: dict, manifest: dict) -> dict:
    if not item or not manifest.get("ready"):
        return {"status": "not_available", "pass": False}

    ready_item = {
        **item,
        "image_job_status": "completed",
        "image_ready": True,
        "image_status": "ready",
        "requires_external_image_generation": False,
        "image_manifest_path": "factory/output/image_manifest.json",
    }
    from .qa1_hq import run_qa1_queue
    from .qa2_hq import run_qa2_queue
    from .cms_hq import run_cms_queue

    qa1 = run_qa1_queue(project_root, source_items=[ready_item], limit=1)
    qa2 = run_qa2_queue(project_root, source_items=list(qa1.get("items", [])), limit=1)
    cms_items = list(qa2.get("items", []))
    cms = run_cms_queue(
        project_root,
        source_items=cms_items,
        limit=1,
        overwrite=(project_root / "articles" / f"{ready_item['slug']}.html").exists(),
    )
    passed = bool(qa1.get("pass") and qa2.get("pass") and cms.get("pass"))
    return {
        "status": "completed" if passed else "failed",
        "pass": passed,
        "qa1_pass": bool(qa1.get("pass")),
        "qa2_pass": bool(qa2.get("pass")),
        "cms_pass": bool(cms.get("pass")),
        "release_status": (
            cms.get("items", [{}])[0].get("release_status")
            if cms.get("items") else None
        ),
    }

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
    item = _find_image_item(project_root, job_id, slug)
    injected_paths = _inject_registered_images(project_root, item, slug, manifest)
    brief_path = _update_image_brief(project_root, item, manifest)
    pipeline = _continue_content_pipeline(project_root, item, manifest)
    result = {
        "status":"completed",
        "job_id":job_id,
        "manifest":manifest,
        "queue":queue_result,
        "injected_paths":injected_paths,
        "image_brief_path":brief_path,
        "pipeline":pipeline,
        "created_at":now_iso(),
    }
    save_json(project_root/"factory"/"output"/"image_provider_result.json",result)
    return result

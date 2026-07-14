from __future__ import annotations
from pathlib import Path
import hashlib, json, secrets, shutil
from datetime import datetime, timezone
from .utils import atomic_write, save_json, now_iso, relative_posix
from .adsense_manager import load_identity, ensure_html_adsense_identity, run_adsense_lock

def _hash(text: str):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def stage_package(project_root: Path, seo: dict, html: str, qa: dict, research: dict,
                  duplicate_report: dict, dna_version: str):
    if not qa.get("pass"):
        raise RuntimeError("QA 미통과 문서는 스테이징할 수 없습니다.")
    stage_dir = project_root/"factory"/"output"/"staging"/seo["slug"]
    stage_dir.mkdir(parents=True, exist_ok=True)
    article = stage_dir/"article.html"
    atomic_write(article, html)
    token = secrets.token_urlsafe(18)
    manifest = {
        "slug": seo["slug"], "title": seo["title"], "canonical": seo["canonical"],
        "qa_score": qa["score"], "evidence_score": research.get("evidence_score",0),
        "ready_for_publish": bool(research.get("ready_for_publish")),
        "duplicate_blocked": bool(duplicate_report.get("duplicate")),
        "content_hash": _hash(html), "dna_version": dna_version,
        "approval_token": token, "status": "staged", "created_at": now_iso(),
        "article_path": relative_posix(article, project_root),
    }
    save_json(stage_dir/"manifest.json", manifest)
    return manifest

def approve_package(project_root: Path, slug: str, token: str, note: str=""):
    stage_dir = project_root/"factory"/"output"/"staging"/slug
    manifest_path = stage_dir/"manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(manifest_path)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if token != manifest.get("approval_token"):
        raise PermissionError("승인 토큰이 일치하지 않습니다.")
    manifest["status"] = "approved"
    manifest["approval_note"] = note
    manifest["approved_at"] = now_iso()
    save_json(manifest_path, manifest)
    return manifest

def publish_approved(project_root: Path, slug: str, token: str, overwrite: bool=False):
    stage_dir = project_root/"factory"/"output"/"staging"/slug
    manifest_path = stage_dir/"manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("status") != "approved":
        raise RuntimeError("승인되지 않은 패키지는 발행할 수 없습니다.")
    if token != manifest.get("approval_token"):
        raise PermissionError("승인 토큰이 일치하지 않습니다.")
    if not manifest.get("ready_for_publish"):
        raise RuntimeError("공식 근거 점수가 부족하여 발행이 차단되었습니다.")
    if manifest.get("duplicate_blocked"):
        raise RuntimeError("중복 문서 후보가 있어 발행이 차단되었습니다.")
    src = project_root/manifest["article_path"]
    target = project_root/"articles"/f"{slug}.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and not overwrite:
        raise FileExistsError(target)
    pre_lock = run_adsense_lock(project_root, execute_repair=True, block_on_error=True)
    if not pre_lock.get("pass"):
        raise RuntimeError(f"Publisher LOCK failed before publish: {pre_lock.get('blockers', [])}")
    identity = load_identity(project_root)
    html = ensure_html_adsense_identity(src.read_text(encoding="utf-8"), identity)
    atomic_write(target, html)
    post_lock = run_adsense_lock(project_root, execute_repair=True, block_on_error=True)
    if not post_lock.get("pass"):
        raise RuntimeError(f"Publisher LOCK failed after publish: {post_lock.get('blockers', [])}")
    manifest["publisher_lock"] = {"pre": pre_lock, "post": post_lock}
    manifest["status"] = "published"
    manifest["published_at"] = now_iso()
    manifest["published_path"] = relative_posix(target, project_root)
    save_json(manifest_path, manifest)
    return manifest

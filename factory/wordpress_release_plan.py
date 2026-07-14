from __future__ import annotations
from pathlib import Path
import json
from .wordpress_connector import WordPressConnector
from .wordpress_taxonomy import find_or_create_term
from .wordpress_upsert import upsert_post
from .publish_package import build_publish_package
from .deployment_gate import evaluate_deployment_gate
from .utils import save_json, now_iso

def build_wordpress_release_plan(
    project_root: Path,
    categories: list[str] | None = None,
    tags: list[str] | None = None,
) -> dict:
    package = build_publish_package(project_root)
    return {
        "title": package["title"],
        "slug": package["slug"],
        "status": "draft",
        "categories": categories or [],
        "tags": tags or [],
        "has_hero": any(x.get("role") == "hero" for x in package.get("image_manifest", {}).get("generated_files", [])),
        "created_at": now_iso(),
    }

def execute_wordpress_release(
    project_root: Path,
    *,
    categories: list[str] | None = None,
    tags: list[str] | None = None,
    status: str = "draft",
    execute: bool = False,
) -> dict:
    gate = evaluate_deployment_gate(project_root)
    if not gate["pass"]:
        result = {"status":"blocked","reason":"deployment_gate_failed","gate":gate,"created_at":now_iso()}
        save_json(project_root/"factory"/"output"/"wordpress_release_report.json",result)
        return result

    package = build_publish_package(project_root)
    plan = build_wordpress_release_plan(project_root, categories, tags)
    try:
        connector = WordPressConnector.from_env()
    except RuntimeError as exc:
        result = {
            "status":"blocked","reason":"wordpress_not_configured","error":str(exc),
            "required_env":["WORDPRESS_URL","WORDPRESS_USER","WORDPRESS_APP_PASSWORD"],
            "plan":plan,"created_at":now_iso()
        }
        save_json(project_root/"factory"/"output"/"wordpress_release_report.json",result)
        return result

    if not execute:
        result = {"status":"dry_run","plan":plan,"connector":connector.readiness(),"created_at":now_iso()}
        save_json(project_root/"factory"/"output"/"wordpress_release_report.json",result)
        return result

    category_ids = []
    for name in categories or []:
        term = find_or_create_term(connector, "category", name, create=True)
        if term.get("id"):
            category_ids.append(int(term["id"]))

    tag_ids = []
    for name in tags or []:
        term = find_or_create_term(connector, "tag", name, create=True)
        if term.get("id"):
            tag_ids.append(int(term["id"]))

    featured_media = None
    hero = next((x for x in package.get("image_manifest",{}).get("generated_files",[]) if x.get("role")=="hero"), None)
    media_result = None
    if hero:
        media_result = connector.upload_media(project_root/hero["path"], title=package["title"], alt_text=package["title"])
        if media_result.get("status") == "ok":
            featured_media = (media_result.get("payload") or {}).get("id")

    post = upsert_post(
        connector, package["title"], package["html"], package["slug"],
        status=status, category_ids=category_ids, tag_ids=tag_ids,
        featured_media=featured_media
    )
    result = {
        "status":"completed" if post.get("status")=="ok" else "failed",
        "post":post,"media":media_result,"plan":plan,"created_at":now_iso()
    }
    save_json(project_root/"factory"/"output"/"wordpress_release_report.json",result)
    return result

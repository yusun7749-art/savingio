from __future__ import annotations
from pathlib import Path
from .cloudflare_health_check import check_site
from .utils import save_json, now_iso

def verify_deployed_site(
    project_root: Path,
    base_url: str,
    *,
    article_path: str | None = None,
) -> dict:
    paths = ["/","/articles/","/robots.txt","/sitemap.xml"]
    if article_path:
        value = "/" + article_path.lstrip("/")
        if value not in paths:
            paths.append(value)
    health = check_site(base_url, paths)
    result = {
        "pass":health["pass"],
        "base_url":base_url,
        "paths":paths,
        "health":health,
        "verified_at":now_iso(),
    }
    save_json(project_root/"factory"/"output"/"post_deploy_verification.json",result)
    return result

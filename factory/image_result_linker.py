from __future__ import annotations
from pathlib import Path
import json, shutil
from .utils import save_json, now_iso

ALLOWED_EXTENSIONS = {".png",".jpg",".jpeg",".webp"}

def _validate_image(path: Path) -> None:
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(path)
    if path.suffix.lower() not in ALLOWED_EXTENSIONS:
        raise ValueError(f"지원하지 않는 이미지 형식: {path.suffix}")
    if path.stat().st_size <= 0:
        raise ValueError(f"빈 이미지 파일: {path}")

def register_image_results(
    project_root: Path,
    slug: str,
    files: list[Path],
    roles: list[str] | None = None,
) -> dict:
    roles = roles or ["hero","og","infographic"][:len(files)]
    if len(roles) != len(files):
        raise ValueError("roles와 files 개수가 다릅니다.")
    target_dir = project_root/"images"/"generated"/slug
    target_dir.mkdir(parents=True, exist_ok=True)
    registered = []
    for role, source in zip(roles, files):
        _validate_image(source)
        target = target_dir/f"{role}{source.suffix.lower()}"
        shutil.copy2(source,target)
        registered.append({
            "role":role,
            "path":target.relative_to(project_root).as_posix(),
            "bytes":target.stat().st_size,
        })
    manifest = {
        "slug":slug,
        "ready":any(x["role"]=="hero" for x in registered) and len(registered)>=2,
        "generated_files":registered,
        "registered_at":now_iso(),
    }
    save_json(project_root/"factory"/"output"/"image_manifest.json",manifest)
    return manifest

def inject_images_into_html(html: str, manifest: dict) -> str:
    mapping = {x["role"]:x["path"] for x in manifest.get("generated_files",[])}
    if "hero" in mapping and 'data-factory-hero="true"' not in html:
        hero = f'<figure class="article-hero-image" data-factory-hero="true"><img src="/{mapping["hero"]}" alt="" loading="eager"></figure>'
        html = html.replace("</header>", "</header>"+hero, 1)
    if "infographic" in mapping and 'data-factory-infographic="true"' not in html:
        block = f'<figure class="article-infographic" data-factory-infographic="true"><img src="/{mapping["infographic"]}" alt="" loading="lazy"></figure>'
        html = html.replace('<section id="next-action"', block+'<section id="next-action"', 1)
    return html

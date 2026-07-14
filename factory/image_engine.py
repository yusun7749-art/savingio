from __future__ import annotations
from pathlib import Path
from .utils import save_json, now_iso, safe_slug

def build_image_brief(plan: dict, seo: dict, config_dir: Path) -> dict:
    topic = plan["topic"]
    slug = seo["slug"]
    return {
        "status": "brief_ready",
        "topic": topic,
        "slug": slug,
        "hero": {
            "filename": f"{slug}-hero.webp",
            "alt": f"{topic} 핵심 안내 이미지",
            "aspect_ratio": "16:9",
            "prompt": f"{topic}을 설명하는 신뢰감 있는 한국형 생활정보 웹사이트 대표 이미지, 텍스트 최소화",
        },
        "og": {
            "filename": f"{slug}-og.webp",
            "alt": f"{topic} OG 이미지",
            "aspect_ratio": "1200:630",
            "prompt": f"Savingio 브랜드용 {topic} OG 이미지, 정보형, 깔끔한 카드 스타일",
        },
        "infographic": {
            "filename": f"{slug}-summary.webp",
            "alt": f"{topic} 요약 인포그래픽",
            "aspect_ratio": "4:5",
            "prompt": f"{topic} 핵심 조건과 실행 순서를 요약한 인포그래픽",
        },
        "generated_files": [],
        "requires_external_image_generation": True,
        "created_at": now_iso(),
    }

def save_image_manifest(project_root: Path, brief: dict) -> dict:
    manifest = {
        "topic": brief["topic"],
        "slug": brief["slug"],
        "required": [brief["hero"], brief["og"], brief["infographic"]],
        "generated_files": brief.get("generated_files", []),
        "ready": len(brief.get("generated_files", [])) >= 2,
        "requires_external_image_generation": brief.get("requires_external_image_generation", True),
        "created_at": now_iso(),
    }
    save_json(project_root / "factory" / "output" / "image_manifest.json", manifest)
    return manifest

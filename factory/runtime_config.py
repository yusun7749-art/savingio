from __future__ import annotations
from pathlib import Path
from .utils import now_iso

ENV_KEYS = [
    "WORDPRESS_URL",
    "WORDPRESS_USER",
    "WORDPRESS_APP_PASSWORD",
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_PAGES_PROJECT",
    "OPENAI_API_KEY",
    "DATA_GO_KR_API_KEY",
]

def write_env_template(project_root: Path) -> dict:
    path = project_root / "factory" / ".env.example"
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = ["# Savingio Factory runtime configuration"]
    lines.extend(f"{key}=" for key in ENV_KEYS)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return {
        "path": path.relative_to(project_root).as_posix(),
        "keys": ENV_KEYS,
        "created_at": now_iso(),
    }

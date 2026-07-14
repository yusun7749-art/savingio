from __future__ import annotations
from pathlib import Path
from .utils import now_iso

class BaseAdapter:
    name = "base"
    def validate(self, payload: dict) -> dict:
        required = ["title","html","slug"]
        missing = [x for x in required if not payload.get(x)]
        return {"pass": not missing, "missing": missing}

class StaticHtmlAdapter(BaseAdapter):
    name = "savingio-static"
    def prepare(self, project_root: Path, payload: dict) -> dict:
        check = self.validate(payload)
        if not check["pass"]:
            raise ValueError(check["missing"])
        target = project_root / "articles" / f"{payload['slug']}.html"
        return {
            "adapter": self.name,
            "target": target.as_posix(),
            "ready": True,
            "prepared_at": now_iso(),
        }

class WordPressAdapter(BaseAdapter):
    name = "wordpress"
    def prepare(self, project_root: Path, payload: dict) -> dict:
        check = self.validate(payload)
        return {
            "adapter": self.name,
            "ready": check["pass"],
            "missing": check["missing"],
            "requires_credentials": True,
            "required_env": ["WORDPRESS_URL","WORDPRESS_USER","WORDPRESS_APP_PASSWORD"],
            "prepared_at": now_iso(),
        }

class NaverAdapter(BaseAdapter):
    name = "naver-blog"
    def prepare(self, project_root: Path, payload: dict) -> dict:
        check = self.validate(payload)
        return {
            "adapter": self.name,
            "ready": False,
            "missing": check["missing"],
            "requires_browser_automation": True,
            "manual_or_external_connector_required": True,
            "prepared_at": now_iso(),
        }

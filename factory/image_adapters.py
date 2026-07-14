from __future__ import annotations
from pathlib import Path
import os
from .utils import now_iso

class LocalPlaceholderAdapter:
    name = "local-placeholder"
    def generate(self, project_root: Path, brief: dict) -> dict:
        out = project_root/"factory"/"output"/"images"/brief["slug"]
        out.mkdir(parents=True, exist_ok=True)
        manifest = out/"README.txt"
        manifest.write_text(
            "This adapter does not generate an image.\n"
            "It proves queue/adapter/output wiring without faking image generation.\n",
            encoding="utf-8"
        )
        return {
            "adapter":self.name,
            "status":"placeholder_only",
            "generated_files":[],
            "manifest":manifest.relative_to(project_root).as_posix(),
            "created_at":now_iso(),
        }

class OpenAIImageAdapter:
    name = "openai-image"
    def readiness(self) -> dict:
        return {
            "adapter":self.name,
            "ready":bool(os.getenv("OPENAI_API_KEY")),
            "required_env":["OPENAI_API_KEY"],
            "note":"API key present only; network generation is not executed by this package.",
        }

class ConnectorImageAdapter:
    name = "external-connector"
    def readiness(self) -> dict:
        return {
            "adapter":self.name,
            "ready":False,
            "required_connector":"image generation connector",
            "note":"Use the ChatGPT image tool or a configured external provider.",
        }

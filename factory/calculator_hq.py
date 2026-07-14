from __future__ import annotations
from pathlib import Path
from .calculator_registry import load_registry
from .calculator_solution_package import build_solution_package, inject_calculators
from .calculator_cms_registry import register_article_calculators
from .calculator_qa import validate_registry
from .utils import save_json, now_iso

def run_calculator_hq(topic: str, slug: str, project_root: Path, html_path: Path | None=None, execute: bool=False) -> dict:
    package=build_solution_package(topic,slug,project_root)
    cms=register_article_calculators(project_root,package)
    registry=load_registry(project_root/"factory"/"config")
    qa=validate_registry(registry.get("calculators",[]),project_root)
    html_result=None
    if html_path and html_path.exists():
        original=html_path.read_text(encoding="utf-8")
        updated=inject_calculators(original,package)
        changed=updated!=original
        if execute and changed:
            html_path.write_text(updated,encoding="utf-8")
        html_result={"path":str(html_path),"changed":changed,"executed":execute and changed}
    result={
        "status":"completed",
        "topic":topic,
        "slug":slug,
        "package":package,
        "cms":cms,
        "registry_qa":qa,
        "html":html_result,
        "created_at":now_iso(),
    }
    save_json(project_root/"factory"/"output"/"calculator"/f"{slug}-hq-report.json",result)
    return result

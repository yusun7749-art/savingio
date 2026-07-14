from __future__ import annotations
from pathlib import Path
import subprocess
from .utils import now_iso

def _run(project_root: Path, args: list[str]) -> dict:
    proc = subprocess.run(
        args,cwd=project_root,capture_output=True,text=True,check=False
    )
    return {
        "command":args,
        "returncode":proc.returncode,
        "stdout":proc.stdout.strip(),
        "stderr":proc.stderr.strip(),
    }

def validate_git_repository(project_root: Path) -> dict:
    result = _run(project_root,["git","rev-parse","--is-inside-work-tree"])
    return {
        "pass":result["returncode"]==0 and result["stdout"].lower()=="true",
        "detail":result,
    }

def selective_commit(
    project_root: Path,
    files: list[str],
    message: str,
    push: bool=False,
    dry_run: bool=True,
) -> dict:
    clean = [x for x in dict.fromkeys(files) if x and x != "."]
    if not clean:
        raise ValueError("커밋할 선택 파일이 없습니다.")
    if any(x.strip()=="." for x in clean):
        raise ValueError("git add . 사용 금지")
    plan = {
        "files":clean,
        "message":message,
        "push":push,
        "dry_run":dry_run,
        "commands":[
            ["git","add","--",*clean],
            ["git","commit","-m",message],
        ] + ([["git","push"]] if push else []),
        "created_at":now_iso(),
    }
    if dry_run:
        return {"status":"dry_run","plan":plan,"results":[]}
    repo = validate_git_repository(project_root)
    if not repo["pass"]:
        return {"status":"blocked","reason":"not_git_repository","plan":plan,"results":[repo]}
    results = []
    for command in plan["commands"]:
        result = _run(project_root,command)
        results.append(result)
        if result["returncode"] != 0:
            return {"status":"failed","plan":plan,"results":results}
    return {"status":"completed","plan":plan,"results":results}

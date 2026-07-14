from pathlib import Path
from .end_to_end_audit import run_end_to_end_audit
from .regression_manifest import build_regression_manifest
from .final_release_manifest import build_final_release_manifest
from .release_journal import verify_release_journal
from .utils import save_json,now_iso
def run_final_release(root:Path,version="2.037-D"):
    e=run_end_to_end_audit(root); r=build_regression_manifest(root); j=verify_release_journal(root); m=build_final_release_manifest(root,version)
    blockers=[]
    if not e["pass"]: blockers.append("end_to_end_audit")
    if r["missing_count"]>0: blockers.append("locked_paths_missing")
    if not j["pass"]: blockers.append("release_journal")
    if not m["ready"]: blockers.append("final_manifest")
    out={"version":version,"pass":not blockers,"blockers":blockers,"end_to_end":e,"regression":r,"release_journal":j,"manifest":m,"created_at":now_iso()}
    save_json(root/"factory"/"output"/"final_release_report.json",out); return out

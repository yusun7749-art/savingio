from pathlib import Path
import json
from .utils import save_json, now_iso
MODULES=["planner.py","research_department.py","writer.py","seo.py","image_engine.py","qa.py","cms.py","deployment_gate.py","analytics_dashboard.py","revenue_ai.py","revenue_rework_pipeline.py","approved_republish.py"]
OUTPUTS=["factory/output/approval_request.json","factory/output/revenue/revenue_ai_actions.json","factory/output/revenue/cms_rework_manifest.json","factory/output/approved_republish_report.json","factory/output/release_journal.json"]
def run_end_to_end_audit(root:Path):
    checks=[]
    for n in MODULES:
        p=root/"factory"/n; checks.append({"name":"module:"+n,"pass":p.exists() and p.stat().st_size>0})
    for rel in OUTPUTS:
        p=root/rel
        try: json.loads(p.read_text(encoding="utf-8")); ok=True
        except Exception: ok=False
        checks.append({"name":"output:"+rel,"pass":ok})
    result={"pass":all(x["pass"] for x in checks),"checks":checks,"passed_count":sum(x["pass"] for x in checks),"failed_count":sum(not x["pass"] for x in checks),"checked_at":now_iso()}
    save_json(root/"factory"/"output"/"end_to_end_audit.json",result); return result

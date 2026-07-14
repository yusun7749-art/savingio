from pathlib import Path
from .utils import save_json,now_iso
CHECKS=[("planning_engine","planner.py"),("research_engine","research_department.py"),("writer_engine","writer.py"),("seo_engine","seo.py"),("image_engine","image_engine.py"),("qa_engine","qa.py"),("cms_engine","cms.py"),("deploy_engine","approved_republish.py"),("analytics_engine","analytics_dashboard.py"),("revenue_engine","revenue_ai.py"),("rework_engine","revenue_rework_pipeline.py"),("release_audit","final_release_coordinator.py")]
def build_master_checklist(root:Path):
    items=[{"key":k,"module":m,"completed":(root/"factory"/m).exists()} for k,m in CHECKS]
    r={"completed_count":sum(x["completed"] for x in items),"total_count":len(items),"items":items,"created_at":now_iso()}
    save_json(root/"factory"/"output"/"MASTER_CHECKLIST.json",r); return r

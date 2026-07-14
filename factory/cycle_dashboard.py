from pathlib import Path
import json
from .utils import save_json, now_iso
def build_cycle_dashboard(project_root:Path):
    path=project_root/'factory'/'output'/'automation_cycle_report.json'
    report=json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
    rows=[{'department':h['sender'],'receiver':h.get('receiver'),'status':h['status'],'blockers':h.get('blockers',[])} for h in report.get('handoffs',[])]
    result={'workflow_id':report.get('workflow_id'),'topic':report.get('topic'),'status':report.get('status','not_started'),'department_count':len(rows),'departments':rows,'ready_count':sum(x['status']=='ready' for x in rows),'blocked_count':sum(x['status']=='blocked' for x in rows),'created_at':now_iso()}
    save_json(project_root/'factory'/'output'/'cycle_dashboard.json',result); return result

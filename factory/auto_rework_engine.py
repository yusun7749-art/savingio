from pathlib import Path
from .task_dispatcher import TaskDispatcher
from .article_optimization_executor import execute_actions
from .utils import save_json, now_iso
ROUTE={'title_length':'seo','description_length':'seo','canonical':'seo','schema':'seo','internal_links':'seo','text_length':'writing','required_sections':'writing','evidence_safety':'research','image_ready':'image','deployment_gate_failed':'deploy'}
def route_issues(project_root:Path,workflow_id,issues):
    d=TaskDispatcher(project_root); rows=[]
    for issue in issues:
        department=ROUTE.get(issue,'operations')
        try:
            task=d.fail(workflow_id,department,[issue])
            task_status=task['status']
        except FileNotFoundError:
            d.bus.publish('qa_final',department,'task.rework',{'issues':[issue]},workflow_id)
            task_status='queued'
        rows.append({'issue':issue,'department':department,'task_status':task_status})
    result={'workflow_id':workflow_id,'routed_count':len(rows),'items':rows,'created_at':now_iso()}; save_json(project_root/'factory'/'output'/'auto_rework_route.json',result); return result
def execute_analytics_rework(project_root:Path,execute=False): return execute_actions(project_root,execute=execute)

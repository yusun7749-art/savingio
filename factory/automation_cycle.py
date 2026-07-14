from pathlib import Path
import uuid
from .planner import build_plan
from .research_department import run_research_department
from .seo import build_seo
from .writer import generate_article
from .qa import evaluate
from .catalog import write_catalog, related_links
from .image_engine import build_image_brief, save_image_manifest
from .cms import save_article
from .department_handoff import build_handoff, save_handoff
from .department_gate import evaluate_department
from .deployment_gate import evaluate_deployment_gate
from .analytics_dashboard import build_analytics_dashboard
from .content_performance_optimizer import recommend_from_dashboard
from .utils import save_json, now_iso

def _add(root,wid,department,packet,config,handoffs):
    gate=evaluate_department(department,packet,config); h=build_handoff(wid,department,packet,'ready' if gate['pass'] else 'blocked',gate['blockers']); h['gate']=gate; h['path']=save_handoff(root,h); handoffs.append(h); return gate['pass']
def _finish(root,wid,topic,status,handoffs,packets):
    result={'workflow_id':wid,'topic':topic,'status':status,'handoff_count':len(handoffs),'handoffs':handoffs,'packets':packets,'created_at':now_iso()}; save_json(root/'factory'/'output'/'automation_cycle_report.json',result); return result
def run_automation_cycle(topic,project_root:Path,evidence_files=None):
    root=project_root.resolve(); config=root/'factory'/'config'; out=root/'factory'/'output'; wid=uuid.uuid4().hex; h=[]; packets={}
    plan=build_plan(topic,config); packets['planning']=plan
    if not _add(root,wid,'planning',plan,config,h): return _finish(root,wid,topic,'blocked',h,packets)
    research=run_research_department(plan,root,evidence_files or []); packets['research']=research
    if not _add(root,wid,'research',research,config,h): return _finish(root,wid,topic,'blocked',h,packets)
    seo=build_seo(plan,config); catalog=write_catalog(root,out); related=related_links(topic,catalog,limit=5); html=generate_article(plan,research,seo,related=related,config_dir=config)
    writing={'html':html,'text_chars':len(html)}; packets['writing']=writing; _add(root,wid,'writing',writing,config,h)
    packets['seo']=seo; _add(root,wid,'seo',seo,config,h)
    image=save_image_manifest(root,build_image_brief(plan,seo,config)); packets['image']=image; _add(root,wid,'image',image,config,h)
    qp=evaluate(html,plan,research,seo,config); packets['qa_primary']=qp; _add(root,wid,'qa_primary',qp,config,h)
    qf=evaluate(html,plan,research,seo,config); packets['qa_final']=qf; _add(root,wid,'qa_final',qf,config,h)
    cms=save_article(root,seo,html,qf,research,publish=False,overwrite=True); packets['cms']=cms; _add(root,wid,'cms',cms,config,h)
    deploy=evaluate_deployment_gate(root); packets['deploy']=deploy; _add(root,wid,'deploy',deploy,config,h)
    analytics=build_analytics_dashboard(root); packets['analytics']=analytics; _add(root,wid,'analytics',analytics,config,h)
    revenue=recommend_from_dashboard(root); packets['revenue']=revenue; _add(root,wid,'revenue',revenue,config,h)
    status='waiting_user_approval' if all(x['gate']['pass'] for x in h) else 'blocked'
    return _finish(root,wid,topic,status,h,packets)

from __future__ import annotations
from pathlib import Path
from .wordpress_connector import WordPressConnector
from .publish_package import build_publish_package
from .deployment_gate import evaluate_deployment_gate
from .utils import save_json, now_iso

def publish_to_wordpress(project_root:Path,status:str='draft',execute:bool=False):
    gate=evaluate_deployment_gate(project_root)
    if not gate['pass']:
        result={'status':'blocked','reason':'deployment_gate_failed','gate':gate,'created_at':now_iso()}
        save_json(project_root/'factory'/'output'/'wordpress_publish_report.json',result); return result
    package=build_publish_package(project_root)
    try: connector=WordPressConnector.from_env()
    except RuntimeError as e:
        result={'status':'blocked','reason':'wordpress_not_configured','error':str(e),'required_env':['WORDPRESS_URL','WORDPRESS_USER','WORDPRESS_APP_PASSWORD'],'created_at':now_iso()}
        save_json(project_root/'factory'/'output'/'wordpress_publish_report.json',result); return result
    if not execute:
        result={'status':'dry_run','package':{k:v for k,v in package.items() if k!='html'},'created_at':now_iso()}
        save_json(project_root/'factory'/'output'/'wordpress_publish_report.json',result); return result
    post=connector.create_post(package['title'],package['html'],package['slug'],status=status)
    result={'status':'completed' if post.get('status')=='ok' else 'failed','post':post,'created_at':now_iso()}
    save_json(project_root/'factory'/'output'/'wordpress_publish_report.json',result); return result

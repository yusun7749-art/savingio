from __future__ import annotations
from pathlib import Path
from .cloudflare_pages_client import CloudflarePagesClient
from .utils import save_json, now_iso

def verify_latest_deployment(project_root:Path,execute:bool=False):
    try: client=CloudflarePagesClient.from_env()
    except RuntimeError as e:
        result={'status':'blocked','reason':'cloudflare_not_configured','error':str(e),'required_env':['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN','CLOUDFLARE_PAGES_PROJECT'],'created_at':now_iso()}
        save_json(project_root/'factory'/'output'/'cloudflare_verify_report.json',result); return result
    result={'status':'dry_run','project_name':client.project_name,'created_at':now_iso()} if not execute else client.wait_for_latest()
    save_json(project_root/'factory'/'output'/'cloudflare_verify_report.json',result); return result

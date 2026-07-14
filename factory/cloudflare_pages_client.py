from __future__ import annotations
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import json, os, time
from .utils import now_iso

class CloudflarePagesClient:
    def __init__(self,account_id:str,api_token:str,project_name:str,timeout:int=20):
        self.account_id=account_id; self.api_token=api_token; self.project_name=project_name; self.timeout=int(timeout)
        self.base=f'https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project_name}'
    @classmethod
    def from_env(cls):
        names=['CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_API_TOKEN','CLOUDFLARE_PAGES_PROJECT']
        missing=[n for n in names if not os.getenv(n)]
        if missing: raise RuntimeError('missing_env:'+','.join(missing))
        return cls(os.environ[names[0]],os.environ[names[1]],os.environ[names[2]])
    def _get(self,url:str):
        req=Request(url,headers={'Authorization':f'Bearer {self.api_token}','Accept':'application/json','User-Agent':'SavingioFactory/2.030'})
        try:
            with urlopen(req,timeout=self.timeout) as r:
                raw=r.read().decode('utf-8',errors='replace')
                return {'status':'ok','http_status':getattr(r,'status',200),'payload':json.loads(raw) if raw else {},'created_at':now_iso()}
        except (HTTPError,URLError,TimeoutError) as e:
            return {'status':'error','http_status':getattr(e,'code',None),'error':str(e),'created_at':now_iso()}
    def latest_deployment(self):
        result=self._get(self.base+'/deployments?'+urlencode({'per_page':1}))
        items=((result.get('payload') or {}).get('result') or [])
        result['deployment']=items[0] if items else None
        return result
    def wait_for_latest(self,timeout_seconds:int=180,poll_seconds:int=10):
        started=time.time(); history=[]
        while time.time()-started<=timeout_seconds:
            cur=self.latest_deployment(); dep=cur.get('deployment') or {}
            stage=((dep.get('latest_stage') or {}).get('status') or '').lower()
            history.append({'status':stage,'id':dep.get('id'),'checked_at':now_iso()})
            if stage in {'success','failure'}:
                return {'status':stage,'deployment':dep,'history':history,'elapsed_seconds':round(time.time()-started)}
            time.sleep(max(1,int(poll_seconds)))
        return {'status':'timeout','history':history,'elapsed_seconds':round(time.time()-started)}

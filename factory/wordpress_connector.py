from __future__ import annotations
from pathlib import Path
from urllib.parse import urljoin
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import base64, json, mimetypes, os
from .utils import now_iso

class WordPressConnector:
    def __init__(self, base_url:str, username:str, app_password:str, timeout:int=20):
        self.base_url=base_url.rstrip('/')+'/'
        self.username=username
        self.app_password=app_password
        self.timeout=int(timeout)
    @classmethod
    def from_env(cls):
        names=['WORDPRESS_URL','WORDPRESS_USER','WORDPRESS_APP_PASSWORD']
        missing=[n for n in names if not os.getenv(n)]
        if missing: raise RuntimeError('missing_env:'+','.join(missing))
        return cls(os.environ[names[0]],os.environ[names[1]],os.environ[names[2]])
    def _auth_header(self):
        token=f'{self.username}:{self.app_password}'.encode()
        return 'Basic '+base64.b64encode(token).decode()
    def _request(self, method:str, endpoint:str, payload:dict|None=None):
        url=urljoin(self.base_url,endpoint.lstrip('/'))
        data=json.dumps(payload).encode('utf-8') if payload is not None else None
        headers={'Authorization':self._auth_header(),'Accept':'application/json','User-Agent':'SavingioFactory/2.030'}
        if payload is not None: headers['Content-Type']='application/json; charset=utf-8'
        req=Request(url,data=data,headers=headers,method=method)
        try:
            with urlopen(req,timeout=self.timeout) as r:
                raw=r.read().decode(r.headers.get_content_charset() or 'utf-8',errors='replace')
                return {'status':'ok','http_status':getattr(r,'status',200),'payload':json.loads(raw) if raw else {},'created_at':now_iso()}
        except (HTTPError,URLError,TimeoutError) as e:
            return {'status':'error','http_status':getattr(e,'code',None),'error':str(e),'created_at':now_iso()}
    def create_post(self,title:str,html:str,slug:str,status:str='draft',featured_media:int|None=None):
        payload={'title':title,'content':html,'slug':slug,'status':status}
        if featured_media is not None: payload['featured_media']=int(featured_media)
        return self._request('POST','/wp-json/wp/v2/posts',payload)
    def upload_media(self,file_path:Path,title:str='',alt_text:str=''):
        if not file_path.exists() or not file_path.is_file(): raise FileNotFoundError(file_path)
        mime=mimetypes.guess_type(file_path.name)[0] or 'application/octet-stream'
        url=urljoin(self.base_url,'/wp-json/wp/v2/media')
        headers={'Authorization':self._auth_header(),'Content-Disposition':f'attachment; filename="{file_path.name}"','Content-Type':mime,'Accept':'application/json','User-Agent':'SavingioFactory/2.030'}
        req=Request(url,data=file_path.read_bytes(),headers=headers,method='POST')
        try:
            with urlopen(req,timeout=self.timeout) as r:
                raw=r.read().decode('utf-8',errors='replace')
                return {'status':'ok','http_status':getattr(r,'status',201),'payload':json.loads(raw) if raw else {},'created_at':now_iso()}
        except (HTTPError,URLError,TimeoutError) as e:
            return {'status':'error','http_status':getattr(e,'code',None),'error':str(e),'created_at':now_iso()}

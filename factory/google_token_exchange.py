from __future__ import annotations
import base64, json, os, time
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from .utils import now_iso

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('ascii').rstrip('=')

def load_service_account() -> dict:
    raw=os.getenv('GOOGLE_SERVICE_ACCOUNT_JSON','')
    if not raw: raise RuntimeError('missing_env:GOOGLE_SERVICE_ACCOUNT_JSON')
    payload=json.loads(raw)
    missing=[k for k in ['client_email','private_key','token_uri'] if not payload.get(k)]
    if missing: raise RuntimeError('missing_service_account_fields:'+','.join(missing))
    return payload

def build_signed_assertion(scope: str, lifetime_seconds: int=3600) -> dict:
    account=load_service_account(); now=int(time.time())
    header={'alg':'RS256','typ':'JWT'}
    claims={'iss':account['client_email'],'scope':scope,'aud':account['token_uri'],'iat':now,'exp':now+int(lifetime_seconds)}
    signing=_b64url(json.dumps(header,separators=(',',':')).encode())+'.'+_b64url(json.dumps(claims,separators=(',',':')).encode())
    key=serialization.load_pem_private_key(account['private_key'].encode(),password=None)
    sig=key.sign(signing.encode('ascii'),padding.PKCS1v15(),hashes.SHA256())
    return {'assertion':signing+'.'+_b64url(sig),'claims':claims,'token_uri':account['token_uri'],'created_at':now_iso()}

def exchange_access_token(scope: str, execute: bool=False) -> dict:
    try: signed=build_signed_assertion(scope)
    except Exception as exc: return {'status':'blocked','reason':'google_service_account_invalid','error':str(exc),'created_at':now_iso()}
    if not execute: return {'status':'dry_run','token_uri':signed['token_uri'],'claims':signed['claims'],'assertion_length':len(signed['assertion']),'created_at':now_iso()}
    body=urlencode({'grant_type':'urn:ietf:params:oauth:grant-type:jwt-bearer','assertion':signed['assertion']}).encode()
    req=Request(signed['token_uri'],data=body,headers={'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},method='POST')
    try:
        with urlopen(req,timeout=30) as response:
            payload=json.loads(response.read().decode('utf-8'))
            return {'status':'ok','access_token':payload.get('access_token'),'expires_in':payload.get('expires_in'),'token_type':payload.get('token_type'),'created_at':now_iso()}
    except (HTTPError,URLError,TimeoutError) as exc:
        return {'status':'error','http_status':getattr(exc,'code',None),'error':str(exc),'created_at':now_iso()}

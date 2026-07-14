from __future__ import annotations
import os, time
from .google_token_exchange import exchange_access_token
_CACHE={'token':None,'expires_at':0.0}
def get_access_token(scope: str, execute: bool) -> dict:
    manual=os.getenv('GOOGLE_ACCESS_TOKEN')
    if manual: return {'status':'ok','access_token':manual,'source':'environment'}
    if _CACHE['token'] and time.time() < _CACHE['expires_at']-60:
        return {'status':'ok','access_token':_CACHE['token'],'source':'cache'}
    result=exchange_access_token(scope,execute=execute)
    if result.get('status')=='ok' and result.get('access_token'):
        _CACHE['token']=result['access_token']; _CACHE['expires_at']=time.time()+int(result.get('expires_in') or 3600); result['source']='service_account'
    return result

from pathlib import Path
from .utils import load_json, save_json, now_iso

DEFAULT={'version':1,'queue':[],'runs':[],'approvals':{},'updated_at':None}

def load_state(project_root:Path)->dict:
    path=project_root/'factory/output/factory_state.json'
    data=load_json(path,{}) if path.exists() else {}
    merged={**DEFAULT,**data}; merged['queue']=list(merged.get('queue',[])); merged['runs']=list(merged.get('runs',[])); merged['approvals']=dict(merged.get('approvals',{}))
    return merged

def save_state(project_root:Path,state:dict)->dict:
    state=dict(state); state['updated_at']=now_iso(); save_json(project_root/'factory/output/factory_state.json',state); return state

def enqueue(project_root:Path,items:list[dict])->dict:
    state=load_state(project_root); existing={x.get('key') for x in state['queue']}
    for item in items:
        if item.get('key') not in existing:
            state['queue'].append(item); existing.add(item.get('key'))
    return save_state(project_root,state)

def approve(project_root:Path,key:str,note:str='')->dict:
    state=load_state(project_root); state['approvals'][key]={'approved':True,'note':note,'approved_at':now_iso()}; return save_state(project_root,state)

def record_run(project_root:Path,summary:dict)->dict:
    state=load_state(project_root); state['runs'].append(summary); state['runs']=state['runs'][-100:]; return save_state(project_root,state)

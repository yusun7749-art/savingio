from __future__ import annotations
from pathlib import Path
import uuid
from .utils import save_json, now_iso
from .runtime_log_bridge import write_runtime_log

CHAIN=['planning','research','writing','seo','image','qa_primary','qa_final','cms','deploy','analytics','revenue']
def next_department(current):
    if current not in CHAIN: raise ValueError(f'unknown_department:{current}')
    i=CHAIN.index(current); return CHAIN[i+1] if i+1<len(CHAIN) else None

def build_handoff(workflow_id,sender,payload,status='ready',blockers=None):
    return {'handoff_id':uuid.uuid4().hex,'workflow_id':workflow_id,'sender':sender,'receiver':next_department(sender),'status':status,'blockers':blockers or [],'payload':payload,'created_at':now_iso()}

def save_handoff(project_root,handoff):
    path=project_root/'factory'/'output'/'handoffs'/handoff['workflow_id']/f"{handoff['sender']}-to-{handoff.get('receiver') or 'end'}.json"
    save_json(path,handoff)
    if handoff.get('status') == 'blocked':
        write_runtime_log(
            summary=f"{handoff.get('sender')} handoff blocked",
            files='factory/department_handoff.py',
            tests='handoff blocker logging',
            blocker=', '.join(handoff.get('blockers', [])) or 'unknown'
        )
    return path.relative_to(project_root).as_posix()

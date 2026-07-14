from pathlib import Path
from .utils import load_json, now_iso
def evaluate_department(department,packet,config_dir:Path):
    definition=load_json(config_dir/'department_gate_rules.json')['departments'][department]
    blockers=[f for f in definition.get('required_fields',[]) if f not in packet]
    blockers += [f for f in definition.get('truthy_fields',[]) if not packet.get(f)]
    for field,minimum in definition.get('minimums',{}).items():
        if packet.get(field,0)<minimum: blockers.append(f'{field}<{minimum}')
    return {'department':department,'pass':not blockers,'blockers':blockers,'checked_at':now_iso()}

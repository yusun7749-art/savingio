from pathlib import Path
import json
from factory.calculator_generation_engine import generate_calculator, generate_all_calculators, validate_all_generated

def make_project(tmp_path: Path):
    (tmp_path/'factory/config').mkdir(parents=True)
    (tmp_path/'factory/output/calculator').mkdir(parents=True)
    source=Path(__file__).resolve().parents[1]/'config'
    for name in ('calculator_registry.json','calculator_formula_dna.json'):
        (tmp_path/'factory/config'/name).write_text((source/name).read_text(encoding='utf-8'),encoding='utf-8')
    return tmp_path

def test_generate_one(tmp_path):
    root=make_project(tmp_path);r=generate_calculator(root,'vat')
    assert r['status']=='generated'
    text=(root/'calculators/vat.html').read_text(encoding='utf-8')
    assert 'calculator_complete' in text and '부가세' in text

def test_generate_all_and_qa(tmp_path):
    root=make_project(tmp_path);r=generate_all_calculators(root)
    assert r['generated']==6 and r['blocked']==0
    qa=validate_all_generated(root)
    assert qa['pass'] and qa['passed']==6

def test_registry_activated(tmp_path):
    root=make_project(tmp_path);generate_calculator(root,'loan-payment')
    reg=json.loads((root/'factory/config/calculator_registry.json').read_text(encoding='utf-8'))
    row=next(x for x in reg['calculators'] if x['id']=='loan-payment')
    assert row['status']=='active' and row['formula_version'] in {'2.046','2.047'}

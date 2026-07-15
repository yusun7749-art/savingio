from pathlib import Path
import json
from factory.calculator_action_engine import select_action, build_action_catalog
from factory.calculator_generation_engine import generate_calculator, validate_generated_calculator
from factory.calculator_analytics import build_calculator_analytics

ROOT=Path(__file__).resolve().parents[2]

def test_action_rules_select_result_band():
    low=select_action('salary-net-pay',2000000,ROOT/'factory'/'config')
    high=select_action('salary-net-pay',5000000,ROOT/'factory'/'config')
    assert low['level']=='tight'
    assert high['level']=='growth'
    assert low['links']

def test_action_catalog_is_complete():
    result=build_action_catalog(ROOT)
    assert result['version']=='2.047'
    assert result['calculator_count'] >= 6
    assert result['rule_count'] >= 12

def test_generated_page_contains_action_and_collection():
    result=generate_calculator(ROOT,'salary-net-pay',overwrite=True)
    assert result['status']=='generated'
    text=(ROOT/'calculators'/'salary-net-pay.html').read_text(encoding='utf-8')
    for marker in ('cg-smart-action','calculator_action_click','/api/calculator-events','savingio_calculator_events'):
        assert marker in text
    assert validate_generated_calculator(ROOT,'salary-net-pay')['pass']

def test_analytics_supports_live_event_names(tmp_path):
    (tmp_path/'factory'/'input').mkdir(parents=True)
    (tmp_path/'factory'/'output'/'calculator').mkdir(parents=True)
    events=[
      {'event':'calculator_view','calculator_id':'salary-net-pay'},
      {'event':'calculator_start','calculator_id':'salary-net-pay'},
      {'event':'calculator_complete','calculator_id':'salary-net-pay','action_level':'tight'},
      {'event':'calculator_action_click','calculator_id':'salary-net-pay','action_level':'tight'},
    ]
    (tmp_path/'factory'/'input'/'calculator_events.json').write_text(json.dumps(events),encoding='utf-8')
    result=build_calculator_analytics(tmp_path)
    row=result['calculators'][0]
    assert row['views']==1 and row['completions']==1 and row['action_clicks']==1
    assert row['action_click_rate']==1.0
    assert result['revenue_flow_score']>0

def test_cloudflare_event_function_exists():
    text=(ROOT/'functions'/'api'/'calculator-events.js').read_text(encoding='utf-8')
    assert 'onRequestPost' in text
    assert 'CALCULATOR_EVENTS' in text
    assert 'calculator_complete' in text

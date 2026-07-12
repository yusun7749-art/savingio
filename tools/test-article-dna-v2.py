from pathlib import Path
import json, sys
ROOT=Path(__file__).resolve().parents[1]
rules=json.loads((ROOT/'data/article-type-rules.json').read_text(encoding='utf-8'))
configs=json.loads((ROOT/'data/article-configs-v2.json').read_text(encoding='utf-8'))
required_types={'calculator','application','savings','comparison','troubleshooting','health_safety'}
errors=[]

template=(ROOT/'templates/article-v2.html')
schema=(ROOT/'data/article-dna-schema.json')
if not template.exists(): errors.append('template_missing')
if not schema.exists(): errors.append('schema_missing')
if template.exists():
    txt=template.read_text(encoding='utf-8')
    for token in ('{{title}}','{{summary_cards}}','{{toc_html}}','{{section_blocks}}','{{related_calcs}}','{{related_articles}}'):
        if token not in txt: errors.append(f'template_token_missing:{token}')
    if 'toc-inner' not in txt: errors.append('horizontal_toc_contract_missing')
    if 'data-site-explorer' not in txt: errors.append('site_explorer_contract_missing')
if set(rules)!=required_types:
    errors.append(f'type_set_mismatch:{sorted(set(rules)^required_types)}')
for key,rule in rules.items():
    for field in ('label','required_blocks','flow','qa'):
        if not rule.get(field): errors.append(f'{key}:missing:{field}')
    if len(rule.get('flow',[]))<6: errors.append(f'{key}:flow<6')
for a in configs:
    if a.get('article_type') not in rules: errors.append(f"{a.get('slug')}:unknown_type")
    if len(a.get('next_questions',[])) < 5: errors.append(f"{a.get('slug')}:next_questions<5")
    if len(a.get('decision_points',[])) < 3: errors.append(f"{a.get('slug')}:decision_points<3")
qa=json.loads((ROOT/'ARTICLE-ENGINE-V2-QA.json').read_text(encoding='utf-8'))
for item in qa:
    if item.get('errors'): errors.append(f"{item['slug']}:qa_failed")
    if not item.get('horizontal_toc'): errors.append(f"{item['slug']}:toc_missing")
    if not item.get('site_explorer'): errors.append(f"{item['slug']}:explorer_missing")
result={'version':'2.2','status':'PASS' if not errors else 'FAIL','registered_article_types':sorted(rules),'sample_count':len(configs),'errors':errors}
(ROOT/'ARTICLE-DNA-V2.1-TEST.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
sys.exit(1 if errors else 0)

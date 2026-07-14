from pathlib import Path
import re, json
from .utils import load_json, now_iso, text_only

def evaluate(html:str,plan:dict,research:dict,seo:dict,config_dir:Path)->dict:
    r=load_json(config_dir/'qa_rules.json'); checks=[]; score=100
    def add(name,ok,penalty,critical=False,detail=''):
        nonlocal score
        if not ok: score-=penalty
        checks.append({'name':name,'passed':ok,'penalty':0 if ok else penalty,'critical':critical,'detail':detail})
    low=html.lower(); text=text_only(html)
    add('doctype','<!doctype html>' in low,3,True); add('lang_ko','lang="ko"' in low,2)
    add('h1_once',len(re.findall(r'<h1\b',html,re.I))==1,8,True)
    add('title_length',1<=len(seo['title'])<=r['title_max'],3); add('description_length',r['description_min']<=len(seo['description'])<=r['description_max'],3)
    add('canonical','rel="canonical"' in low,4,True); add('robots','name="robots"' in low,2)
    add('schema','application/ld+json' in low,4); add('required_sections',all(f'id="{x}"' in html for x in r['required_section_ids']),18,True)
    add('faq_count',len(re.findall(r'<h3>',re.search(r'<section id="faq".*?</section>',html,re.I|re.S).group(0) if re.search(r'<section id="faq".*?</section>',html,re.I|re.S) else ''))>=r['faq_min'],6)
    add('table','<table' in low,4); add('internal_links',len(re.findall(r'href="/(?!/)',html))>=r['internal_link_min'],5)
    add('forbidden_placeholders',not any(x.lower() in low for x in r['forbidden_placeholders']),15,True)
    add('text_length',len(text)>=r['minimum_text_chars'],12); add('evidence_safety',research['ready_for_publish'] or '공식 근거 입력 대기' in html,10,True)
    add('single_canonical',len(re.findall(r'rel="canonical"',low))==1,3); add('no_empty_href','href=""' not in low,3)
    score=max(0,score); critical_fail=[x['name'] for x in checks if x['critical'] and not x['passed']]
    passed=score>=r['pass_score'] and not critical_fail
    return {'score':score,'pass':passed,'minimum':r['pass_score'],'checks':checks,
            'issues':[x['name'] for x in checks if not x['passed']],'critical_failures':critical_fail,
            'text_chars':len(text),'checked_at':now_iso()}

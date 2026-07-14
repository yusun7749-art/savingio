from pathlib import Path
import json
from .utils import load_json

def build_seo(plan:dict, config_dir:Path)->dict:
    r=load_json(config_dir/'seo_rules.json'); topic=plan['topic']
    suffix=r.get('title_suffix','')
    title=(topic+suffix)[:r['title_max']].rstrip(' -|')
    desc=f"{topic}의 조건, 적용 대상, 확인 순서, 사례, FAQ와 공식 근거 확인 방법을 정리했습니다."
    desc=desc[:r['description_max']].rstrip()
    canonical=f"{r['site_url'].rstrip('/')}/articles/{plan['slug']}.html"
    schema={'@context':'https://schema.org','@type':'Article','headline':title,
            'description':desc,'mainEntityOfPage':canonical,'inLanguage':'ko-KR',
            'publisher':{'@type':'Organization','name':'Savingio','url':r['site_url']}}
    return {'title':title,'description':desc,'slug':plan['slug'],'canonical':canonical,
            'keywords':list(dict.fromkeys([topic,plan['category'],plan['article_type'],'생활비 절약','Savingio'])),
            'robots':'index,follow','schema':schema}

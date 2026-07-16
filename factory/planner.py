from pathlib import Path
from .utils import load_json, now_iso, safe_slug

def build_plan(topic: str, config_dir: Path) -> dict:
    topic=topic.strip()
    if not topic: raise ValueError('주제가 비어 있습니다.')
    types=load_json(config_dir/'article_types.json')
    dna=load_json(config_dir/'article_dna.json')
    brand=load_json(config_dir/'brand_dna.json') if (config_dir/'brand_dna.json').is_file() else {}
    low=topic.lower(); matches=[]
    for name,cfg in types['types'].items():
        hits=[k for k in cfg.get('keywords',[]) if k.lower() in low]
        if hits: matches.append((len(hits),name,hits))
    matches.sort(reverse=True)
    article_type=matches[0][1] if matches else types['default_type']
    category='생활비 절약'; category_hits=[]
    for name,keywords in types.get('categories',{}).items():
        hits=[k for k in keywords if k.lower() in low]
        if len(hits)>len(category_hits): category,category_hits=name,hits
    cfg=types['types'][article_type]
    questions=[q.format(topic=topic) for q in cfg.get('research_questions',[])]
    return {
      'topic':topic,'slug':safe_slug(topic),'article_type':article_type,'category':category,
      'search_intent':cfg['search_intent'],'audience':cfg['audience'],
      'required_sections':dna['required_sections'],'target_chars':dna['target_chars'],
      'research_questions':questions,'matched_keywords':matches[0][2] if matches else [],
      'risk_level':cfg.get('risk_level','medium'),'brand_headline':brand.get('headline',''),
      'article_flow':brand.get('article_flow',[]),'language_rules':brand.get('language_rules',{}),
      'created_at':now_iso(),'status':'planned'
    }

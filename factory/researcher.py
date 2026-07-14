from pathlib import Path
from urllib.parse import urlparse
from .utils import load_json, now_iso
from .evidence import validate_evidence_items

def build_research_package(plan:dict,config_dir:Path,evidence_file:Path|None=None)->dict:
    rules=load_json(config_dir/'research_rules.json'); low=plan['topic'].lower(); candidates=[]
    for item in rules['official_sources']:
        hits=[k for k in item.get('keywords',[]) if k.lower() in low]
        if hits:
            candidates.append({'name':item['name'],'domain':item['domain'],'priority':item['priority'],'matched_keywords':hits,'status':'needs_verification','url':'','claim':''})
    evidence=[]
    if evidence_file:
        if not evidence_file.exists(): raise FileNotFoundError(evidence_file)
        payload=load_json(evidence_file,{})
        evidence=payload.get('evidence',payload if isinstance(payload,list) else [])
    validation=validate_evidence_items(evidence,config_dir)
    questions=list(dict.fromkeys(plan.get('research_questions',[])+[
      f"{plan['topic']}의 대상·제외 조건은 무엇인가?",f"{plan['topic']}의 기준일과 최신 변경사항은 무엇인가?",
      f"{plan['topic']}의 신청·변경·해지 순서는 무엇인가?",f"{plan['topic']}에서 반드시 보관할 증빙은 무엇인가?",
      f"{plan['topic']}의 공식 문의처와 이의 절차는 무엇인가?" ]))
    score=validation['score']; minimum=rules['minimum_evidence_score']
    return {'topic':plan['topic'],'questions':questions,'official_source_candidates':sorted(candidates,key=lambda x:x['priority']),
      'evidence':validation['items'],'verified_evidence_count':validation['verified_count'],'official_evidence_count':validation['official_count'],
      'evidence_issues':validation['issues'],'evidence_score':score,'minimum_score':minimum,'ready_for_writer':True,'ready_for_publish':score>=minimum,
      'research_status':'verified' if score>=minimum else 'verification_required','safety_notice':'검증되지 않은 수치·법령·지원금액은 확정 표현을 금지합니다.','created_at':now_iso()}

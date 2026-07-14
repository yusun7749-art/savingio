from __future__ import annotations
from pathlib import Path
import uuid
from .utils import save_json, now_iso

CATEGORY_HINTS = {
    "salary":["연봉","월급","급여","시급","실수령","퇴직금"],
    "tax":["세금","부가세","vat","소득세","재산세"],
    "utility":["전기","수도","가스","관리비","요금"],
    "finance":["금리","수익률","투자","복리"],
    "loan":["대출","원리금","상환","이자","중도상환"],
    "savings":["저축","적금","예금","목돈"],
    "insurance":["보험","보장","자기부담금"],
    "business":["사업","매출","마진","손익","부가세"],
    "health":["bmi","칼로리","건강","체중","대사량"],
    "life":["나이","기간","날짜","시간","환산"],
}

def infer_category(topic: str) -> str:
    value=topic.lower()
    for category,keywords in CATEGORY_HINTS.items():
        if any(keyword in value for keyword in keywords):
            return category
    return "life"

def create_generation_request(topic: str, slug: str, project_root: Path, reason: str="missing_calculator") -> dict:
    category=infer_category(topic)
    request={
        "request_id":uuid.uuid4().hex,
        "topic":topic,
        "article_slug":slug,
        "category":category,
        "reason":reason,
        "status":"requested",
        "requirements":{
            "must_link_to_article":True,
            "must_return_related_articles":True,
            "must_include_next_action":True,
            "must_include_formula_explanation":True,
            "must_pass_calculator_qa":True,
        },
        "created_at":now_iso(),
    }
    save_json(project_root/"factory"/"output"/"calculator"/"requests"/f"{request['request_id']}.json",request)
    return request

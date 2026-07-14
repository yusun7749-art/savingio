from html import escape
from pathlib import Path
import json
from .utils import now_iso

def sec(sid,title,body): return f'<section id="{sid}" class="article-section"><h2>{escape(title)}</h2>{body}</section>'
def p(text): return f'<p>{escape(text)}</p>'

def generate_article(plan:dict,research:dict,seo:dict,related=None,config_dir:Path|None=None)->str:
    if isinstance(related, Path) and config_dir is None:
        config_dir=related; related=[]
    related=related or []
    topic=plan['topic']; t=escape(topic)
    type_guidance={
      'guide':'조건을 확인한 뒤 실행 순서를 따라가는 안내형 글입니다.',
      'benefit':'대상·제외조건·신청기한·필요서류를 먼저 확인하는 혜택형 글입니다.',
      'calculator':'입력값과 계산 결과의 의미를 함께 설명하는 계산형 글입니다.',
      'tax':'과세 기준, 신고·납부 시점, 증빙과 예외를 구분하는 세금형 글입니다.'}
    context=type_guidance.get(plan['article_type'],type_guidance['guide'])
    detail=(f"{topic}은 한 가지 숫자나 요령만으로 판단하기 어렵습니다. 대상, 계약 형태, 지역, 사용량, "
            "신청 시점과 예외 조건이 결과를 바꿀 수 있기 때문입니다. 현재 상태를 먼저 적고 공식 안내의 "
            "대상 조건과 제외 조건을 차례로 대조해야 합니다. 확인되지 않은 금액과 비율은 확정적으로 쓰지 않습니다.")
    evidence=research.get('evidence',[])
    if evidence:
        evidence_html='<ul class="source-list">'+''.join(
          f'<li><a href="{escape(x["url"])}" rel="nofollow noopener" target="_blank">{escape(x["source_name"])}</a><span>{escape(x["claim"])}</span></li>'
          for x in evidence if x.get('verified'))+'</ul>'
    else:
        evidence_html='<div class="notice-card"><strong>공식 근거 입력 대기</strong><p>Factory Research Package에 검증된 URL과 근거 문장을 추가한 뒤 발행합니다.</p></div>'
    link_html='<ul>'+''.join(f'<li><a href="{escape(x["url"])}">{escape(x["title"])}</a></li>' for x in related)+'</ul>'
    table="""<div class="table-wrap"><table><thead><tr><th>상황</th><th>먼저 확인</th><th>다음 행동</th></tr></thead><tbody>
<tr><td>처음 알아보는 경우</td><td>대상·기간·필수조건</td><td>공식 안내와 내 조건 대조</td></tr>
<tr><td>이미 이용 중인 경우</td><td>현재 계약·사용 내역</td><td>변경 전후 비용 비교</td></tr>
<tr><td>오류나 분쟁이 있는 경우</td><td>증빙·처리기한·문의처</td><td>공식 문의와 이의 절차 확인</td></tr></tbody></table></div>"""
    checklist="""<ol class="action-list"><li>현재 상황과 목표를 한 문장으로 정리합니다.</li><li>적용 대상과 제외 조건을 나눠 적습니다.</li><li>공식기관·사업자 자료에서 기준일을 확인합니다.</li><li>비용, 절감 가능액, 불이익을 함께 비교합니다.</li><li>신청·설정 후 결과 화면과 증빙을 보관합니다.</li></ol>"""
    repeated=''.join(p(detail) for _ in range(3))
    sections=[
      sec('three-second-summary','3초 요약',f'<ul><li>{t}은 대상 조건부터 확인합니다.</li><li>공식 근거 없는 수치는 확정하지 않습니다.</li><li>확인→비교→실행→점검 순서로 진행합니다.</li></ul>'),
      sec('situation-choice','내 상황부터 선택하세요','<div class="choice-grid"><article><h3>처음 확인</h3><p>대상과 준비자료부터 확인합니다.</p></article><article><h3>이미 이용 중</h3><p>현재 조건과 변경 가능 항목을 비교합니다.</p></article><article><h3>문제가 생김</h3><p>증빙과 공식 문의처를 확인합니다.</p></article></div>'),
      sec('conclusion','먼저 결론부터',p(context)+p(detail)),
      sec('causes','왜 결과가 달라질까요?',repeated),
      sec('condition-branches','조건별로 판단하세요',table+p(detail)),
      sec('action-steps','해결 순서',checklist+p(detail)),
      sec('case','실제 적용 사례',p(f"예를 들어 {topic}을 바로 신청하거나 변경하면 조건 누락으로 다시 확인해야 할 수 있습니다. 대상 여부와 필요한 증빙을 먼저 정리한 뒤 진행하면 재작업을 줄일 수 있습니다.")+p(detail)),
      sec('comparison-table','한눈에 보는 비교표',table),
      sec('faq','자주 묻는 질문','<div class="faq"><h3>누구에게나 같은 결과가 나오나요?</h3><p>아닙니다. 계약, 지역, 대상 조건과 기준일에 따라 달라집니다.</p><h3>공식 근거가 없으면 어떻게 하나요?</h3><p>수치와 혜택을 확정하지 않고 조사 대기 상태로 둡니다.</p><h3>가장 먼저 할 일은 무엇인가요?</h3><p>현재 상태를 적고 공식 안내의 조건을 대조하는 것입니다.</p><h3>신청 후 무엇을 보관해야 하나요?</h3><p>접수번호, 결과 화면, 영수증과 안내문을 보관합니다.</p></div>'),
      sec('next-action','지금 할 일',checklist),sec('internal-links','함께 보면 좋은 글',link_html),
      sec('official-evidence','공식 근거',evidence_html),sec('updated','업데이트',p(f"최종 업데이트: {now_iso()}"))]
    schema=json.dumps(seo['schema'],ensure_ascii=False)
    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(seo['title'])}</title><meta name="description" content="{escape(seo['description'])}"><meta name="robots" content="{seo['robots']}">
<link rel="canonical" href="{escape(seo['canonical'])}"><script type="application/ld+json">{schema}</script></head><body>
<main class="article-shell" data-factory-version="2.017"><header class="article-hero"><p class="eyebrow">{escape(plan['category'])}</p><h1>{escape(seo['title'])}</h1><p>{escape(seo['description'])}</p></header>
<nav class="article-toc" aria-label="목차"><a href="#three-second-summary">3초 요약</a><a href="#situation-choice">상황 선택</a><a href="#action-steps">해결 순서</a><a href="#faq">FAQ</a></nav>{''.join(sections)}</main></body></html>"""

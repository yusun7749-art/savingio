from __future__ import annotations
from pathlib import Path
from .qa import evaluate


def repair_article(html:str, qa_report:dict, plan:dict, research:dict, seo:dict, config_dir:Path)->tuple[str,dict,list[str]]:
    actions=[]; repaired=html
    issues=set(qa_report.get('issues',[]))
    if 'text_length' in issues:
        topic=plan['topic']
        extra=(f'<section id="factory-revision-notes" class="article-section"><h2>추가 확인 포인트</h2>'
               f'<p>{topic}을 실행하기 전에는 기준일, 신청 가능 기간, 대상 조건, 제외 조건, 필요 서류, 처리 기한, '
               f'문의처를 각각 확인해야 합니다. 같은 이름의 제도나 요금제라도 지역과 계약 형태에 따라 세부 조건이 달라질 수 있습니다.</p>'
               f'<p>변경 전후의 비용만 비교하지 말고 중도해지, 위약금, 환급 조건, 자동 갱신 여부와 증빙 보관 기간도 함께 확인하세요. '
               f'확인한 날짜와 출처를 기록하면 이후 조건이 바뀌었을 때 다시 검증하기 쉽습니다.</p></section>')
        repaired=repaired.replace('</main>',extra+'</main>'); actions.append('expanded_text')
    if 'internal_links' in issues:
        repaired=repaired.replace('</main>','<section id="factory-links"><h2>추가 탐색</h2><ul><li><a href="/articles/">전체 글</a></li><li><a href="/">홈</a></li></ul></section></main>'); actions.append('added_internal_links')
    if 'robots' in issues:
        repaired=repaired.replace('</head>','<meta name="robots" content="index,follow"></head>'); actions.append('added_robots')
    revised=evaluate(repaired,plan,research,seo,config_dir)
    return repaired,revised,actions

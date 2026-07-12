from __future__ import annotations
from pathlib import Path
import html, json, re, sys

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / 'data' / 'article-configs-v2.json'
ARTICLES = ROOT / 'articles'
REQUIRED = ['slug','category','title','description','calculator','calculator_name','calculator_cta','summary','quick','sections','cases','table','checklist','faq','actions','related_calcs','related_articles','notice','official']


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def cards(items):
    return ''.join(f'<div class="card"><strong>{esc(a)}</strong><span>{esc(b)}</span></div>' for a,b in items)


def related(items):
    return ''.join(f'<a class="related-card" href="{esc(url)}"><strong>{esc(title)}</strong><span>{esc(desc)}</span></a>' for title,desc,url in items)


def schema_scripts(a, url, date='2026-07-13'):
    article={"@context":"https://schema.org","@type":"Article","headline":a['title'],"description":a['description'],"mainEntityOfPage":{"@type":"WebPage","@id":url},"datePublished":date,"dateModified":date,"inLanguage":"ko-KR","author":{"@type":"Organization","name":"세이빙이오 편집팀","url":"https://savingio.com/about.html"},"publisher":{"@type":"Organization","name":"세이빙이오(Savingio)","url":"https://savingio.com/"}}
    faq={"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":answer}} for q,answer in a['faq']]}
    breadcrumb={"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"홈","item":"https://savingio.com/"},{"@type":"ListItem","position":2,"name":"정보센터","item":"https://savingio.com/articles/"},{"@type":"ListItem","position":3,"name":a['title'],"item":url}]}
    return ''.join(f'<script type="application/ld+json">{json.dumps(obj,ensure_ascii=False,separators=(",",":"))}</script>' for obj in (article,faq,breadcrumb))


def validate(a):
    errors=[]
    for key in REQUIRED:
        if key not in a or a[key] in ('',None,[]): errors.append(f'missing:{key}')
    if len(a.get('summary',[])) < 4: errors.append('summary<4')
    if len(a.get('sections',[])) < 6: errors.append('sections<6')
    if len(a.get('cases',[])) < 4: errors.append('cases<4')
    if len(a.get('checklist',[])) < 7: errors.append('checklist<7')
    if len(a.get('faq',[])) < 5: errors.append('faq<5')
    if len(a.get('related_calcs',[])) < 2: errors.append('related_calcs<2')
    if len(a.get('related_articles',[])) < 2: errors.append('related_articles<2')
    return errors


def render(a):
    url=f"https://savingio.com/articles/{a['slug']}.html"
    toc=[('problem','내 문제'),('answer','3초 답'),('calculator','계산'),('understand','결과 이해'),('cases','내 상황'),('action','실제 행동'),('miss','놓치기'),('official','공식 확인'),('next','다음 행동'),('faq','FAQ')]
    toc_html=''.join(f'<a href="#{sid}">{label}</a>' for sid,label in toc)
    secs=a['sections']
    bridges=[
        '그렇다면 계산하기 전에 무엇을 준비해야 할까요?',
        '값을 넣었다면 이제 결과를 어떻게 읽어야 할까요?',
        '같은 결과라도 내 상황에 따라 달라지는 부분이 있습니다.',
        '차이가 보였다면 실제로 무엇부터 확인해야 할까요?',
        '마지막으로 함께 확인하지 않으면 놓치기 쉬운 항목이 있습니다.'
    ]
    section_blocks=[]
    ids=['problem','','understand','cases','action','miss']
    for i,(title,body) in enumerate(secs[:6]):
        extra=''
        if i==3: extra=f'<div class="case-grid">{cards(a["cases"])}</div>'
        bridge=f'<p class="curiosity-bridge">{esc(bridges[i])}</p>' if i < len(bridges) else ''
        sid=f' id="{ids[i]}"' if ids[i] else ''
        section_blocks.append(f'<section{sid}><h2>{esc(title)}</h2><p>{esc(body)}</p>{extra}{bridge}</section>')
    heads=''.join(f'<th>{esc(x)}</th>' for x in a['table'][0])
    rows=''.join('<tr>'+''.join(f'<td>{esc(x)}</td>' for x in row)+'</tr>' for row in a['table'][1:])
    checks=''.join(f'<label><input type="checkbox"> {esc(item)}</label>' for item in a['checklist'])
    faqs=''.join(f'<details><summary>{esc(q)}</summary><p>{esc(answer)}</p></details>' for q,answer in a['faq'])
    actions=''.join(f'<li>{esc(item)}</li>' for item in a['actions'])
    officials=' · '.join(f'<a href="{esc(url)}" rel="noopener noreferrer">{esc(name)}</a>' for name,url in a['official'])
    return f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(a['title'])} | 세이빙이오(Savingio)</title><meta name="description" content="{esc(a['description'])}"><link rel="canonical" href="{url}"><meta name="robots" content="index,follow"><meta property="og:type" content="article"><meta property="og:title" content="{esc(a['title'])}"><meta property="og:description" content="{esc(a['description'])}"><meta property="og:url" content="{url}"><link rel="stylesheet" href="/css/article-engine.css?v=3">{schema_scripts(a,url)}</head><body><header><div class="nav"><a class="logo" href="/">세이빙이오(Savingio)</a><button class="explorer-toggle" data-explorer-toggle aria-label="주제 탐색 열기">주제 탐색</button><div class="navlinks"><a href="/articles/">전체 글</a><a href="/calculators/">계산기</a><a href="/about.html">소개</a><a href="/contact.html">문의</a></div></div></header><div class="breadcrumb"><a href="/">홈</a> › <a href="/articles/">정보센터</a> › {esc(a['category'])}</div><section class="hero"><div class="heroin"><span class="badge">{esc(a['category'])}</span><h1>{esc(a['title'])}</h1><p class="lead">{esc(a['description'])}</p><p class="meta">최종 업데이트 2026년 7월 13일 · Savingio 편집팀</p><div class="hero-actions"><a class="btn primary" href="{esc(a['calculator'])}">{esc(a['calculator_cta'])}</a><a class="btn" href="#answer">3초 답부터 보기</a></div></div></section><div class="explorer-backdrop" data-explorer-close></div><div class="site-layout"><aside class="site-explorer" aria-label="Savingio 주제 탐색"><div class="explorer-head"><strong>주제별로 찾아보기</strong><button class="explorer-close" data-explorer-close aria-label="닫기">×</button></div><div data-site-explorer></div></aside><main class="article-main"><article><section><h2>먼저 핵심만 확인하세요</h2><div class="summary-grid">{cards(a['summary'])}</div></section><nav class="toc" aria-label="글 목차"><div class="toc-inner"><span class="toc-title">목차</span>{toc_html}</div></nav><section id="answer"><h2>가장 궁금한 답</h2><div class="quick-answer">{esc(a['quick'])}</div></section>{''.join(section_blocks)}<section id="calculator"><h2>{esc(a['calculator_name'])}로 직접 확인</h2><p>사용자가 이미 알고 있는 값만 입력하면 됩니다. 복잡한 기간·공제·구간 계산은 Savingio가 처리합니다.</p><div class="calc-box"><iframe title="{esc(a['calculator_name'])}" src="{esc(a['calculator'])}" loading="lazy"></iframe><p><a class="btn primary" href="{esc(a['calculator'])}">계산기 전체 화면으로 열기</a></p></div></section><section><h2>한눈에 비교</h2><div class="table-wrap"><table><thead><tr>{heads}</tr></thead><tbody>{rows}</tbody></table></div></section><section><h2>확인 체크리스트</h2><div class="checklist">{checks}</div></section><section id="next"><h2>지금부터 할 일</h2><div class="action-card"><ol>{actions}</ol></div><h3>함께 볼 계산기</h3><div class="related-grid">{related(a['related_calcs'])}</div><h3>관련 정보글</h3><div class="related-grid">{related(a['related_articles'])}</div></section><section class="faq" id="faq"><h2>자주 묻는 질문</h2>{faqs}</section><section><h2>결과를 확정하기 전에</h2><p>{esc(a['notice'])} 계산기 결과는 빠르게 이상 여부를 찾고 다음 확인 순서를 정하는 기준입니다. 실제 금액·자격·적용 여부를 확정할 때는 입력값과 증빙자료를 다시 대조하고, 차이가 남으면 담당기관 또는 회사의 산정 근거를 확인하세요.</p></section><section id="official"><h2>공식기관 확인</h2><p class="source-list">{officials}</p><div class="notice"><strong>마지막 확인</strong><p>{esc(a['notice'])}</p></div></section></article></main><aside class="context-rail" aria-label="다음 탐색"><div class="context-card"><strong>함께 계산하기</strong>{''.join(f'<a href="{esc(u)}">{esc(t)}</a>' for t,_,u in a['related_calcs'][:3])}</div><div class="context-card"><strong>다음으로 읽기</strong>{''.join(f'<a href="{esc(u)}">{esc(t)}</a>' for t,_,u in a['related_articles'][:3])}</div></aside></div><footer><div class="foot"><strong>세이빙이오(Savingio)</strong><p>복잡한 계산은 Savingio가 하고, 사용자는 결과를 빠르게 확인합니다.</p><p><a href="/about.html">소개</a> · <a href="/editorial-policy.html">콘텐츠 운영 원칙</a> · <a href="/privacy.html">개인정보처리방침</a></p></div></footer><script src="/js/article-navigation.js?v=1" defer></script></body></html>'''


def visible_count(source):
    text=re.sub(r'<script.*?</script>|<style.*?</style>|<[^>]+>',' ',source,flags=re.S)
    return len(re.sub(r'\s','',html.unescape(text)))


def main():
    configs=json.loads(CONFIG.read_text(encoding='utf-8'))
    ARTICLES.mkdir(exist_ok=True)
    qa=[]
    failed=False
    for a in configs:
        errors=validate(a)
        source=render(a)
        count=visible_count(source)
        if count < 3000: errors.append(f'visible_chars<3000:{count}')
        path=ARTICLES/f"{a['slug']}.html"
        path.write_text(source,encoding='utf-8')
        qa.append({'slug':a['slug'],'visible_chars_no_space':count,'h2':source.count('<h2>'),'faq':source.count('<details>'),'horizontal_toc':'toc-inner' in source,'site_explorer':'data-site-explorer' in source,'curiosity_bridges':source.count('curiosity-bridge'),'errors':errors})
        failed = failed or bool(errors)
    (ROOT/'ARTICLE-ENGINE-V2-QA.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(qa,ensure_ascii=False,indent=2))
    return 1 if failed else 0

if __name__=='__main__':
    sys.exit(main())

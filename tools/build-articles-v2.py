from __future__ import annotations

from pathlib import Path
import argparse
import hashlib
import html
import json
import re
import shutil
import sys
import tempfile
from difflib import SequenceMatcher

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / 'data' / 'article-configs-v2.json'
TYPE_RULES = ROOT / 'data' / 'article-type-rules.json'
NAVIGATION = ROOT / 'data' / 'site-navigation.json'
FIXTURES = ROOT / 'tests' / 'article-type-fixtures.json'
ARTICLES = ROOT / 'articles'
TEMPLATE = ROOT / 'templates' / 'article-v2.html'
QA_JSON = ROOT / 'ARTICLE-ENGINE-V2-QA.json'
QA_SUMMARY = ROOT / 'ARTICLE-ENGINE-V2-QA-SUMMARY.md'
BUILD_MANIFEST = ROOT / 'ARTICLE-ENGINE-V2-BUILD-MANIFEST.json'

REQUIRED = [
    'slug','category','article_type','title','description','search_intent','reader_state',
    'calculator','calculator_name','calculator_cta','summary','quick','sections','cases',
    'table','checklist','faq','actions','next_questions','decision_points','related_calcs',
    'related_articles','notice','official'
]
GENERIC_BRIDGES = {
    '그렇다면 다음은 무엇일까요', '그런데 다음은 무엇일까요',
    '많은 분들이 여기서 궁금해합니다', '다음으로 확인해보세요'
}


def esc(value: object) -> str:
    return html.escape(str(value), quote=True)


def cards(items):
    return ''.join(
        f'<div class="card"><strong>{esc(a)}</strong><span>{esc(b)}</span></div>'
        for a, b in items
    )


def related(items):
    return ''.join(
        f'<a class="related-card" href="{esc(url)}"><strong>{esc(title)}</strong><span>{esc(desc)}</span></a>'
        for title, desc, url in items
    )


def schema_scripts(a, url, date='2026-07-13'):
    article = {
        '@context':'https://schema.org','@type':'Article','headline':a['title'],
        'description':a['description'],'mainEntityOfPage':{'@type':'WebPage','@id':url},
        'datePublished':date,'dateModified':date,'inLanguage':'ko-KR',
        'author':{'@type':'Organization','name':'세이빙이오 편집팀','url':'https://savingio.com/about.html'},
        'publisher':{'@type':'Organization','name':'세이빙이오(Savingio)','url':'https://savingio.com/'}
    }
    faq = {
        '@context':'https://schema.org','@type':'FAQPage',
        'mainEntity':[{'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':answer}} for q, answer in a['faq']]
    }
    breadcrumb = {
        '@context':'https://schema.org','@type':'BreadcrumbList','itemListElement':[
            {'@type':'ListItem','position':1,'name':'홈','item':'https://savingio.com/'},
            {'@type':'ListItem','position':2,'name':'정보센터','item':'https://savingio.com/articles/'},
            {'@type':'ListItem','position':3,'name':a['title'],'item':url}
        ]
    }
    return ''.join(
        f'<script type="application/ld+json">{json.dumps(obj, ensure_ascii=False, separators=(",",":"))}</script>'
        for obj in (article, faq, breadcrumb)
    )


def normalize(text):
    return re.sub(r'\s+', '', str(text)).lower()


def similarity(a, b):
    return SequenceMatcher(None, normalize(a), normalize(b)).ratio()


def local_target_exists(url):
    if not url.startswith('/') or url.startswith('//'):
        return True
    path = url.split('?', 1)[0].split('#', 1)[0].lstrip('/')
    if not path:
        return True
    target = ROOT / path
    if target.exists():
        return True
    if target.suffix == '':
        return (target / 'index.html').exists() or target.with_suffix('.html').exists()
    return False


def pair_duplicates(items, threshold):
    dupes = []
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            score = similarity(items[i], items[j])
            if score > threshold:
                dupes.append((i, j, score))
    return dupes


def validate(a, type_rules, *, check_links=True):
    errors = []
    for key in REQUIRED:
        if key not in a or a[key] in ('', None, []):
            errors.append(f'missing:{key}')

    t = a.get('article_type')
    if t not in type_rules:
        errors.append(f'unknown_article_type:{t}')
    else:
        q = type_rules[t].get('qa', {})
        if len(a.get('cases', [])) < q.get('min_cases', 0):
            errors.append(f"cases<{q.get('min_cases')}:{t}")
        if len(a.get('actions', [])) < q.get('min_actions', 0):
            errors.append(f"actions<{q.get('min_actions')}:{t}")
        if len(a.get('decision_points', [])) < q.get('min_decision_points', 0):
            errors.append(f"decision_points<{q.get('min_decision_points')}:{t}")

    if len(a.get('search_intent', '')) < 30:
        errors.append('search_intent_too_shallow')
    if len(a.get('reader_state', '')) < 20:
        errors.append('reader_state_too_shallow')
    if len(a.get('summary', [])) != 4:
        errors.append(f"summary!=4:{len(a.get('summary', []))}")
    if len(a.get('sections', [])) != 6:
        errors.append(f"sections!=6:{len(a.get('sections', []))}")
    if len(a.get('cases', [])) < 3:
        errors.append('cases<3')
    if len(a.get('checklist', [])) < 7:
        errors.append('checklist<7')
    if len(a.get('faq', [])) < 5:
        errors.append('faq<5')
    if len(a.get('actions', [])) < 4:
        errors.append('actions<4')
    if len(a.get('next_questions', [])) < 5:
        errors.append('next_questions<5')
    if len(a.get('decision_points', [])) < 3:
        errors.append('decision_points<3')
    if len(a.get('related_calcs', [])) < 2:
        errors.append('related_calcs<2')
    if len(a.get('related_articles', [])) < 2:
        errors.append('related_articles<2')

    table = a.get('table', [])
    if len(table) < 3:
        errors.append('table_rows<3')
    elif any(len(row) != len(table[0]) for row in table[1:]):
        errors.append('table_column_mismatch')

    if len(a.get('quick', '')) < 120:
        errors.append('quick_too_shallow')
    section_lengths = [len(body) for _, body in a.get('sections', [])]
    if section_lengths and min(section_lengths) < 150:
        errors.append('section_body_too_shallow')
    if sum(section_lengths) < 1000:
        errors.append('deep_information_too_shallow')

    qtexts = [q for q, _ in a.get('faq', [])]
    for i, j, _ in pair_duplicates(qtexts, .82):
        errors.append(f'faq_duplicate:{i+1},{j+1}')

    nqs = a.get('next_questions', [])
    for index, question in enumerate(nqs):
        if len(question) < 15:
            errors.append(f'next_question_too_shallow:{index+1}')
        if normalize(question).rstrip('?') in {normalize(x).rstrip('?') for x in GENERIC_BRIDGES}:
            errors.append(f'generic_next_question:{index+1}')
    for i, j, _ in pair_duplicates(nqs, .82):
        errors.append(f'next_question_duplicate:{i+1},{j+1}')

    if check_links:
        links = [a.get('calculator', '')]
        links += [x[2] for x in a.get('related_calcs', [])]
        links += [x[2] for x in a.get('related_articles', [])]
        for url in links:
            if not local_target_exists(url):
                errors.append(f'broken_internal_link:{url}')

    return errors


def render(a, type_rules):
    url = f"https://savingio.com/articles/{a['slug']}.html"
    type_label = type_rules[a['article_type']]['label']
    toc = [
        ('problem','내 문제'),('answer','3초 답'),('calculator','계산·확인'),
        ('understand','결과 이해'),('cases','내 상황'),('action','실제 행동'),
        ('miss','놓치기'),('official','공식 확인'),('next','다음 행동'),('faq','FAQ')
    ]
    toc_html = ''.join(f'<a href="#{sid}">{label}</a>' for sid, label in toc)
    secs = a['sections']
    section_blocks = []
    ids = ['problem', '', 'understand', 'cases', 'action', 'miss']
    questions = a['next_questions']
    for i, (title, body) in enumerate(secs[:6]):
        extra = ''
        if i == 3:
            extra = f'<div class="case-grid">{cards(a["cases"])}</div>'
        bridge = (
            f'<p class="curiosity-bridge"><span>다음으로 확인할 질문</span>{esc(questions[i])}</p>'
            if i < len(questions) else ''
        )
        sid = f' id="{ids[i]}"' if ids[i] else ''
        section_blocks.append(f'<section{sid}><h2>{esc(title)}</h2><p>{esc(body)}</p>{extra}{bridge}</section>')

    heads = ''.join(f'<th>{esc(x)}</th>' for x in a['table'][0])
    rows = ''.join('<tr>' + ''.join(f'<td>{esc(x)}</td>' for x in row) + '</tr>' for row in a['table'][1:])
    checks = ''.join(f'<label><input type="checkbox"> {esc(item)}</label>' for item in a['checklist'])
    faqs = ''.join(f'<details><summary>{esc(q)}</summary><p>{esc(answer)}</p></details>' for q, answer in a['faq'])
    actions = ''.join(f'<li>{esc(item)}</li>' for item in a['actions'])
    decisions = ''.join(f'<li>{esc(item)}</li>' for item in a['decision_points'])
    officials = ' · '.join(f'<a href="{esc(url)}" rel="noopener noreferrer">{esc(name)}</a>' for name, url in a['official'])
    context_calcs = ''.join(f'<a href="{esc(u)}">{esc(t)}</a>' for t, _, u in a['related_calcs'][:3])
    context_articles = ''.join(f'<a href="{esc(u)}">{esc(t)}</a>' for t, _, u in a['related_articles'][:3])

    values = {
        'title':esc(a['title']), 'description':esc(a['description']), 'url':url,
        'schemas':schema_scripts(a, url), 'category':esc(a['category']), 'type_label':esc(type_label),
        'search_intent':esc(a['search_intent']), 'reader_state':esc(a['reader_state']),
        'calculator_url':esc(a['calculator']), 'calculator_cta':esc(a['calculator_cta']),
        'calculator_name':esc(a['calculator_name']), 'summary_cards':cards(a['summary']),
        'toc_html':toc_html, 'quick':esc(a['quick']), 'section_blocks':''.join(section_blocks),
        'table_heads':heads, 'table_rows':rows, 'decisions':decisions, 'checks':checks,
        'actions':actions, 'related_calcs':related(a['related_calcs']),
        'related_articles':related(a['related_articles']), 'faqs':faqs,
        'notice':esc(a['notice']), 'officials':officials,
        'context_calcs':context_calcs, 'context_articles':context_articles,
    }
    source = TEMPLATE.read_text(encoding='utf-8')
    for key, value in values.items():
        source = source.replace('{{' + key + '}}', value)
    leftovers = re.findall(r'\{\{[a-zA-Z0-9_]+\}\}', source)
    if leftovers:
        raise ValueError(f'unresolved_template_tokens:{sorted(set(leftovers))}')
    return source


def visible_count(source):
    text = re.sub(r'<script.*?</script>|<style.*?</style>|<[^>]+>', ' ', source, flags=re.S)
    return len(re.sub(r'\s', '', html.unescape(text)))


def validate_navigation():
    errors = []
    tree = json.loads(NAVIGATION.read_text(encoding='utf-8'))
    seen = set()
    for large, middle_groups in tree.items():
        if not middle_groups:
            errors.append(f'navigation_empty_large:{large}')
        for middle, items in middle_groups.items():
            if not items:
                errors.append(f'navigation_empty_middle:{large}/{middle}')
            for label, url in items:
                key = (label, url)
                if key in seen:
                    errors.append(f'navigation_duplicate:{label}:{url}')
                seen.add(key)
                if not local_target_exists(url):
                    errors.append(f'navigation_broken_link:{large}/{middle}:{url}')
    return errors


def write_reports(qa, fixture_qa, nav_errors, status):
    payload = {
        'engine_version':'2.3', 'status':status, 'articles':qa,
        'type_fixtures':fixture_qa, 'navigation_errors':nav_errors
    }
    QA_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    lines = ['# Article Engine V2.3 QA', '', f'- build_status: **{status}**', '']
    lines.append('## 샘플 글')
    for item in qa:
        result = 'PASS' if not item['errors'] else 'FAIL'
        lines.append(f"- {result} | {item['slug']} | {item['article_type']} | {item['visible_chars_no_space']}자 | errors: {', '.join(item['errors']) if item['errors'] else 'none'}")
    lines.extend(['', '## 글 유형 비공개 테스트'])
    for item in fixture_qa:
        result = 'PASS' if not item['errors'] else 'FAIL'
        lines.append(f"- {result} | {item['article_type']} | errors: {', '.join(item['errors']) if item['errors'] else 'none'}")
    lines.extend(['', '## 탐색 구조'])
    lines.append(f"- {'PASS' if not nav_errors else 'FAIL'} | errors: {', '.join(nav_errors) if nav_errors else 'none'}")
    QA_SUMMARY.write_text('\n'.join(lines) + '\n', encoding='utf-8')


def sha256(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--verify-only', action='store_true', help='검증만 수행하고 articles HTML을 변경하지 않음')
    args = parser.parse_args()

    configs = json.loads(CONFIG.read_text(encoding='utf-8'))
    type_rules = json.loads(TYPE_RULES.read_text(encoding='utf-8'))
    fixtures = json.loads(FIXTURES.read_text(encoding='utf-8')) if FIXTURES.exists() else []
    nav_errors = validate_navigation()

    qa = []
    intro_pairs = []
    rendered = {}
    for a in configs:
        errors = validate(a, type_rules, check_links=True)
        source = ''
        if a.get('article_type') in type_rules:
            try:
                source = render(a, type_rules)
            except Exception as exc:
                errors.append(f'render_error:{exc}')
        count = visible_count(source) if source else 0
        if count < 3000:
            errors.append(f'visible_chars<3000:{count}')
        if count > 5500:
            errors.append(f'visible_chars>5500:{count}')
        if source:
            rendered[a['slug']] = source
        intro = a.get('sections', [['','']])[0][1] if a.get('sections') else ''
        intro_pairs.append((a.get('slug','unknown'), intro))
        qa.append({
            'slug':a.get('slug'), 'article_type':a.get('article_type'),
            'visible_chars_no_space':count, 'h2':source.count('<h2>'),
            'faq':source.count('<details>'), 'horizontal_toc':'toc-inner' in source,
            'site_explorer':'data-site-explorer' in source,
            'curiosity_bridges':source.count('curiosity-bridge'),
            'decision_points':len(a.get('decision_points', [])), 'errors':errors
        })

    for i in range(len(intro_pairs)):
        for j in range(i + 1, len(intro_pairs)):
            score = similarity(intro_pairs[i][1], intro_pairs[j][1])
            if score > .72:
                qa[i]['errors'].append(f'intro_cross_duplicate:{intro_pairs[j][0]}:{score:.2f}')
                qa[j]['errors'].append(f'intro_cross_duplicate:{intro_pairs[i][0]}:{score:.2f}')

    fixture_qa = []
    for item in fixtures:
        fixture_qa.append({
            'article_type':item.get('article_type'),
            'errors':validate(item, type_rules, check_links=True)
        })

    failed = bool(nav_errors) or any(x['errors'] for x in qa) or any(x['errors'] for x in fixture_qa)
    status = 'FAIL' if failed else 'PASS'
    write_reports(qa, fixture_qa, nav_errors, status)

    if failed:
        print(json.dumps({'status':status, 'qa':qa, 'fixtures':fixture_qa, 'navigation_errors':nav_errors}, ensure_ascii=False, indent=2))
        return 1

    if not args.verify_only:
        ARTICLES.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='savingio-article-v23-') as tmp:
            stage = Path(tmp)
            for slug, source in rendered.items():
                (stage / f'{slug}.html').write_text(source, encoding='utf-8')
            # Only after every QA has passed, replace the generated sample files.
            for path in stage.glob('*.html'):
                target = ARTICLES / path.name
                temp_target = target.with_suffix('.html.tmp')
                shutil.copy2(path, temp_target)
                temp_target.replace(target)

    manifest = {
        'engine_version':'2.3', 'status':'PASS', 'verify_only':args.verify_only,
        'generated_articles':[
            {'path':f'articles/{slug}.html','sha256':hashlib.sha256(source.encode('utf-8')).hexdigest()}
            for slug, source in sorted(rendered.items())
        ],
        'engine_files':[
            {'path':str(p.relative_to(ROOT)).replace('\\','/'),'sha256':sha256(p)}
            for p in [TEMPLATE, CONFIG, TYPE_RULES, NAVIGATION, Path(__file__), FIXTURES]
            if p.exists()
        ]
    }
    BUILD_MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'status':'PASS','articles':len(rendered),'type_fixtures':len(fixture_qa),'verify_only':args.verify_only}, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main())

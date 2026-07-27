from __future__ import annotations

import hashlib
import html
import json
import math
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

ARTICLES_DIR = Path('articles')
REPORT_JSON = Path('factory/reports/content-cluster-audit.json')
REPORT_MD = Path('factory/reports/content-cluster-audit.md')

STOPWORDS = {
    'savingio','세이빙이오','방법','가이드','정리','확인','하는','위한','에서','으로','까지','부터','그리고','또는',
    'the','and','for','with','guide','check','how','to','of','in','a','an','is','are','2026','html'
}

TOPIC_RULES = [
    ('자동차보험', ['car-insurance','auto-insurance','마일리지','자녀할인','과납보험료']),
    ('자동차세·교통', ['car-tax','traffic-fine','traffic-penalty','vehicle-inspection','regional-development-bond','rental-car','car-aircon','fuel-saving']),
    ('재산세·지방세', ['property-tax','wetax','local-tax','building-land-property-tax']),
    ('부가가치세', ['vat-','hometax-vat','electronic-tax-invoice','tax-invoice-vs-cash-receipt','simple-receipt']),
    ('국세·환급', ['national-tax-refund','hometax-refund','irs-tax-refund','self-employed-income-tax-refund','income-tax-filing','tax-credit-late']),
    ('건강보험·의료비 환급', ['health-insurance','medical-bill','emergency-medical']),
    ('보험 점검', ['insurance-auto-pay','insurance-surrender','duplicate-indemnity','travel-insurance','daily-liability']),
    ('신용점수·부채', ['credit-score','cash-advance','card-loan','revolving','overdraft','loan-refinancing','loan-prepayment','debt-']),
    ('카드·포인트·캐시백', ['card-points','cash-out-card','cashback','credit-card','debit-card']),
    ('예산·소비관리', ['budget','money-management','money-saving-habits','spending-habits','impulse-buying','bank-account-budgeting','emergency-fund']),
    ('은행·예금', ['bank-fee','deposit-protection','dormant-deposit','savings-maturity','cma-account','parking-account']),
    ('전기요금·에어컨', ['electricity','air-conditioner','aircon-','inverter-aircon','fixed-speed-aircon','fan-aircon','dehumidifier','dryer-summer','refrigerator-summer']),
    ('가스·수도·관리비', ['gas-bill','heating-bill','summer-gas','water-bill','summer-water','apartment-management-fee']),
    ('통신비·구독', ['telecom','internet-bill','subscription','cancel-unused']),
    ('정부지원 조회', ['government-benefit','government24','subsidy24','government-support-calendar','benefit-scam','government-benefits-warning']),
    ('에너지·생활요금 지원', ['energy-voucher','low-income-cooling','small-business-electricity','basic-livelihood-discounts']),
    ('근로장려금', ['earned-income-credit','earned-income-tax-credit','child-tax-credit']),
    ('아동·가족 지원', ['child-allowance','childcare','parental-benefit','first-meeting','single-parent','education-benefit','elementary-school-education']),
    ('청년 지원', ['youth-','national-scholarship','student-loan']),
    ('노인·연금·장기요양', ['basic-pension','national-pension','over-60','senior-job','long-term-care']),
    ('저소득·복지', ['housing-benefit','near-poverty','emergency-welfare','culture-nuri','lifelong-education-voucher']),
    ('실업·고용·급여', ['unemployment-benefit','national-employment-support','salary-slip','severance-pay','weekly-holiday-pay','four-major-insurance']),
    ('소상공인·사업자', ['small-business','business-','yellow-umbrella']),
    ('주거·임대차', ['deposit-return','fixed-date','rental-contract','monthly-rent-tax','long-term-repair-reserve','apartment-leak','home-water-leak']),
    ('여행·휴가', ['summer-vacation','peak-season-hotel','travel-insurance','rental-car-vacation']),
    ('식비 절약', ['grocery']),
    ('부업·온라인수익', ['ai-side-hustles','online-income']),
]

TAG_RE = re.compile(r'<[^>]+>')
SCRIPT_STYLE_RE = re.compile(r'<(script|style)\b[^>]*>.*?</\1>', re.I | re.S)
TITLE_RE = re.compile(r'<title[^>]*>(.*?)</title>', re.I | re.S)
H1_RE = re.compile(r'<h1[^>]*>(.*?)</h1>', re.I | re.S)
WORD_RE = re.compile(r'[가-힣]{2,}|[a-zA-Z]{3,}|\d{2,}')

@dataclass
class Article:
    path: str
    slug: str
    title: str
    h1: str
    text: str
    title_tokens: set[str]
    body_tokens: Counter[str]
    body_hash: str
    char_count: int


def clean_markup(value: str) -> str:
    value = SCRIPT_STYLE_RE.sub(' ', value)
    value = TAG_RE.sub(' ', value)
    value = html.unescape(value)
    return re.sub(r'\s+', ' ', value).strip()


def extract(pattern: re.Pattern[str], source: str) -> str:
    match = pattern.search(source)
    return clean_markup(match.group(1)) if match else ''


def tokenize(value: str) -> list[str]:
    words = [w.lower() for w in WORD_RE.findall(value)]
    return [w for w in words if w not in STOPWORDS]


def read_articles() -> list[Article]:
    rows: list[Article] = []
    for path in sorted(ARTICLES_DIR.glob('*.html')):
        source = path.read_text(encoding='utf-8', errors='ignore')
        title = extract(TITLE_RE, source)
        h1 = extract(H1_RE, source)
        visible = clean_markup(source)
        body_words = tokenize(visible)
        counts = Counter({k: min(v, 5) for k, v in Counter(body_words).items()})
        slug = path.stem.lower()
        title_basis = ' '.join([title, h1, slug.replace('-', ' ')])
        normalized = ' '.join(body_words)
        rows.append(Article(
            path=str(path).replace('\\', '/'), slug=slug, title=title, h1=h1, text=visible,
            title_tokens=set(tokenize(title_basis)), body_tokens=counts,
            body_hash=hashlib.sha256(normalized.encode('utf-8')).hexdigest(), char_count=len(visible)
        ))
    return rows


def jaccard(a: set[str], b: set[str]) -> float:
    return len(a & b) / len(a | b) if a and b else 0.0


def cosine(a: Counter[str], b: Counter[str]) -> float:
    if not a or not b:
        return 0.0
    common = set(a) & set(b)
    dot = sum(a[k] * b[k] for k in common)
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


def classify_pair(a: Article, b: Article) -> tuple[str | None, float, float]:
    title_score = jaccard(a.title_tokens, b.title_tokens)
    body_score = cosine(a.body_tokens, b.body_tokens)
    if a.body_hash == b.body_hash:
        return 'exact_body_duplicate', title_score, 1.0
    if title_score >= 0.58 and body_score >= 0.55:
        return 'strong_duplicate', title_score, body_score
    if title_score >= 0.38 and body_score >= 0.45:
        return 'merge_candidate', title_score, body_score
    if title_score >= 0.50:
        return 'title_overlap_review', title_score, body_score
    return None, title_score, body_score


def topic_for(article: Article) -> str:
    haystack = ' '.join([article.slug, article.title.lower(), article.h1.lower()])
    for label, keywords in TOPIC_RULES:
        if any(keyword.lower() in haystack for keyword in keywords):
            return label
    return '기타 독립 주제'


def main() -> None:
    articles = read_articles()
    buckets: dict[str, list[Article]] = {}
    for article in articles:
        buckets.setdefault(topic_for(article), []).append(article)

    groups = []
    pair_count = 0
    group_no = 1
    for topic, members in sorted(buckets.items(), key=lambda item: (-len(item[1]), item[0])):
        if len(members) < 2:
            continue
        relationships = []
        for i, a in enumerate(members):
            for b in members[i + 1:]:
                kind, t, c = classify_pair(a, b)
                if kind:
                    relationships.append({
                        'a': a.path, 'b': b.path, 'classification': kind,
                        'title_similarity': round(t, 4), 'body_similarity': round(c, 4)
                    })
        pair_count += len(relationships)
        groups.append({
            'group_id': f'G{group_no:03d}',
            'topic': topic,
            'size': len(members),
            'articles': [
                {'path': a.path, 'title': a.title, 'h1': a.h1, 'char_count': a.char_count}
                for a in sorted(members, key=lambda x: x.path)
            ],
            'relationships': sorted(relationships, key=lambda x: (-x['title_similarity'], -x['body_similarity'])),
            'decision_status': 'pending_group_review',
            'decision_options': ['대표글 통합', '검색의도 분리 유지', '내용 흡수 후 삭제', '완전 중복 삭제']
        })
        group_no += 1

    standalone = [a.path for a in articles if len(buckets[topic_for(a)]) == 1]
    result = {
        'article_count': len(articles),
        'topic_group_count': len(groups),
        'candidate_pair_count': pair_count,
        'method': 'topic-first grouping; title/body similarity only ranks articles inside the same topic group',
        'groups': groups,
        'standalone_articles': sorted(standalone)
    }
    REPORT_JSON.parent.mkdir(parents=True, exist_ok=True)
    REPORT_JSON.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')

    lines = [
        '# Savingio MASTER CONTENT MAP — 전체 주제 그룹 분류', '',
        f'- 전체 본문: **{len(articles)}개**',
        f'- 2개 이상 주제 그룹: **{len(groups)}개**',
        f'- 그룹 내부 중복·통합 후보 관계: **{pair_count}개**',
        f'- 단독 주제 글: **{len(standalone)}개**', '',
        '> 삭제나 통합을 실행하지 않은 선분류 단계입니다. 각 그룹 전체를 한 번에 놓고 대표글·유지·흡수·삭제를 결정합니다.', ''
    ]
    for group in groups:
        lines += [f"## {group['group_id']} · {group['topic']} · {group['size']}개", '']
        for article in group['articles']:
            label = article['h1'] or article['title'] or article['path']
            lines.append(f"- `{article['path']}` — {label} ({article['char_count']:,}자)")
        lines.append('')
        if group['relationships']:
            lines.append('중복·통합 우선 검토 관계:')
            for rel in group['relationships']:
                lines.append(
                    f"- **{rel['classification']}** · 제목 {rel['title_similarity']:.2f} · 본문 {rel['body_similarity']:.2f} — "
                    f"`{rel['a']}` ↔ `{rel['b']}`"
                )
        else:
            lines.append('중복도 자동 경고 없음 — 검색 의도 기준으로 분리 유지 여부 검토')
        lines += ['', '**그룹 결정:** 미검토 — 대표글 / 독립 유지 / 흡수 후 삭제 / 완전 삭제로 판정 예정', '']

    if standalone:
        lines += ['## 단독 주제 글', ''] + [f'- `{p}`' for p in sorted(standalone)] + ['']
    REPORT_MD.write_text('\n'.join(lines) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()

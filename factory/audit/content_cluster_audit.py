from __future__ import annotations

import hashlib
import html
import json
import math
import re
from collections import Counter, defaultdict, deque
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

ARTICLES_DIR = Path('articles')
REPORT_JSON = Path('factory/reports/content-cluster-audit.json')
REPORT_MD = Path('factory/reports/content-cluster-audit.md')

STOPWORDS = {
    'savingio','세이빙이오','방법','가이드','정리','확인','하는','위한','에서','으로','까지','부터','그리고','또는',
    'the','and','for','with','guide','check','how','to','of','in','a','an','is','are','2026','html'
}

TAG_RE = re.compile(r'<[^>]+>')
SCRIPT_STYLE_RE = re.compile(r'<(script|style)\b[^>]*>.*?</\1>', re.I | re.S)
TITLE_RE = re.compile(r'<title[^>]*>(.*?)</title>', re.I | re.S)
H1_RE = re.compile(r'<h1[^>]*>(.*?)</h1>', re.I | re.S)
WORD_RE = re.compile(r'[가-힣]{2,}|[a-zA-Z]{3,}|\d{2,}')


@dataclass
class Article:
    path: str
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
        # Cap frequency so repeated template text does not dominate similarity.
        counts = Counter(body_words)
        counts = Counter({k: min(v, 5) for k, v in counts.items()})
        title_basis = ' '.join([title, h1, path.stem.replace('-', ' ')])
        title_tokens = set(tokenize(title_basis))
        normalized = ' '.join(body_words)
        rows.append(Article(
            path=str(path).replace('\\', '/'),
            title=title,
            h1=h1,
            text=visible,
            title_tokens=title_tokens,
            body_tokens=counts,
            body_hash=hashlib.sha256(normalized.encode('utf-8')).hexdigest(),
            char_count=len(visible),
        ))
    return rows


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def cosine(a: Counter[str], b: Counter[str]) -> float:
    if not a or not b:
        return 0.0
    common = set(a) & set(b)
    dot = sum(a[k] * b[k] for k in common)
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


def pair_class(a: Article, b: Article) -> tuple[str | None, float, float]:
    t = jaccard(a.title_tokens, b.title_tokens)
    c = cosine(a.body_tokens, b.body_tokens)
    if a.body_hash == b.body_hash:
        return 'exact_body_duplicate', t, 1.0
    if t >= 0.62 and c >= 0.58:
        return 'strong_duplicate', t, c
    if t >= 0.48 and c >= 0.42:
        return 'merge_candidate', t, c
    if t >= 0.62 or c >= 0.72:
        return 'review_candidate', t, c
    return None, t, c


def connected_components(nodes: Iterable[str], edges: list[dict]) -> list[list[str]]:
    graph: dict[str, set[str]] = defaultdict(set)
    for edge in edges:
        graph[edge['a']].add(edge['b'])
        graph[edge['b']].add(edge['a'])
    seen: set[str] = set()
    groups: list[list[str]] = []
    for node in nodes:
        if node in seen or node not in graph:
            continue
        q = deque([node])
        seen.add(node)
        group: list[str] = []
        while q:
            cur = q.popleft()
            group.append(cur)
            for nxt in graph[cur]:
                if nxt not in seen:
                    seen.add(nxt)
                    q.append(nxt)
        groups.append(sorted(group))
    return sorted(groups, key=lambda g: (-len(g), g[0]))


def main() -> None:
    articles = read_articles()
    pairs: list[dict] = []
    for i, a in enumerate(articles):
        for b in articles[i + 1:]:
            kind, title_score, body_score = pair_class(a, b)
            if kind:
                pairs.append({
                    'a': a.path,
                    'b': b.path,
                    'classification': kind,
                    'title_similarity': round(title_score, 4),
                    'body_similarity': round(body_score, 4),
                })

    groups = connected_components((a.path for a in articles), pairs)
    by_path = {a.path: a for a in articles}
    ranked_groups = []
    for idx, paths in enumerate(groups, start=1):
        group_pairs = [p for p in pairs if p['a'] in paths and p['b'] in paths]
        severity_order = {'exact_body_duplicate': 4, 'strong_duplicate': 3, 'merge_candidate': 2, 'review_candidate': 1}
        severity = max((severity_order[p['classification']] for p in group_pairs), default=1)
        ranked_groups.append({
            'group_id': f'G{idx:03d}',
            'size': len(paths),
            'priority': severity,
            'articles': [
                {
                    'path': p,
                    'title': by_path[p].title,
                    'h1': by_path[p].h1,
                    'char_count': by_path[p].char_count,
                }
                for p in paths
            ],
            'relationships': sorted(group_pairs, key=lambda x: (-severity_order[x['classification']], -x['title_similarity'], -x['body_similarity'])),
            'decision_status': 'pending_manual_review',
            'recommended_next_step': 'review_all_articles_in_group_then_choose_merge_keep_or_delete',
        })

    result = {
        'article_count': len(articles),
        'candidate_pair_count': len(pairs),
        'cluster_count': len(ranked_groups),
        'rules': {
            'exact_body_duplicate': '본문 정규화 해시가 동일',
            'strong_duplicate': '제목 유사도 0.62 이상 + 본문 유사도 0.58 이상',
            'merge_candidate': '제목 유사도 0.48 이상 + 본문 유사도 0.42 이상',
            'review_candidate': '제목 유사도 0.62 이상 또는 본문 유사도 0.72 이상',
        },
        'clusters': ranked_groups,
        'standalone_articles': sorted(a.path for a in articles if all(a.path not in g for g in groups)),
    }

    REPORT_JSON.parent.mkdir(parents=True, exist_ok=True)
    REPORT_JSON.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')

    lines = [
        '# Savingio 전체 콘텐츠 중복·유사도 분류 보고서',
        '',
        f'- 전체 본문: **{len(articles)}개**',
        f'- 검토 대상 쌍: **{len(pairs)}개**',
        f'- 그룹: **{len(ranked_groups)}개**',
        '',
        '> 이 보고서는 삭제를 자동 실행하지 않습니다. 각 그룹의 모든 글을 함께 읽고 대표 글 통합·독립 유지·삭제를 결정하기 위한 선분류 자료입니다.',
        '',
    ]
    for group in ranked_groups:
        lines.extend([
            f"## {group['group_id']} · {group['size']}개 글",
            '',
        ])
        for article in group['articles']:
            label = article['h1'] or article['title'] or article['path']
            lines.append(f"- `{article['path']}` — {label} ({article['char_count']:,}자)")
        lines.append('')
        lines.append('유사 관계:')
        for rel in group['relationships']:
            lines.append(
                f"- **{rel['classification']}** · 제목 {rel['title_similarity']:.2f} · 본문 {rel['body_similarity']:.2f} — "
                f"`{rel['a']}` ↔ `{rel['b']}`"
            )
        lines.extend(['', '**결정:** 미검토 — 그룹 전체 비교 후 통합/유지/삭제 결정', ''])

    REPORT_MD.write_text('\n'.join(lines) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()

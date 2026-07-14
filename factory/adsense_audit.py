from __future__ import annotations
from pathlib import Path
import json, re
from urllib.parse import urlparse
from .utils import text_only, save_json, now_iso

REQUIRED_TRUST_PAGES = [
    'about.html','contact.html','privacy.html','terms.html',
    'disclaimer.html','editorial-policy.html'
]

POLICY_PATTERNS = {
    'adult': [r'성인\s*콘텐츠', r'포르노', r'야동'],
    'gambling': [r'도박', r'카지노', r'베팅'],
    'illegal_drugs': [r'마약', r'필로폰', r'대마\s*판매'],
    'weapons': [r'총기\s*판매', r'폭발물\s*제조'],
    'misleading': [r'무조건\s*승인', r'100%\s*수익', r'확실히\s*돈'],
}


def _read(path: Path) -> str:
    return path.read_text(encoding='utf-8', errors='ignore')


def _has(raw: str, pattern: str) -> bool:
    return bool(re.search(pattern, raw, re.I | re.S))


def audit_article(path: Path, project_root: Path, rules: dict) -> dict:
    raw = _read(path)
    low = raw.lower()
    text = text_only(raw)
    title = re.search(r'<title>(.*?)</title>', raw, re.I | re.S)
    h1 = re.findall(r'<h1\b', raw, re.I)
    desc = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)', raw, re.I)
    canonical = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)', raw, re.I)
    robots = re.search(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\']([^"\']+)', raw, re.I)
    internal_links = re.findall(r'href=["\'](/[^"\'#?]*)', raw, re.I)
    external_links = re.findall(r'href=["\'](https?://[^"\']+)', raw, re.I)
    schema = 'application/ld+json' in low
    author = any(token in low for token in ['author', '작성자', '검수자'])
    updated = any(token in text for token in ['업데이트', '최종 수정', '최종 업데이트'])
    faq = 'id="faq"' in low or "id='faq'" in low
    table = '<table' in low
    ads_code = 'adsbygoogle' in low or 'pagead2.googlesyndication.com' in low
    noindex = bool(robots and 'noindex' in robots.group(1).lower())
    placeholder = any(x.lower() in low for x in rules['forbidden_placeholders'])

    policy_hits = []
    for group, patterns in POLICY_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text, re.I):
                policy_hits.append({'group': group, 'pattern': pattern})

    checks = {
        'title': bool(title and text_only(title.group(1))),
        'h1_once': len(h1) == 1,
        'meta_description': bool(desc and len(desc.group(1).strip()) >= 50),
        'canonical': bool(canonical),
        'indexable': not noindex,
        'minimum_text': len(text) >= int(rules['minimum_article_chars']),
        'internal_links': len(set(internal_links)) >= int(rules['minimum_internal_links']),
        'schema': schema,
        'faq_or_table': faq or table,
        'updated_signal': updated,
        'no_placeholder': not placeholder,
        'policy_safe': not policy_hits,
    }

    penalties = {
        'title': 8, 'h1_once': 8, 'meta_description': 8, 'canonical': 8,
        'indexable': 15, 'minimum_text': 18, 'internal_links': 8,
        'schema': 5, 'faq_or_table': 5, 'updated_signal': 4,
        'no_placeholder': 8, 'policy_safe': 20,
    }
    score = max(0, 100 - sum(penalties[k] for k, ok in checks.items() if not ok))
    critical = ['indexable','minimum_text','no_placeholder','policy_safe']
    passed = score >= int(rules['article_pass_score']) and all(checks[k] for k in critical)

    return {
        'path': path.relative_to(project_root).as_posix(),
        'title': text_only(title.group(1)) if title else path.stem,
        'text_chars': len(text),
        'internal_link_count': len(set(internal_links)),
        'external_link_count': len(set(external_links)),
        'ads_code_present': ads_code,
        'checks': checks,
        'policy_hits': policy_hits,
        'score': score,
        'pass': passed,
        'issues': [k for k, ok in checks.items() if not ok],
    }


def audit_site(project_root: Path, rules: dict) -> dict:
    articles_dir = project_root / 'articles'
    article_paths = [p for p in sorted(articles_dir.glob('*.html')) if p.name != 'index.html']
    articles = [audit_article(p, project_root, rules) for p in article_paths]

    trust_pages = {name: (project_root / name).exists() for name in REQUIRED_TRUST_PAGES}
    technical = {
        'robots_txt': (project_root / 'robots.txt').exists(),
        'sitemap_xml': (project_root / 'sitemap.xml').exists(),
        'articles_index': (project_root / 'articles' / 'index.html').exists(),
        'homepage': (project_root / 'index.html').exists(),
        'custom_404': (project_root / '404.html').exists(),
    }
    passed_articles = sum(1 for x in articles if x['pass'])
    thin_articles = [x for x in articles if not x['checks']['minimum_text']]
    policy_risk = [x for x in articles if not x['checks']['policy_safe']]
    noindex_articles = [x for x in articles if not x['checks']['indexable']]
    duplicate_titles = {}
    for row in articles:
        duplicate_titles.setdefault(row['title'].strip().lower(), []).append(row['path'])
    duplicate_titles = {k:v for k,v in duplicate_titles.items() if k and len(v) > 1}

    article_ratio = passed_articles / len(articles) if articles else 0
    trust_ratio = sum(trust_pages.values()) / len(trust_pages)
    technical_ratio = sum(technical.values()) / len(technical)
    readiness = round(article_ratio * 70 + trust_ratio * 15 + technical_ratio * 15)

    blockers = []
    if not all(trust_pages.values()): blockers.append('missing_trust_pages')
    if not all(technical.values()): blockers.append('technical_files_missing')
    if thin_articles: blockers.append('thin_content')
    if policy_risk: blockers.append('policy_risk')
    if noindex_articles: blockers.append('noindex_articles')
    if duplicate_titles: blockers.append('duplicate_titles')
    if article_ratio < float(rules['minimum_article_pass_ratio']): blockers.append('article_quality_ratio')

    report = {
        'generated_at': now_iso(),
        'site': 'https://savingio.com',
        'article_count': len(articles),
        'passed_article_count': passed_articles,
        'failed_article_count': len(articles) - passed_articles,
        'article_pass_ratio': round(article_ratio, 4),
        'adsense_readiness_score': readiness,
        'ready_to_apply': readiness >= int(rules['site_pass_score']) and not blockers,
        'trust_pages': trust_pages,
        'technical': technical,
        'thin_content_count': len(thin_articles),
        'policy_risk_count': len(policy_risk),
        'noindex_count': len(noindex_articles),
        'duplicate_title_groups': duplicate_titles,
        'blockers': blockers,
        'articles': articles,
    }
    return report


def write_reports(project_root: Path, report: dict) -> dict:
    out = project_root / 'factory' / 'output'
    save_json(out / 'adsense_audit.json', report)
    failed = [x for x in report['articles'] if not x['pass']]
    priority = sorted(failed, key=lambda x: (x['score'], x['text_chars']))
    save_json(out / 'adsense_fix_queue.json', {
        'generated_at': report['generated_at'],
        'count': len(priority),
        'items': [
            {'path': x['path'], 'score': x['score'], 'issues': x['issues']}
            for x in priority
        ],
    })
    summary = {
        'adsense_readiness_score': report['adsense_readiness_score'],
        'ready_to_apply': report['ready_to_apply'],
        'article_count': report['article_count'],
        'passed_article_count': report['passed_article_count'],
        'failed_article_count': report['failed_article_count'],
        'thin_content_count': report['thin_content_count'],
        'policy_risk_count': report['policy_risk_count'],
        'noindex_count': report['noindex_count'],
        'blockers': report['blockers'],
        'outputs': ['factory/output/adsense_audit.json','factory/output/adsense_fix_queue.json'],
    }
    save_json(out / 'adsense_summary.json', summary)
    return summary

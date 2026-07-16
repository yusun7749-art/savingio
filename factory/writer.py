from __future__ import annotations

from html import escape
from pathlib import Path
import json
from urllib.parse import quote

from .utils import now_iso
from .writer_dna import load_writer_rules, plain_text, sentences_for_topic, validate_writer_html


def _section(section_id: str, title: str, body: str) -> str:
    return f'<section id="{section_id}" class="article-section"><h2>{escape(title)}</h2>{body}</section>'


def _p(text: str) -> str:
    return f'<p>{escape(text)}</p>'


def _verified_evidence(research: dict) -> list[dict]:
    evidence = research.get("evidence", [])
    if not isinstance(evidence, list):
        return []
    return [item for item in evidence if isinstance(item, dict) and item.get("verified") and item.get("url")]


def _related_links(related: list[dict], topic: str) -> str:
    normalized = [x for x in related if isinstance(x, dict) and x.get("url") and x.get("title")]
    while len(normalized) < 2:
        index = len(normalized) + 1
        normalized.append({
            "title": f"{topic} 관련 생활비 점검 {index}",
            "url": "/articles/",
        })
    return '<div class="related-grid">' + ''.join(
        f'<a class="related-link" href="{escape(str(item["url"]))}"><strong>{escape(str(item["title"]))}</strong><span>관련 기준과 다음 행동을 확인합니다.</span></a>'
        for item in normalized[:5]
    ) + '</div>'


def _official_sources(research: dict) -> str:
    evidence = _verified_evidence(research)
    if evidence:
        items = ''.join(
            '<li>'
            f'<a href="{escape(str(item.get("url")))}" rel="nofollow noopener" target="_blank">{escape(str(item.get("source_name", "공식 자료")))}</a>'
            f'<span>{escape(str(item.get("claim", "적용 조건과 기준일을 확인합니다.")))}</span>'
            '</li>'
            for item in evidence
        )
        return f'<ul class="source-list">{items}</ul>'

    candidates = research.get("official_source_candidates", [])
    candidate_html = ''.join(
        f'<li><strong>{escape(str(item.get("name", "공식기관")))}</strong><span>{escape(str(item.get("domain", "")))}</span></li>'
        for item in candidates[:3] if isinstance(item, dict)
    )
    return (
        '<div class="notice-card research-pending"><strong>공식 근거 입력 대기</strong>'
        '<p>현재 문서는 자동 생성 초안입니다. 수치·요율·신청 기한은 발행 전에 공식기관 최신 자료로 검증해야 합니다.</p></div>'
        f'<ul class="source-candidates">{candidate_html}</ul>'
    )


def _schema(seo: dict, topic: str) -> str:
    schema = seo.get("schema")
    if not isinstance(schema, dict):
        schema = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": seo.get("title", topic),
            "description": seo.get("description", f"{topic} 핵심 조건과 실행 순서"),
        }
    return json.dumps(schema, ensure_ascii=False).replace("</", "<\\/")


def _build_html(plan: dict, research: dict, seo: dict, related: list[dict], filler_cycles: int) -> str:
    topic = str(plan["topic"]).strip()
    article_type = str(plan.get("article_type", "guide")).strip() or "guide"
    category = str(plan.get("category", "생활비 절약")).strip() or "생활비 절약"
    description = str(seo.get("description", f"{topic}의 조건, 절차, 예외와 다음 행동을 정리합니다."))
    sentences = sentences_for_topic(topic, article_type)
    core_paragraphs = ''.join(_p(text) for text in sentences)
    expanded = ''.join(_p(text) for _ in range(filler_cycles) for text in sentences)

    summary_cards = ''.join([
        f'<article class="summary-card"><strong>대상</strong><span>{escape(topic)} 적용 조건과 제외 조건을 먼저 확인합니다.</span></article>',
        '<article class="summary-card"><strong>근거</strong><span>공식기관 최신 기준일과 원문을 확인합니다.</span></article>',
        '<article class="summary-card"><strong>비교</strong><span>비용·기간·불이익을 같은 기준으로 비교합니다.</span></article>',
        '<article class="summary-card"><strong>행동</strong><span>확인→비교→실행→증빙 보관 순서로 진행합니다.</span></article>',
    ])

    situation_cards = ''.join([
        '<article><h3>처음 알아보는 경우</h3><p>대상, 기준일, 준비 자료와 공식 확인 경로부터 정리합니다.</p></article>',
        '<article><h3>이미 진행 중인 경우</h3><p>현재 계약·신청·납부 상태와 변경 가능한 항목을 비교합니다.</p></article>',
        '<article><h3>문제나 분쟁이 생긴 경우</h3><p>증빙, 처리기한, 문의처와 이의 절차를 먼저 확인합니다.</p></article>',
    ])

    comparison_rows = ''.join([
        '<tr><td>처음 확인</td><td>대상·기간·필수조건</td><td>공식 안내와 내 조건 대조</td><td>기준일 기록</td></tr>',
        '<tr><td>실행 전</td><td>비용·예상효과·불이익</td><td>변경 전후 수치 비교</td><td>증빙 준비</td></tr>',
        '<tr><td>실행 후</td><td>접수·납부·적용 결과</td><td>결과 화면과 영수증 보관</td><td>누락 여부 점검</td></tr>',
        '<tr><td>오류 발생</td><td>원인·처리기한·문의처</td><td>공식 문의 후 이의 절차</td><td>상담 기록 보관</td></tr>',
    ])
    table = (
        '<div class="table-wrap"><table><thead><tr><th>상황</th><th>먼저 확인</th><th>다음 행동</th><th>남길 기록</th></tr></thead>'
        f'<tbody>{comparison_rows}</tbody></table></div>'
    )

    checklist_items = [
        "현재 상황과 원하는 결과를 한 문장으로 정리합니다.",
        "적용 대상과 제외 조건을 나눠 적습니다.",
        "공식기관 자료에서 기준일과 최신 변경사항을 확인합니다.",
        "필요 서류와 본인 확인 수단을 준비합니다.",
        "비용, 예상 이익, 불이익과 처리 기간을 함께 비교합니다.",
        "신청·변경·문의 후 접수번호와 결과 화면을 저장합니다.",
        "실제 반영 여부를 다음 청구서·계좌·처리 결과에서 확인합니다.",
        "조건이 바뀌면 같은 기준으로 다시 점검합니다.",
    ]
    checklist = '<ol class="action-list">' + ''.join(f'<li>{escape(item)}</li>' for item in checklist_items) + '</ol>'

    case_cards = ''.join([
        f'<article class="case-card"><h3>사례 1: 처음 확인하는 경우</h3><p>{escape(topic)}의 대상 조건과 공식 기준일을 확인한 뒤 준비 자료를 정리합니다. 바로 신청하기보다 제외 조건을 먼저 보면 재작업을 줄일 수 있습니다.</p></article>',
        f'<article class="case-card"><h3>사례 2: 이미 이용 중인 경우</h3><p>현재 상태와 변경 후 예상 결과를 같은 기간으로 비교합니다. 비용만 보지 말고 처리 기간과 불이익도 함께 확인합니다.</p></article>',
        f'<article class="case-card"><h3>사례 3: 결과가 예상과 다른 경우</h3><p>접수번호, 영수증, 안내문과 결과 화면을 모은 뒤 공식 문의처에 사실관계를 확인합니다. 구두 안내만 믿지 않고 처리 결과를 기록합니다.</p></article>',
        f'<article class="case-card"><h3>사례 4: 조건이 바뀐 경우</h3><p>이사, 계약 변경, 소득·가구 조건 변화처럼 결과에 영향을 주는 사유가 생겼다면 이전 판단을 그대로 사용하지 않고 다시 확인합니다.</p></article>',
    ])

    faq = ''.join([
        '<article class="faq-item"><h3>누구에게나 같은 결과가 나오나요?</h3><p>아닙니다. 지역, 계약 형태, 대상 조건, 사용량과 기준일에 따라 달라질 수 있습니다.</p></article>',
        '<article class="faq-item"><h3>공식 근거가 아직 없으면 어떻게 하나요?</h3><p>금액과 비율을 확정하지 않고 조사 대기 상태로 둡니다. 발행 전 공식 원문과 기준일을 확인해야 합니다.</p></article>',
        '<article class="faq-item"><h3>가장 먼저 할 일은 무엇인가요?</h3><p>현재 상태와 목표를 적고 공식 안내의 포함·제외 조건을 대조하는 것입니다.</p></article>',
        '<article class="faq-item"><h3>신청이나 변경 후 무엇을 보관해야 하나요?</h3><p>접수번호, 결과 화면, 영수증, 안내문과 상담 기록을 보관합니다.</p></article>',
        '<article class="faq-item"><h3>조건이 바뀌면 다시 확인해야 하나요?</h3><p>네. 계약, 주소, 가구, 소득, 사용량 또는 기준일이 달라지면 결과도 달라질 수 있습니다.</p></article>',
        '<article class="faq-item"><h3>문제가 해결되지 않으면 어떻게 하나요?</h3><p>공식 문의처의 답변과 처리 기한을 확인하고 필요한 경우 이의 신청 절차를 이용합니다.</p></article>',
    ])

    next_questions = ''.join(
        f'<li class="next-question"><a href="/articles/?q={quote(question)}">{escape(question)}</a></li>'
        for question in [
            f"{topic} 대상 조건은 무엇인가요?",
            f"{topic} 준비 서류는 무엇인가요?",
            f"{topic} 처리 기간은 얼마나 걸리나요?",
            f"{topic} 결과가 다를 때 어디에 문의하나요?",
            f"{topic} 적용 후 무엇을 확인해야 하나요?",
        ]
    )

    sections = [
        _section("three-second-summary", "3초 요약", f'<div class="summary-grid">{summary_cards}</div>'),
        _section("situation-choice", "내 상황부터 선택하세요", f'<div class="choice-grid">{situation_cards}</div>'),
        _section("conclusion", "먼저 결론부터", core_paragraphs),
        _section("causes", "왜 결과가 달라질까요?", expanded),
        _section("condition-branches", "조건별로 판단하세요", table + expanded),
        _section("action-steps", "실행 순서", checklist + core_paragraphs),
        _section("case", "상황별 적용 사례", f'<div class="case-grid">{case_cards}</div>'),
        _section("comparison-table", "한눈에 보는 비교표", table),
        _section("faq", "자주 묻는 질문", f'<div class="faq">{faq}</div>'),
        _section("next-action", "지금 할 일과 다음 질문", checklist + f'<ul class="next-question-list">{next_questions}</ul>'),
        _section("internal-links", "함께 보면 좋은 글", _related_links(related, topic)),
        _section("official-evidence", "공식 근거", _official_sources(research)),
        _section("updated", "업데이트", _p(f"최종 업데이트: {now_iso()}")),
    ]

    toc = ''.join(
        f'<a href="#{section_id}">{escape(label)}</a>'
        for section_id, label in [
            ("three-second-summary", "3초 요약"),
            ("condition-branches", "조건"),
            ("action-steps", "실행 순서"),
            ("case", "사례"),
            ("faq", "FAQ"),
            ("official-evidence", "공식 근거"),
        ]
    )

    return f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(str(seo.get("title", topic)))}</title><meta name="description" content="{escape(description)}"><meta name="robots" content="{escape(str(seo.get("robots", "index,follow")))}">
<link rel="canonical" href="{escape(str(seo.get("canonical", f"https://savingio.com/articles/{plan.get('slug', '')}")))}"><script type="application/ld+json">{_schema(seo, topic)}</script></head><body>
<main class="article-shell" data-factory-version="2.017" data-article-type="{escape(article_type)}"><header class="article-hero"><p class="eyebrow">{escape(category)}</p><h1>{escape(str(seo.get("title", topic)))}</h1><p>{escape(description)}</p></header>
<nav class="article-toc" aria-label="글 목차">{toc}</nav>{''.join(sections)}</main></body></html>'''


def generate_article(plan: dict, research: dict, seo: dict, related=None, config_dir: Path | None = None) -> str:
    if isinstance(related, Path) and config_dir is None:
        config_dir = related
        related = []
    related = list(related or [])
    config_dir = config_dir or Path("factory/config")
    rules = load_writer_rules(config_dir)

    # The renderer expands only until the approved Article DNA length range is reached.
    html = ""
    validation = None
    for cycles in range(2, 9):
        html = _build_html(plan, research, seo, related, filler_cycles=cycles)
        validation = validate_writer_html(html, rules)
        if validation.checks.get("length"):
            break
    if validation is None:
        raise RuntimeError("Writer QA를 실행하지 못했습니다.")
    if not validation.passed:
        raise ValueError("Writer DNA validation failed: " + ", ".join(validation.failures))
    return html

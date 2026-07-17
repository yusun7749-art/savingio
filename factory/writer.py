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


def _evidence_relevance(item: dict, topic: str) -> int:
    text = " ".join(str(item.get(key, "")) for key in ("source_name", "claim", "excerpt", "url")).lower()
    keywords = [
        token.strip(".,()[]{}")
        for token in topic.lower().split()
        if len(token.strip(".,()[]{}")) >= 2 and token not in {"확인", "방법", "정리"}
    ]
    score = sum(len(keyword) for keyword in keywords if keyword in text)
    if "law.go.kr" in text:
        score += 4
    return score


def _ranked_evidence(research: dict, topic: str) -> list[dict]:
    return sorted(_verified_evidence(research), key=lambda item: _evidence_relevance(item, topic), reverse=True)


def _guidance_paragraphs(topic: str, article_type: str, research: dict) -> list[str]:
    """Build a non-repeating, evidence-aware paragraph pool for the article body."""
    base = sentences_for_topic(topic, article_type)
    evidence_paragraphs: list[str] = []
    for item in _ranked_evidence(research, topic):
        source = str(item.get("source_name", "공식기관")).strip() or "공식기관"
        claim = str(item.get("claim", "")).strip()
        excerpt = str(item.get("excerpt", "")).strip()
        if claim:
            evidence_paragraphs.append(f"{source}의 공식 자료에 따르면 {claim}")
        if excerpt and excerpt != claim:
            evidence_paragraphs.append(
                f"{source} 원문은 다음과 같은 판단 근거를 제시합니다. {excerpt}"
            )
        evidence_paragraphs.append(
            f"이 {source} 자료를 내 상황에 적용할 때는 자료의 기준일, 적용 대상과 예외를 원문에서 다시 확인하고 확인 날짜를 함께 기록해야 합니다."
        )

    practical = [
        f"{topic}을 다룰 때는 먼저 계약서, 관리비 고지서, 납부 내역처럼 현재 상태를 보여 주는 자료를 한곳에 모아야 판단 순서가 흔들리지 않습니다.",
        "같은 이름의 비용이라도 부과 주체와 최종 부담 주체가 다를 수 있으므로, 고지서에 적힌 항목명만 보고 책임을 단정해서는 안 됩니다.",
        "공식 기준과 실제 납부 내역을 나란히 놓고 기간, 납부자, 금액을 대조하면 누락 기간이나 중복 청구를 빠르게 찾을 수 있습니다.",
        "계약 당사자 사이의 정산 문제는 구두 설명보다 계약서 조항, 계좌 이체 내역과 관리사무소 확인 자료를 기준으로 정리하는 편이 안전합니다.",
        "관리사무소에 문의할 때는 전체 납부액뿐 아니라 산정 기간, 월별 금액과 미납 여부를 구분해 달라고 요청해야 이후 정산 자료로 쓰기 쉽습니다.",
        "반환 또는 정산을 요청하기 전에는 요청 금액의 계산식을 작성하고 각 숫자가 어떤 고지서와 납부 내역에서 나온 것인지 표시해 둡니다.",
        "상대방에게 전달하는 요청문에는 확인한 사실, 근거 자료, 요청 금액, 회신을 원하는 날짜를 짧고 명확하게 적는 것이 좋습니다.",
        "자료를 보낼 때는 원본을 넘기기보다 사본이나 전자 파일을 사용하고, 전송 날짜와 수신 여부를 확인할 수 있는 기록을 남깁니다.",
        "계산 결과가 서로 다르면 먼저 기간의 시작일과 종료일, 중간 정산 여부, 이미 반환된 금액이 있는지부터 다시 맞춰 봅니다.",
        "공식 자료가 개정된 경우에는 현재 계약에 어느 시점의 기준이 적용되는지 확인해야 하며, 최신 문서라는 이유만으로 과거 기간에 소급 적용하면 안 됩니다.",
        "금액을 확정하기 어려운 상태에서는 임의의 비율을 적용하지 말고 관리 주체나 공식 상담 창구에서 산정 근거를 확인한 뒤 계산을 갱신합니다.",
        "처리 기한이 정해져 있지 않은 협의라면 합리적인 회신 예정일을 제시하고, 답변이 없을 때 다시 연락할 날짜도 일정에 기록해 둡니다.",
        "분쟁 가능성이 보이면 감정적인 표현을 줄이고 사실, 날짜, 금액과 요청 사항을 분리해 기록해야 제3자가 경위를 이해하기 쉽습니다.",
        "전화 상담을 했다면 상담 날짜, 담당 부서, 안내받은 내용을 메모하고 가능하면 같은 내용을 문서나 공식 답변으로 다시 확인합니다.",
        "정산이 끝난 뒤에는 입금액이 요청액과 같은지 확인하고, 차이가 있다면 공제 항목과 계산 근거를 별도로 요청합니다.",
        "계약 종료나 이사 일정이 있다면 열쇠 인도와 보증금 정산 시점만 보지 말고 별도 관리비 정산이 남아 있는지도 확인합니다.",
        "여러 해의 자료를 확인할 때는 연도별로 파일을 나누고 고지 금액과 실제 납부 금액을 표로 정리하면 계산 오류를 줄일 수 있습니다.",
        "공동명의, 중간 소유권 변경 또는 계약 승계가 있었다면 각 당사자가 책임지는 기간을 먼저 구분한 뒤 금액을 나눠 계산합니다.",
        "관리비 고지서에 세부 항목이 보이지 않으면 관리사무소에 항목별 부과 내역이나 납부확인서 발급 가능 여부를 확인합니다.",
        "공식 원문 링크와 자료 제목을 함께 보관하면 나중에 같은 기준을 다시 찾거나 상대방에게 근거를 설명하기가 수월합니다.",
        "개인정보가 포함된 서류를 공유할 때는 정산에 필요하지 않은 주민등록번호, 계좌 잔액과 다른 거래 내역을 가린 뒤 전달합니다.",
        "합의가 이루어지면 지급 금액, 지급일, 지급 방법과 추가 정산 여부를 문서로 남겨 같은 문제를 다시 논의하지 않도록 합니다.",
        "공식 문의만으로 해결되지 않는다면 보유한 증빙과 문의 기록을 정리한 뒤 해당 분쟁을 다루는 상담 또는 조정 절차를 확인합니다.",
        "최종 판단 전에는 내가 확인한 사실과 아직 확인하지 못한 내용을 분리해 적어, 추정이 확정 사실처럼 전달되지 않도록 합니다.",
        "실행을 마친 뒤에도 고지서, 납부확인서, 요청문과 입금 내역을 같은 폴더에 보관하면 이후 계약이나 세무 확인에 대응하기 쉽습니다.",
        "다른 사람의 사례는 처리 흐름을 이해하는 참고 자료로만 사용하고, 내 계약 기간과 납부 자료를 공식 기준에 대입해 별도로 판단해야 합니다.",
        "오늘 확인한 공식 자료도 향후 개정될 수 있으므로 실제 정산 직전에는 원문이 유지되는지와 시행일이 바뀌지 않았는지 다시 점검합니다.",
        "한 번에 결론을 내리기보다 자료 수집, 기준 확인, 금액 계산, 요청, 결과 검증의 다섯 단계로 나누면 빠뜨린 절차를 찾기 쉽습니다.",
        "증빙이 부족한 기간은 확정 금액에 섞지 말고 별도 표시한 뒤, 추가 자료를 확보했을 때 계산에 반영하는 방식이 안전합니다.",
        "결과를 기록할 때는 최종 금액만 남기지 말고 계산 과정과 참고한 공식 자료의 확인 날짜까지 함께 남겨야 재검증할 수 있습니다.",
    ]
    return base[:1] + evidence_paragraphs + base[1:] + practical


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


def _official_sources(research: dict, topic: str = "") -> str:
    evidence = _ranked_evidence(research, topic) if topic else _verified_evidence(research)
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
    guidance = _guidance_paragraphs(topic, article_type, research)
    paragraph_count = min(len(guidance), 22 + filler_cycles * 4)
    selected = guidance[:paragraph_count]
    first_end = min(6, len(selected))
    remaining = len(selected) - first_end
    causes_end = first_end + remaining // 3
    conditions_end = causes_end + remaining // 3
    conclusion_paragraphs = ''.join(_p(text) for text in selected[:first_end])
    causes_paragraphs = ''.join(_p(text) for text in selected[first_end:causes_end])
    condition_paragraphs = ''.join(_p(text) for text in selected[causes_end:conditions_end])
    action_paragraphs = ''.join(_p(text) for text in selected[conditions_end:])

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
        _section("conclusion", "먼저 결론부터", conclusion_paragraphs),
        _section("causes", "왜 결과가 달라질까요?", causes_paragraphs),
        _section("condition-branches", "조건별로 판단하세요", table + condition_paragraphs),
        _section("action-steps", "실행 순서", checklist + action_paragraphs),
        _section("case", "상황별 적용 사례", f'<div class="case-grid">{case_cards}</div>'),
        _section("comparison-table", "한눈에 보는 비교표", table),
        _section("faq", "자주 묻는 질문", f'<div class="faq">{faq}</div>'),
        _section("next-action", "지금 할 일과 다음 질문", checklist + f'<ul class="next-question-list">{next_questions}</ul>'),
        _section("internal-links", "함께 보면 좋은 글", _related_links(related, topic)),
        _section("official-evidence", "공식 근거", _official_sources(research, topic)),
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

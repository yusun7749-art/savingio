from __future__ import annotations

from dataclasses import dataclass
from html import escape
from pathlib import Path
import json
import re
from typing import Iterable


TAG_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")
PARAGRAPH_RE = re.compile(r"<p(?:\s[^>]*)?>([\s\S]*?)</p>", re.IGNORECASE)

DEFAULT_WRITER_RULES = {
    "version": "1.0",
    "min_plaintext_chars": 3000,
    "max_plaintext_chars": 5500,
    "required_section_ids": [
        "three-second-summary", "situation-choice", "conclusion", "condition-branches",
        "action-steps", "case", "comparison-table", "faq", "next-action",
        "internal-links", "official-evidence", "updated",
    ],
    "minimums": {
        "summary_cards": 4, "cases": 3, "comparison_rows": 3,
        "checklist_items": 7, "faq_items": 5, "next_questions": 5, "related_links": 2,
    },
    "forbidden_tokens": ["{{", "}}", "TODO", "TBD", "undefined"],
}


@dataclass(frozen=True)
class WriterValidation:
    passed: bool
    score: int
    plaintext_chars: int
    checks: dict[str, bool]
    failures: list[str]

    def as_dict(self) -> dict:
        return {
            "pass": self.passed,
            "score": self.score,
            "plaintext_chars": self.plaintext_chars,
            "checks": self.checks,
            "failures": self.failures,
        }


def load_writer_rules(config_dir: Path) -> dict:
    path = config_dir / "writer_quality_rules.json"
    if not path.is_file():
        return json.loads(json.dumps(DEFAULT_WRITER_RULES, ensure_ascii=False))
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("writer_quality_rules.json은 JSON 객체여야 합니다.")
    return payload


def plain_text(html: str) -> str:
    text = TAG_RE.sub(" ", html)
    return SPACE_RE.sub(" ", text).strip()


def _count(html: str, pattern: str) -> int:
    return len(re.findall(pattern, html, flags=re.IGNORECASE))


def _has_no_repeated_paragraphs(html: str) -> bool:
    paragraphs = []
    for value in PARAGRAPH_RE.findall(html):
        normalized = plain_text(value)
        if len(normalized.replace(" ", "")) >= 30:
            paragraphs.append(normalized)
    return len(paragraphs) == len(set(paragraphs))


def validate_writer_html(html: str, rules: dict) -> WriterValidation:
    text = plain_text(html)
    length = len(text.replace(" ", ""))
    minimums = rules.get("minimums", {})
    section_ids = [str(x) for x in rules.get("required_section_ids", [])]
    forbidden = [str(x) for x in rules.get("forbidden_tokens", [])]

    checks = {
        "doctype": html.lstrip().lower().startswith("<!doctype html>"),
        "html_language": 'lang="ko"' in html.lower(),
        "title": "<title>" in html.lower(),
        "meta_description": 'name="description"' in html.lower(),
        "canonical": 'rel="canonical"' in html.lower(),
        "h1": _count(html, r"<h1(?:\s|>)") == 1,
        "length": int(rules.get("min_plaintext_chars", 3000)) <= length <= int(rules.get("max_plaintext_chars", 5500)),
        "required_sections": all(f'id="{sid}"' in html for sid in section_ids),
        "summary_cards": _count(html, r'class="summary-card"') >= int(minimums.get("summary_cards", 4)),
        "cases": _count(html, r'class="case-card"') >= int(minimums.get("cases", 3)),
        "comparison_rows": _count(html, r"<tbody>.*?<tr",) >= 1 and _count(html, r"<tr>") >= int(minimums.get("comparison_rows", 3)) + 1,
        "checklist_items": _count(html, r'class="action-list"[\s\S]*?</ol>') >= 1 and _count(html, r"<li>") >= int(minimums.get("checklist_items", 7)),
        "faq_items": _count(html, r'class="faq-item"') >= int(minimums.get("faq_items", 5)),
        "next_questions": _count(html, r'class="next-question"') >= int(minimums.get("next_questions", 5)),
        "related_links": _count(html, r'class="related-link"') >= int(minimums.get("related_links", 2)),
        "official_section": 'id="official-evidence"' in html,
        "schema": 'type="application/ld+json"' in html.lower(),
        "no_repeated_paragraphs": _has_no_repeated_paragraphs(html),
        "no_template_tokens": not re.search(r"\{\{[^{}]+\}\}", html) and not any(
            token in html for token in forbidden if token not in {"{{", "}}"}
        ),
    }
    failures = [name for name, ok in checks.items() if not ok]
    score = round(sum(checks.values()) / max(1, len(checks)) * 100)
    return WriterValidation(not failures, score, length, checks, failures)


def sentences_for_topic(topic: str, article_type: str) -> list[str]:
    type_sentence = {
        "procedure": "준비물과 처리 순서를 분리하고, 완료 여부를 확인할 수 있는 증빙까지 남겨야 합니다.",
        "comparison": "비교 기준을 먼저 고정한 뒤 비용, 조건, 장단점과 예외를 같은 표에서 판단해야 합니다.",
        "eligibility": "포함 조건과 제외 조건을 나누고 기준일이 바뀌지 않았는지 공식 안내에서 다시 확인해야 합니다.",
        "saving_action": "효과가 큰 행동부터 적용하고 변경 전후 사용량과 비용을 같은 기간으로 비교해야 합니다.",
        "problem_solving": "즉시 확인할 항목, 원인별 분기, 증빙과 이의 절차를 순서대로 점검해야 합니다.",
        "calculator": "입력값의 기준과 결과가 의미하는 범위를 함께 확인해야 숫자를 잘못 해석하지 않습니다.",
        "tax": "과세 기준, 신고 시점, 증빙과 예외를 분리해 확인해야 불필요한 가산세나 재작업을 줄일 수 있습니다.",
        "benefit": "대상, 제외 조건, 신청 기한과 필요 서류를 먼저 확인해야 헛걸음을 줄일 수 있습니다.",
        "guide": "조건, 근거, 실행 순서와 예외를 함께 확인해야 실제 상황에 맞는 결정을 할 수 있습니다.",
    }.get(article_type, "조건, 근거, 실행 순서와 예외를 함께 확인해야 실제 상황에 맞는 결정을 할 수 있습니다.")
    return [
        f"{topic}은 한 가지 요령만 따라 하기보다 현재 상황과 목표를 먼저 정리하는 것이 중요합니다.",
        type_sentence,
        "공식 자료의 기준일과 적용 대상을 확인하고, 확인되지 않은 금액이나 비율은 확정적으로 판단하지 않습니다.",
        "실행 전에는 비용, 예상 이익, 불이익과 처리 기간을 함께 비교하고 결과 화면과 영수증을 보관합니다.",
        "지역, 계약 형태, 가구 구성, 사용량과 신청 시점에 따라 결과가 달라질 수 있으므로 예외 조건을 별도로 확인합니다.",
    ]


def render_paragraphs(sentences: Iterable[str], cycles: int = 2) -> str:
    values = list(sentences)
    return "".join(f"<p>{escape(sentence)}</p>" for _ in range(cycles) for sentence in values)

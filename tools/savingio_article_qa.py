from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "articles"
OUTPUT = ROOT / "ARTICLE-DENSITY-QA.json"

TYPE_RULES = [
    ("calculator", ["계산기", "계산", "실수령액", "예상 금액"]),
    ("procedure", ["신청 방법", "조회 방법", "발급 방법", "등록 방법", "납부 방법", "신고 방법"]),
    ("comparison", ["차이", "비교", "고르는 방법"]),
    ("eligibility", ["대상", "자격", "조건", "기준", "수급"]),
    ("saving_action", ["절약", "줄이는", "아끼는", "낮추는"]),
    ("problem_solving", ["안 왔을 때", "누락", "오류", "급증", "해지", "미납", "찾는 방법"]),
]

GENERIC_PATTERNS = [
    "공식 사이트에서 대상과 기간 확인",
    "신청·신고·변경 절차 진행",
    "관련 혜택과 비용까지 함께 점검",
    "본인의 상황을 구체적으로 설명",
    "개인의 조건과 기준연도에 따라 달라질 수",
]


def classify(title: str) -> str:
    for name, signals in TYPE_RULES:
        if any(signal in title for signal in signals):
            return name
    return "guide"


def text_len(text: str) -> int:
    return len(re.sub(r"\s+", "", text))


def audit(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8", errors="ignore")
    soup = BeautifulSoup(raw, "html.parser")
    title = (soup.find("h1").get_text(" ", strip=True) if soup.find("h1") else path.stem)
    article = soup.find("article") or soup.find("main") or soup.body
    text = article.get_text(" ", strip=True) if article else ""
    headings = [h.get_text(" ", strip=True) for h in soup.select("article h2, main h2")]
    paragraphs = [p.get_text(" ", strip=True) for p in soup.select("article p, main p")]
    first_chunk = " ".join(paragraphs[:3])
    faq_count = len(soup.select(".faq details, [itemtype*='FAQPage'] details"))
    related_links = soup.select(".related-grid a, .related-card, [class*='related'] a")
    calculator_links = [a.get("href", "") for a in soup.find_all("a") if "/calculators/" in a.get("href", "")]
    broken_local = []
    for a in soup.find_all("a", href=True):
        href = a["href"].split("#")[0].split("?")[0]
        if not href.startswith("/") or href == "/":
            continue
        candidate = ROOT / href.lstrip("/")
        if candidate.is_dir():
            candidate = candidate / "index.html"
        elif candidate.suffix == "":
            html_candidate = candidate.with_suffix(".html")
            index_candidate = candidate / "index.html"
            candidate = html_candidate if html_candidate.exists() else index_candidate
        if not candidate.exists():
            broken_local.append(href)

    generic_hits = [pattern for pattern in GENERIC_PATTERNS if pattern in text]
    score = 100
    reasons = []
    length = text_len(text)
    if length < 3500:
        score -= 20; reasons.append("본문 정보량 부족")
    if len(headings) < 6:
        score -= 10; reasons.append("핵심 질문 분기 부족")
    if not any(tag in " ".join(headings[:3]) + first_chunk for tag in ["요약", "결론", "먼저", "확인", "차이", "대상"]):
        score -= 10; reasons.append("초반 즉답 약함")
    if not soup.find("table") and not soup.select(".checklist, .summary-grid, ol, ul"):
        score -= 10; reasons.append("표·체크리스트·구조화 요소 없음")
    if faq_count < 3:
        score -= 10; reasons.append("FAQ 부족")
    if len(related_links) < 2:
        score -= 10; reasons.append("다음 질문 연결 부족")
    if len(generic_hits) >= 2:
        score -= 20; reasons.append("다른 글에도 붙는 일반론 반복")
    if broken_local:
        score -= 30; reasons.append("깨진 내부 링크")

    status = "PASS" if score >= 85 else "REVIEW" if score >= 65 else "FAIL"
    return {
        "file": str(path.relative_to(ROOT)).replace("\\", "/"),
        "title": title,
        "type": classify(title),
        "status": status,
        "score": max(score, 0),
        "text_chars": length,
        "h2_count": len(headings),
        "faq_count": faq_count,
        "related_link_count": len(related_links),
        "calculator_link_count": len(calculator_links),
        "generic_pattern_hits": generic_hits,
        "broken_local_links": sorted(set(broken_local)),
        "reasons": reasons,
    }


def main() -> None:
    rows = [audit(path) for path in sorted(ARTICLES.glob("*.html"))]
    status_counts = Counter(row["status"] for row in rows)
    type_counts = Counter(row["type"] for row in rows)
    report = {
        "version": "1.0",
        "article_count": len(rows),
        "summary": {
            "status": dict(status_counts),
            "types": dict(type_counts),
            "average_score": round(sum(row["score"] for row in rows) / len(rows), 1) if rows else 0,
            "broken_link_articles": sum(bool(row["broken_local_links"]) for row in rows),
            "generic_content_articles": sum(bool(row["generic_pattern_hits"]) for row in rows),
        },
        "articles": rows,
    }
    OUTPUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

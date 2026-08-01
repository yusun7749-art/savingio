from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTICLE_DIR = ROOT / "articles"
REPORT = ROOT / "factory" / "QA" / "RIGHT_RAIL_NORMALIZATION.json"

LABELS = [
    "지금 해야 할 행동",
    "계산기/점검도구",
    "같은 카테고리 글",
    "함께 볼 관련 글",
    "다음 단계/주의사항",
]

FALLBACKS = [
    '<h2>현재 상황부터 확인하세요</h2><p>본문의 핵심 결론과 체크리스트를 먼저 확인하세요.</p><a href="#answer">핵심 결론 보기</a>',
    '<h2>필요한 도구 찾기</h2><p>상황에 맞는 계산기와 점검도구를 확인하세요.</p><a href="/calculators/">계산기 전체 보기</a>',
    '<h2>같은 분야 더 보기</h2><p>현재 글과 같은 분야의 정보를 이어서 확인하세요.</p><a href="/search.html">생활정보 검색</a>',
    '<h2>연관 문제 확인</h2><p>현재 문제와 함께 확인해야 할 관련 정보를 찾아보세요.</p><a href="/categories/">사이트 탐색</a>',
    '<h2>마지막 확인</h2><p>조건과 기한은 바뀔 수 있으므로 공식 안내와 최신 공지를 다시 확인하세요.</p><a href="/editorial-policy.html">콘텐츠 운영 원칙</a>',
]

ASIDE_RE = re.compile(r'(<aside\b[^>]*class=["\'][^"\']*\bright-rail\b[^"\']*["\'][^>]*>)(.*?)(</aside>)', re.I | re.S)
SECTION_RE = re.compile(
    r'<(?P<tag>section|div)\b[^>]*class=["\'][^"\']*\brail-section\b[^"\']*["\'][^>]*>.*?</(?P=tag)>',
    re.I | re.S,
)
KICKER_RE = re.compile(r'<span\b[^>]*class=["\'][^"\']*\brail-kicker\b[^"\']*["\'][^>]*>.*?</span>', re.I | re.S)


def normalize_section(item: str, label: str) -> str:
    item = KICKER_RE.sub('', item)
    inner = re.sub(r'^<(?:section|div)\b[^>]*>|</(?:section|div)>$', '', item, flags=re.I | re.S)
    return f'<section class="rail-section"><span class="rail-kicker">{label}</span>{inner}</section>'


def section_inner(item: str) -> str:
    return re.sub(r'^<(?:section|div)\b[^>]*>|</(?:section|div)>$', '', item, flags=re.I | re.S)


def normalize_article(path: Path) -> dict:
    text = path.read_text(encoding='utf-8', errors='ignore')
    match = ASIDE_RE.search(text)
    if not match:
        return {"path": path.relative_to(ROOT).as_posix(), "status": "skipped_no_right_rail"}

    items = [m.group(0) for m in SECTION_RE.finditer(match.group(2))]
    if not items:
        return {"path": path.relative_to(ROOT).as_posix(), "status": "skipped_no_sections"}

    before = len(items)
    normalized: list[str] = []
    for index in range(5):
        if index < before:
            normalized.append(normalize_section(items[index], LABELS[index]))
        else:
            normalized.append(f'<section class="rail-section"><span class="rail-kicker">{LABELS[index]}</span>{FALLBACKS[index]}</section>')

    if before > 5:
        extras = ''.join(section_inner(item) for item in items[5:])
        normalized[4] = normalized[4].replace('</section>', f'<div class="rail-extra">{extras}</div></section>', 1)

    replacement = match.group(1) + ''.join(normalized) + match.group(3)
    updated = text[:match.start()] + replacement + text[match.end():]
    if updated == text:
        return {"path": path.relative_to(ROOT).as_posix(), "status": "unchanged", "sections": before}

    path.write_text(updated, encoding='utf-8')
    return {"path": path.relative_to(ROOT).as_posix(), "status": "normalized", "before_sections": before, "after_sections": 5}


def main() -> None:
    results = [normalize_article(path) for path in sorted(ARTICLE_DIR.glob('*.html')) if path.name != 'index.html']
    payload = {
        "scanned": len(results),
        "normalized": sum(row["status"] == "normalized" for row in results),
        "unchanged": sum(row["status"] == "unchanged" for row in results),
        "skipped": sum(row["status"].startswith("skipped") for row in results),
        "results": results,
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: payload[k] for k in ["scanned", "normalized", "unchanged", "skipped"]}, ensure_ascii=False))


if __name__ == '__main__':
    main()

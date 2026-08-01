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
SECTION_RE = re.compile(r'<section\b[^>]*class=["\'][^"\']*\brail-section\b[^"\']*["\'][^>]*>.*?</section>', re.I | re.S)
KICKER_RE = re.compile(r'<span\b[^>]*class=["\'][^"\']*\brail-kicker\b[^"\']*["\'][^>]*>.*?</span>', re.I | re.S)


def normalize_section(section: str, label: str) -> str:
    section = KICKER_RE.sub('', section)
    open_end = section.find('>')
    if open_end < 0:
        return section
    kicker = f'<span class="rail-kicker">{label}</span>'
    return section[: open_end + 1] + kicker + section[open_end + 1 :]


def normalize_article(path: Path) -> dict:
    text = path.read_text(encoding='utf-8', errors='ignore')
    m = ASIDE_RE.search(text)
    if not m:
        return {"path": path.relative_to(ROOT).as_posix(), "status": "skipped_no_right_rail"}

    body = m.group(2)
    sections = SECTION_RE.findall(body)
    if not sections:
        return {"path": path.relative_to(ROOT).as_posix(), "status": "skipped_no_sections"}

    original_count = len(sections)
    normalized: list[str] = []
    for idx in range(5):
        if idx < len(sections):
            normalized.append(normalize_section(sections[idx], LABELS[idx]))
        else:
            normalized.append(f'<section class="rail-section"><span class="rail-kicker">{LABELS[idx]}</span>{FALLBACKS[idx]}</section>')

    if len(sections) > 5:
        extras = sections[5:]
        extra_inner = ''.join(
            re.sub(r'^<section\b[^>]*>|</section>$', '', item, flags=re.I | re.S)
            for item in extras
        )
        normalized[4] = normalized[4].replace('</section>', f'<div class="rail-extra">{extra_inner}</div></section>', 1)

    new_aside = m.group(1) + ''.join(normalized) + m.group(3)
    new_text = text[: m.start()] + new_aside + text[m.end() :]
    if new_text == text:
        return {"path": path.relative_to(ROOT).as_posix(), "status": "unchanged", "sections": original_count}

    path.write_text(new_text, encoding='utf-8')
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "status": "normalized",
        "before_sections": original_count,
        "after_sections": 5,
    }


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

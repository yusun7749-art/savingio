from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]

ITEMS = {
    "articles/apartment-leak-emergency-response.html": {
        "asset": "apartment-leak-emergency-response.svg",
        "alt": "아랫집 천장 누수 사고 발생 시 윗집이 확인해야 할 긴급 대응 순서",
    },
    "articles/daily-liability-leak-insurance.html": {
        "asset": "daily-liability-leak-insurance.svg",
        "alt": "일상생활배상책임 특약으로 누수 사고를 접수할 때 준비할 서류와 처리 순서",
    },
    "articles/home-water-leak-self-check.html": {
        "asset": "home-water-leak-self-check.svg",
        "alt": "수도계량기의 숫자와 미세 지침을 비교해 옥내누수 가능성을 확인하는 방법",
    },
    "articles/traffic-fines-difference-guide.html": {
        "asset": "traffic-fines-difference-guide.svg",
        "alt": "범칙금 과태료 벌금의 차이와 고지서 확인 순서를 비교한 안내",
    },
    "articles/ai-side-hustles-beginner.html": {
        "asset": "ai-side-hustles-beginner.svg",
        "alt": "초보자가 AI 부업을 현실적으로 시작하는 준비 순서와 점검 항목",
    },
    "articles/air-conditioner-electricity-saving.html": {
        "asset": "air-conditioner-electricity-saving.svg",
        "alt": "에어컨 적정온도와 선풍기 병행 및 필터 청소로 전기요금을 줄이는 방법",
    },
    "articles/aircon-dry-mode-electricity.html": {
        "asset": "aircon-dry-mode-electricity.svg",
        "alt": "에어컨 냉방모드와 제습모드의 차이 및 전기요금 판단 기준",
    },
    "articles/aircon-filter-cleaning-savings.html": {
        "asset": "aircon-filter-cleaning-savings.svg",
        "alt": "먼지 낀 에어컨 필터와 청소 후 필터의 냉방 효율 차이",
    },
}


def image_url(asset: str) -> str:
    return f"https://savingio.com/images/articles/{asset}"


def upsert_meta(html: str, attr: str, key: str, url: str) -> str:
    pattern = re.compile(rf'<meta\s+[^>]*{attr}=["\']{re.escape(key)}["\'][^>]*>', re.I)
    tag = f'<meta {attr}="{key}" content="{url}">'
    return pattern.sub(tag, html, count=1) if pattern.search(html) else html.replace("</head>", tag + "</head>", 1)


def connect_hero(html: str, url: str, alt: str) -> str:
    figure = (
        '<figure class="factory-article-thumb" data-factory-hero="true">'
        f'<img src="{url}" width="1200" height="630" loading="eager" decoding="async" alt="{alt}">'
        f'<figcaption>{alt}</figcaption></figure>'
    )
    existing = re.compile(r'<figure[^>]*data-factory-hero=["\']true["\'][\s\S]*?</figure>', re.I)
    if existing.search(html):
        return existing.sub(figure, html, count=1)
    hero = re.compile(r'(<section[^>]*class=["\'][^"\']*(?:rb-hero|hero)[^"\']*["\'][^>]*>[\s\S]*?</section>)', re.I)
    if hero.search(html):
        return hero.sub(r"\1" + figure, html, count=1)
    return re.sub(r'(<body[^>]*>)', r"\1" + figure, html, count=1, flags=re.I)


def ensure_style(html: str) -> str:
    if ".factory-article-thumb" in html:
        return html
    style = (
        '<style>.factory-article-thumb{max-width:1120px;margin:24px auto 42px;padding:0 24px}'
        '.factory-article-thumb img{display:block;width:100%;height:auto;aspect-ratio:1200/630;object-fit:cover;border-radius:24px;box-shadow:0 14px 36px rgba(15,76,92,.14)}'
        '.factory-article-thumb figcaption{margin:10px 4px 0;color:#667085;font-size:.92rem}</style>'
    )
    return html.replace("</head>", style + "</head>", 1)


def main() -> int:
    failures: list[str] = []
    changed = 0
    for rel_path, item in ITEMS.items():
        article = ROOT / rel_path
        asset = ROOT / "images" / "articles" / item["asset"]
        if not article.is_file():
            failures.append(f"missing article: {rel_path}")
            continue
        if not asset.is_file():
            failures.append(f"missing asset: {asset.relative_to(ROOT)}")
            continue

        original = article.read_text(encoding="utf-8")
        url = image_url(item["asset"])
        updated = upsert_meta(original, "property", "og:image", url)
        updated = upsert_meta(updated, "name", "twitter:image", url)
        updated = connect_hero(updated, url, item["alt"])
        updated = ensure_style(updated)

        checks = {
            "placeholder remains": "placehold.co" in updated,
            "image URL missing": updated.count(url) < 3,
            "og:image invalid": updated.count('property="og:image"') != 1,
            "twitter:image invalid": updated.count('name="twitter:image"') != 1,
            "hero marker missing": 'data-factory-hero="true"' not in updated,
        }
        failures.extend(f"{rel_path}: {name}" for name, failed in checks.items() if failed)
        if any(checks.values()):
            continue
        if updated != original:
            article.write_text(updated, encoding="utf-8")
            changed += 1
            print(f"FIX: {rel_path}")
        else:
            print(f"PASS: {rel_path}")

    if failures:
        print("FAIL: image pipeline validation")
        for failure in failures:
            print(f" - {failure}")
        return 1
    print(f"PASS: image pipeline complete; articles={len(ITEMS)} changed={changed}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

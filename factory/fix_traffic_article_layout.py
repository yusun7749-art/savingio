from __future__ import annotations

from pathlib import Path
import sys

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
ARTICLE = ROOT / "articles/traffic-fines-difference-guide.html"
SUMMARY_TEXT = "3초 요약"


def main() -> int:
    if not ARTICLE.is_file():
        print(f"FAIL: missing article: {ARTICLE.relative_to(ROOT)}")
        return 1

    original = ARTICLE.read_text(encoding="utf-8")
    soup = BeautifulSoup(original, "html.parser")

    quick_grid = soup.select_one("section.quick-grid")
    if quick_grid is None:
        print("FAIL: quick-grid missing")
        return 1

    author_box = soup.select_one(".savingio-author-box")
    if author_box is None:
        print("FAIL: author box missing")
        return 1

    # 반복 실행으로 쌓인 3초 요약 제목을 모두 제거한 뒤 정확히 하나만 다시 만든다.
    for heading in list(soup.select("h2.quick-summary-title")):
        if heading.get_text(" ", strip=True) == SUMMARY_TEXT:
            heading.decompose()

    # 작성·검수 박스는 요약 카드 밖에서 가로 전체를 차지한다.
    author_box.extract()
    author_box["data-layout-role"] = "full-width-author"

    summary_title = soup.new_tag("h2")
    summary_title["class"] = ["quick-summary-title"]
    summary_title.string = SUMMARY_TEXT

    # 공통 순서: 작성자 박스 → 3초 요약 제목 → 요약 카드.
    quick_grid.insert_before(summary_title)
    summary_title.insert_before(author_box)

    first_card = quick_grid.find("article", recursive=False)
    if first_card is None:
        print("FAIL: first summary card missing")
        return 1

    # 관련 글과 출처는 요약 카드 안에 두지 않고 카드 묶음 뒤 독립 섹션으로 이동한다.
    related = first_card.select_one("section.savingio-related")
    source = first_card.select_one("section.source-note")

    insertion_point = quick_grid
    if related is not None:
        related.extract()
        insertion_point.insert_after(related)
        insertion_point = related
    if source is not None:
        source.extract()
        insertion_point.insert_after(source)

    # 구조 QA
    summary_titles = [
        heading
        for heading in soup.select("h2.quick-summary-title")
        if heading.get_text(" ", strip=True) == SUMMARY_TEXT
    ]
    if len(summary_titles) != 1:
        print(f"FAIL: expected one summary title, found {len(summary_titles)}")
        return 1
    if summary_title.find_next_sibling() is not quick_grid:
        print("FAIL: summary title is not directly before quick-grid")
        return 1
    if author_box.find_next_sibling() is not summary_title:
        print("FAIL: author box is not directly before summary title")
        return 1
    if quick_grid.select_one(".savingio-author-box") is not None:
        print("FAIL: author box remains inside quick-grid")
        return 1
    if first_card.select_one("section.savingio-related") is not None:
        print("FAIL: related section remains inside first summary card")
        return 1
    if first_card.select_one("section.source-note") is not None:
        print("FAIL: source section remains inside first summary card")
        return 1

    updated = str(soup)
    if updated != original:
        ARTICLE.write_text(updated, encoding="utf-8")
        print("FIX: traffic article layout normalized")
    else:
        print("PASS: traffic article layout already normalized")

    return 0


if __name__ == "__main__":
    sys.exit(main())

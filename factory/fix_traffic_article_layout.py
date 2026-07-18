from __future__ import annotations

from pathlib import Path
import sys

from bs4 import BeautifulSoup, Tag

ROOT = Path(__file__).resolve().parents[1]
ARTICLE = ROOT / "articles/traffic-fines-difference-guide.html"
SUMMARY_TEXT = "3초 요약"


def normalized_text(tag: Tag) -> str:
    return " ".join(tag.get_text(" ", strip=True).split())


def main() -> int:
    if not ARTICLE.is_file():
        print(f"FAIL: missing article: {ARTICLE.relative_to(ROOT)}")
        return 1

    original = ARTICLE.read_text(encoding="utf-8")
    soup = BeautifulSoup(original, "html.parser")

    quick_grids = soup.select("section.quick-grid")
    if len(quick_grids) != 1:
        print(f"FAIL: expected one quick-grid, found {len(quick_grids)}")
        return 1
    quick_grid = quick_grids[0]

    author_boxes = soup.select(".savingio-author-box")
    if not author_boxes:
        print("FAIL: author box missing")
        return 1

    # 반복 실행이나 이전 보정 작업으로 생긴 중복 작성자 박스를 제거한다.
    author_box = author_boxes[0]
    for duplicate in author_boxes[1:]:
        duplicate.decompose()

    # 클래스 유무와 관계없이 본문에 쌓인 '3초 요약' 제목을 모두 제거한다.
    for heading in list(soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])):
        if normalized_text(heading) == SUMMARY_TEXT:
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
        for heading in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])
        if normalized_text(heading) == SUMMARY_TEXT
    ]
    if len(summary_titles) != 1:
        print(f"FAIL: expected one summary title, found {len(summary_titles)}")
        return 1
    if summary_titles[0].get("class") != ["quick-summary-title"]:
        print("FAIL: summary title class is not normalized")
        return 1
    if summary_title.find_next_sibling() is not quick_grid:
        print("FAIL: summary title is not directly before quick-grid")
        return 1
    if author_box.find_next_sibling() is not summary_title:
        print("FAIL: author box is not directly before summary title")
        return 1
    if len(soup.select(".savingio-author-box")) != 1:
        print("FAIL: duplicate author boxes remain")
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

from __future__ import annotations

from pathlib import Path
import sys

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
ARTICLE = ROOT / "articles/traffic-fines-difference-guide.html"


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

    author_box = quick_grid.select_one(".savingio-author-box")
    if author_box is None:
        author_box = soup.select_one(".savingio-author-box")
    if author_box is None:
        print("FAIL: author box missing")
        return 1

    # 작성·검수 박스는 요약 카드 밖에서 가로 전체를 차지해야 한다.
    author_box.extract()
    author_box["data-layout-role"] = "full-width-author"
    quick_grid.insert_before(author_box)

    # 정상 템플릿과 동일하게 3초 요약 제목을 카드 그리드 앞에 둔다.
    previous = quick_grid.find_previous_sibling()
    if not (previous and previous.name == "h2" and previous.get_text(" ", strip=True) == "3초 요약"):
        summary_title = soup.new_tag("h2")
        summary_title["class"] = ["quick-summary-title"]
        summary_title.string = "3초 요약"
        quick_grid.insert_before(summary_title)

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

from __future__ import annotations
from pathlib import Path
from html import escape
from .calculator_matcher import match_article_to_calculators
from .calculator_generation_request import create_generation_request
from .utils import save_json, now_iso

def build_solution_package(topic: str, slug: str, project_root: Path) -> dict:
    match = match_article_to_calculators(topic,slug,project_root)
    request = None
    if match["generation_required"]:
        request = create_generation_request(topic,slug,project_root)
    result = {
        "topic":topic,
        "slug":slug,
        "article_url":f"/articles/{slug}.html",
        "calculators":match["linked_calculators"],
        "generation_request":request,
        "status":"linked" if match["linked_calculators"] else ("requested" if request else "not_required"),
        "created_at":now_iso(),
    }
    save_json(project_root/"factory"/"output"/"calculator"/f"{slug}-solution-package.json",result)
    return result

def calculator_html(package: dict) -> str:
    calculators=package.get("calculators",[])
    if not calculators:
        return ""
    cards=[]
    for item in calculators:
        cards.append(
            '<article class="calculator-card">'
            f'<h3>{escape(item["title"])}</h3>'
            '<p>글의 조건을 확인한 뒤 내 값을 직접 입력해 예상 결과를 확인합니다.</p>'
            f'<a class="calculator-run-button" href="{escape(item["url"])}" '
            f'data-calculator-id="{escape(item["calculator_id"])}">계산기 실행하기</a>'
            '</article>'
        )
    return (
        '<!-- factory-calculator-package -->'
        '<section id="recommended-calculators" class="article-section calculator-package">'
        '<h2>내 조건으로 바로 계산해 보세요</h2>'
        '<div class="calculator-grid">'+''.join(cards)+'</div>'
        '<p class="calculator-next-action"><a href="#next-action">계산 결과를 확인한 뒤 다음 행동으로 이어가세요.</a></p>'
        '</section>'
    )

def inject_calculators(html: str, package: dict) -> str:
    block=calculator_html(package)
    if not block or "factory-calculator-package" in html:
        return html
    marker='<section id="next-action"'
    if marker in html:
        return html.replace(marker,block+marker,1)
    return html.replace("</main>",block+"</main>",1)

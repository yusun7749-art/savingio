from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "factory" / "templates" / "savingio-article-master-dna.html"
CALCULATOR_INDEX = ROOT / "calculators" / "index.html"

REQUIRED_LOCKS = {
    'data-dna-lock="header"': "Header",
    'data-dna-lock="left-search"': "좌측 검색",
    'data-dna-lock="brain-tree"': "좌측 Brain Navigation 트리",
    'data-dna-lock="center-column"': "중앙 본문",
    'data-dna-lock="right-rail"': "우측 rail",
    'data-dna-lock="footer"': "Footer",
    'data-dna-lock="three-column-layout"': "PC 3등분",
}

REQUIRED_ASSETS = (
    "/css/article-layout-dna.css",
    "/css/savingio-brain-navigation.css",
    "/css/savingio-article-unified-v3036.css",
    "/css/savingio-article-master-dna.css",
    "/js/savingio-brain-data.js",
    "/js/savingio-brain-navigation.js",
)


def _internal_target(href: str) -> Path:
    clean = href.split("?", 1)[0].split("#", 1)[0]
    target = ROOT / clean.lstrip("/")
    if clean.endswith("/"):
        return target / "index.html"
    if not target.suffix:
        return target.with_suffix(".html")
    return target


def _rail_section(html: str, slot: int) -> str:
    pattern = (
        rf'<section class="rail-section" data-rail-slot="{slot}">'
        rf'(.*?)</section>'
    )
    match = re.search(pattern, html, flags=re.DOTALL)
    return match.group(1) if match else ""


def _validate_calculator_connection(html: str, errors: list[str]) -> None:
    rail2 = _rail_section(html, 2)
    if not rail2:
        errors.append("우측 2번 계산기 슬롯 없음")
        return

    calculator_links = re.findall(
        r'href="(/calculators/[^"?#]+\.html(?:\?[^"#]*)?(?:#[^"]*)?)"', rail2
    )
    if len(calculator_links) != 1:
        errors.append("우측 2번 슬롯에는 현재 글 전용 계산기 링크가 정확히 1개 있어야 함")
        return

    calculator_url = calculator_links[0].split("?", 1)[0].split("#", 1)[0]
    calculator_file = _internal_target(calculator_url)
    if not calculator_file.exists():
        errors.append(f"글 전용 계산기 파일 없음: {calculator_url}")
        return

    if not CALCULATOR_INDEX.exists():
        errors.append("전체 계산기 목록 페이지 없음: /calculators/index.html")
        return

    index_html = CALCULATOR_INDEX.read_text(encoding="utf-8", errors="ignore")
    if calculator_url not in index_html:
        errors.append(f"전체 계산기 목록에 미등록: {calculator_url}")


def render(payload: dict[str, Any]) -> str:
    template = TEMPLATE.read_text(encoding="utf-8")
    missing = sorted(set(re.findall(r"{{([A-Z0-9_]+)}}", template)) - set(payload))
    if missing:
        raise ValueError(f"필수 슬롯 누락: {', '.join(missing)}")
    html = template
    for key, value in payload.items():
        html = html.replace("{{" + key + "}}", str(value))
    leftovers = re.findall(r"{{([A-Z0-9_]+)}}", html)
    if leftovers:
        raise ValueError(f"치환되지 않은 슬롯: {', '.join(sorted(set(leftovers)))}")
    validate_html(html)
    return html


def validate_html(html: str) -> None:
    errors: list[str] = []
    for marker, label in REQUIRED_LOCKS.items():
        if marker not in html:
            errors.append(f"{label} 없음")

    if html.count('class="rail-section"') != 5:
        errors.append("우측 카드가 정확히 5개가 아님")

    slots = re.findall(r'data-rail-slot="([1-5])"', html)
    if slots != ["1", "2", "3", "4", "5"]:
        errors.append("우측 카드 슬롯 순서 오류")

    for asset in REQUIRED_ASSETS:
        if asset not in html:
            errors.append(f"필수 CSS/JS 누락: {asset}")

    if '<main class="article-main"><article>' not in html:
        errors.append("중앙 article 슬롯 없음")

    hrefs = re.findall(r'href="([^"]+)"', html)
    for href in hrefs:
        if href.startswith(("#", "mailto:", "tel:", "http://", "https://")):
            continue
        target = _internal_target(href)
        if not target.exists():
            errors.append(f"존재하지 않는 내부 링크: {href}")

    _validate_calculator_connection(html, errors)

    if errors:
        raise ValueError("DNA QA FAIL\n- " + "\n- ".join(errors))


def validate_file(path: Path) -> None:
    validate_html(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Savingio MASTER DNA renderer/validator")
    sub = parser.add_subparsers(dest="command", required=True)

    render_parser = sub.add_parser("render")
    render_parser.add_argument("payload", type=Path)
    render_parser.add_argument("output", type=Path)

    validate_parser = sub.add_parser("validate")
    validate_parser.add_argument("paths", nargs="+", type=Path)

    args = parser.parse_args()
    try:
        if args.command == "render":
            payload = json.loads(args.payload.read_text(encoding="utf-8"))
            output = args.output if args.output.is_absolute() else ROOT / args.output
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(render(payload), encoding="utf-8")
            print(f"PASS ✅ {output.relative_to(ROOT)}")
        else:
            for raw_path in args.paths:
                path = raw_path if raw_path.is_absolute() else ROOT / raw_path
                validate_file(path)
                print(f"PASS ✅ {path.relative_to(ROOT)}")
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"FAIL ❌ {exc}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

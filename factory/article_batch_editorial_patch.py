#!/usr/bin/env python3
"""Curated editorial completion for the active article batch.

Savingio articles are problem-solving pages, not encyclopedic summaries. Each
curated patch starts with the reader's immediate decision, explains technical
terms in plain Korean, and closes the next-search gaps around safety, cost,
mistakes, and the next action.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "articles"

PATCHES = {
    "car-aircon-fuel-saving": '''<section data-savingio-editorial="car-aircon-fuel-saving-v3" data-savingio-problem-solving="v1">
<h2>에어컨이 덜 시원해졌다면 연비보다 먼저 이렇게 확인하세요</h2>
<div class="callout action"><strong>지금 할 일</strong><ol><li>A/C 버튼과 내기순환 설정을 확인합니다.</li><li>풍량이 약하면 에어컨 필터부터 확인합니다.</li><li>바람은 강한데 미지근하면 냉매 누설 여부를 점검받습니다.</li><li>금속 마찰음·타는 냄새·심한 진동이 있으면 에어컨을 끄고 바로 정비합니다.</li></ol></div>
<h3>증상으로 원인을 빠르게 좁히기</h3>
<div class="summary-grid"><div class="card"><strong>바람 자체가 약함</strong><span>필터 막힘이나 송풍 계통 문제를 먼저 의심합니다. 필터는 차 안으로 들어오는 공기를 거르는 공기청정기 필터와 비슷합니다.</span></div><div class="card"><strong>바람은 강하지만 안 차가움</strong><span>냉매 부족·누설 또는 압축기 계통 점검이 필요할 수 있습니다. 냉매는 정상이라면 자주 보충하는 소모품이 아닙니다.</span></div><div class="card"><strong>처음만 시원하고 곧 미지근함</strong><span>냉매 압력, 센서, 냉각팬 또는 증발기 결빙 등 여러 원인이 있어 단순 충전만으로 해결되지 않을 수 있습니다.</span></div><div class="card"><strong>한쪽 송풍구만 덜 시원함</strong><span>좌우 온도를 나누는 도어·액추에이터 또는 냉매 상태를 함께 확인해야 합니다.</span></div></div>
<h3>정비소에서 바로 부품 교체를 결정하지 않는 질문</h3>
<ul><li>냉매가 부족하다면 누설 검사를 했는지 묻습니다.</li><li>압축기 교체 전 냉매량·압력·퓨즈·릴레이·센서와 냉각팬을 확인했는지 묻습니다.</li><li>진단비, 냉매 회수·충전비, 부품비와 공임을 나눠 견적을 요청합니다.</li><li>수리 후 같은 증상이 반복될 때 재점검 조건을 확인합니다.</li></ul>
<p><strong>압축기(컴프레서)</strong>는 냉매를 순환시키는 에어컨의 심장 같은 부품입니다. 비싼 부품이지만 찬바람이 약하다는 이유만으로 곧바로 고장이라고 단정할 수 없습니다. 냉매 누설과 전기 제어 문제를 먼저 배제해야 불필요한 교체를 줄일 수 있습니다.</p>
<h3>계속 운전해도 되는지 판단</h3>
<p>단순히 냉방이 약하고 이상 소리나 냄새가 없다면 가까운 정비소까지 운전할 수 있는 경우가 많습니다. 그러나 금속 긁는 소리, 타는 냄새, 연기, 엔진 과열 경고, 에어컨 작동 시 심한 출력 저하가 있으면 에어컨을 끄고 안전한 곳에 정차한 뒤 점검을 받는 편이 안전합니다.</p>
<h3>비용을 볼 때 빠뜨리지 말아야 할 기준</h3>
<p>필터 교체는 비교적 단순하지만 냉매 충전 비용은 냉매 종류와 차량에 따라 달라집니다. R-134a와 R-1234yf처럼 사용 냉매가 다르면 가격 차이가 클 수 있습니다. 누설이 있는 상태에서 냉매만 채우면 잠시 시원해졌다가 같은 비용이 반복될 수 있으므로, 견적은 ‘충전’과 ‘누설 진단·수리’를 구분해서 확인합니다.</p>
<div class="callout warn"><strong>하면 안 되는 행동</strong><p>냉방이 약하다고 냉매를 임의로 반복 충전하거나, 타는 냄새와 금속음을 방향제·음악으로 덮고 계속 운행하지 마세요. 폭염에는 연비 절약보다 탑승자의 안전한 실내 온도가 우선입니다.</p></div>
<h3>이 글을 읽고 바로 결정할 수 있는 기준</h3>
<ul><li>설정 문제라면 즉시 바로잡고 냉방 변화를 확인합니다.</li><li>풍량 문제라면 필터와 송풍 계통을 먼저 봅니다.</li><li>찬바람 문제라면 냉매량뿐 아니라 누설 원인을 확인합니다.</li><li>소음·냄새·과열 신호가 있으면 운행보다 정비를 우선합니다.</li></ul>
</section>''',
    "car-insurance-overpayment-refund": '''<section data-savingio-editorial="car-insurance-overpayment-refund-v2"><h2>자동차보험 과납보험료를 실제로 확인하는 순서</h2><p>과납보험료가 의심될 때는 먼저 최근 계약 한 건만 보지 말고 과거 갱신 내역까지 함께 확인해야 합니다. 보험사 변경, 차량 교체, 명의 변경, 운전자 범위 변경이 있었던 시점에 가입 경력이나 할인 등급이 끊겨 반영됐는지 살펴보세요. 같은 이름의 할인 특약이라도 보험사별 적용 조건이 다를 수 있으므로 단순히 다른 사람의 환급 사례와 비교해서는 정확한 판단이 어렵습니다.</p><p>보험증권이나 계약조회 화면에서는 보험기간, 피보험자, 차량번호, 운전자 범위, 가입 경력 인정 기간, 할인·할증 등급을 차례로 확인합니다. 잘못된 부분이 보이면 화면을 캡처하고 보험사 고객센터에 산정 근거를 요청하세요. 상담 과정에서는 단순히 환급 여부만 묻기보다 어떤 정보가 누락됐는지, 어느 계약 기간부터 정정 가능한지, 추가 증빙은 무엇인지 구체적으로 확인하는 편이 좋습니다.</p><h3>가입 경력 증빙으로 자주 확인하는 자료</h3><ul><li>군 운전 경력을 확인할 수 있는 병적증명서 또는 경력확인 자료</li><li>관공서나 법인체 운전직 경력증명서</li><li>해외 자동차보험 가입증명서와 번역·확인 자료</li><li>이전 보험사의 가입경력 또는 무사고 확인 자료</li><li>가족관계와 차량 소유관계를 확인할 수 있는 서류</li></ul><p>필요한 서류는 개인 상황과 보험사 심사 기준에 따라 달라질 수 있습니다. 서류를 준비하기 전에 보험사에 인정 가능한 형식과 발급일 기준을 확인하면 재제출을 줄일 수 있습니다. 원본 제출이 필요한지, 전자문서나 팩스 제출이 가능한지도 함께 물어보세요.</p><h3>환급금이 예상과 다를 때</h3><p>정정이 승인됐더라도 환급금은 보험기간, 이미 적용된 할인, 중도 변경 여부에 따라 예상과 다를 수 있습니다. 보험사에 정정 전 보험료, 정정 후 보험료, 환급 대상 기간, 세부 계산 내역을 요청해 비교하세요. 환급이 거절되거나 설명이 충분하지 않다면 접수번호와 답변 내용을 보관하고 보험사 민원창구 또는 금융 관련 공식 민원 절차를 확인할 수 있습니다.</p><div class="callout warn"><strong>사칭 주의:</strong> 과납보험료 환급을 미끼로 앱 설치, 원격제어, 보안카드 번호나 계좌 비밀번호를 요구하는 연락에는 응하지 마세요. 공식 홈페이지에 직접 접속하거나 보험증권에 적힌 대표번호로 다시 확인해야 합니다.</div></section>''',
}


def insert_before_faq(html: str, section: str) -> str:
    markers = (
        '<section class="faq"',
        "<section class='faq'",
        '<section id="s6"',
        "<h2>자주 묻는 질문</h2>",
    )
    for marker in markers:
        pos = html.find(marker)
        if pos >= 0:
            return html[:pos] + section + html[pos:]
    pos = html.rfind("</article>")
    if pos >= 0:
        return html[:pos] + section + html[pos:]
    raise RuntimeError("Could not locate editorial insertion point")


def replace_previous_patch(html: str, slug: str, section: str) -> tuple[str, bool]:
    pattern = re.compile(
        rf'<section\b[^>]*data-savingio-editorial=["\']{re.escape(slug)}-v\d+["\'][^>]*>.*?</section>',
        flags=re.I | re.S,
    )
    if pattern.search(html):
        return pattern.sub(section, html, count=1), True
    return insert_before_faq(html, section), True


def section_version(slug: str, section: str) -> str:
    match = re.search(rf'data-savingio-editorial=["\']{re.escape(slug)}-(v\d+)["\']', section)
    if not match:
        raise RuntimeError(f"Missing editorial version marker for {slug}")
    return match.group(1)


def main() -> int:
    changed = 0
    for slug, section in PATCHES.items():
        path = ARTICLES / f"{slug}.html"
        html = path.read_text(encoding="utf-8")
        version = section_version(slug, section)
        marker = f'data-savingio-editorial="{slug}-{version}"'
        if marker in html:
            continue
        updated, _ = replace_previous_patch(html, slug, section)
        path.write_text(updated, encoding="utf-8", newline="\n")
        changed += 1
        print(f"patched {path.relative_to(ROOT)} -> {version}")
    print(f"changed={changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

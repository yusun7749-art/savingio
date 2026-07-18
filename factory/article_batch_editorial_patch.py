#!/usr/bin/env python3
"""Curated problem-solving editorial patches for the active Savingio batch."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "articles"

PATCHES = {
    "car-aircon-fuel-saving": '''<section data-savingio-editorial="car-aircon-fuel-saving-v3" data-savingio-problem-solving="v1"><h2>에어컨이 덜 시원해졌다면 연비보다 먼저 이렇게 확인하세요</h2><div class="callout action"><strong>지금 할 일</strong><ol><li>A/C 버튼과 내기순환 설정을 확인합니다.</li><li>풍량이 약하면 에어컨 필터부터 확인합니다.</li><li>바람은 강한데 미지근하면 냉매 누설 여부를 점검받습니다.</li><li>금속 마찰음·타는 냄새·심한 진동이 있으면 에어컨을 끄고 바로 정비합니다.</li></ol></div><h3>증상으로 원인을 빠르게 좁히기</h3><div class="summary-grid"><div class="card"><strong>바람 자체가 약함</strong><span>필터 막힘이나 송풍 계통 문제를 먼저 의심합니다. 필터는 차 안으로 들어오는 공기를 거르는 공기청정기 필터와 비슷합니다.</span></div><div class="card"><strong>바람은 강하지만 안 차가움</strong><span>냉매 부족·누설 또는 압축기 계통 점검이 필요할 수 있습니다. 냉매는 정상이라면 자주 보충하는 소모품이 아닙니다.</span></div><div class="card"><strong>처음만 시원함</strong><span>냉매 압력, 센서, 냉각팬 또는 증발기 결빙 등 여러 원인이 있어 단순 충전만으로 해결되지 않을 수 있습니다.</span></div><div class="card"><strong>한쪽만 덜 시원함</strong><span>좌우 온도를 나누는 도어·액추에이터 또는 냉매 상태를 함께 확인해야 합니다.</span></div></div><h3>계속 운전해도 되는지 판단</h3><p>단순히 냉방이 약하고 이상 소리나 냄새가 없다면 가까운 정비소까지 운전할 수 있는 경우가 많습니다. 그러나 금속 긁는 소리, 타는 냄새, 연기, 엔진 과열 경고가 있으면 에어컨을 끄고 안전한 곳에 정차한 뒤 바로 점검받으세요.</p><h3>비용과 견적을 볼 때</h3><p>필터 교체는 비교적 단순하지만 냉매 충전 비용은 냉매 종류와 차량에 따라 달라집니다. 압축기(컴프레서)는 냉매를 순환시키는 에어컨의 심장 같은 부품입니다. 고가 부품이므로 교체 전 냉매량·누설·퓨즈·릴레이·센서·냉각팬 점검 여부를 묻고 부품비와 공임을 나눠 견적받으세요.</p><div class="callout warn"><strong>하면 안 되는 행동</strong><p>냉방이 약하다고 냉매를 반복 충전하거나, 타는 냄새와 금속음을 무시하고 계속 운전하지 마세요. 폭염에는 연비보다 탑승자의 안전한 실내 온도가 우선입니다.</p></div></section>''',
    "car-insurance-child-discount": '''<section data-savingio-editorial="car-insurance-child-discount-v1" data-savingio-problem-solving="v1"><h2>자녀할인 특약이 빠졌다면 지금 확인할 순서</h2><div class="callout action"><strong>지금 할 일</strong><ol><li>보험증권에서 자녀할인 특약 가입 여부를 확인합니다.</li><li>자녀 나이·임신 여부·가족관계 조건을 현재 보험사 기준으로 대조합니다.</li><li>누락이 의심되면 적용 가능 시작일과 환급 여부를 고객센터에 묻습니다.</li><li>주민등록등본·가족관계증명서 등 필요한 서류 형식을 먼저 확인합니다.</li></ol></div><h3>상황별로 달라지는 확인 포인트</h3><ul><li>출생 전이라면 임신 확인서 인정 여부와 적용 시점을 확인합니다.</li><li>출생 후라면 자녀 생년월일과 피보험자 관계가 계약에 정확히 반영됐는지 봅니다.</li><li>보험사 변경이나 차량 변경이 있었다면 특약이 자동 승계되지 않았을 수 있습니다.</li><li>부부한정·가족한정 등 운전자 범위 변경이 할인 조건에 영향을 주는지 확인합니다.</li></ul><h3>비용과 환급을 판단하는 기준</h3><p>자녀할인 특약은 보험사마다 대상 나이와 할인율이 다릅니다. 단순히 다른 사람의 할인율과 비교하지 말고, 본인 계약의 정정 전 보험료·정정 후 보험료·적용 기간을 나눠 설명해 달라고 요청하세요. 환급이 가능하다면 지급일과 지급 방식도 기록합니다.</p><h3>안전하게 처리하는 방법</h3><p>할인 안내 문자에 있는 링크를 바로 누르기보다 보험사 공식 앱이나 대표번호로 다시 확인하세요. 가족관계 서류는 주민등록번호 뒷자리 등 불필요한 정보가 노출되지 않도록 보험사가 요구한 범위만 제출합니다.</p><div class="callout warn"><strong>하면 안 되는 행동</strong><p>할인을 받기 위해 실제 운전자 범위와 다르게 계약하거나, 확인되지 않은 대행업체에 가족관계 서류를 보내지 마세요. 잘못된 고지는 사고 때 보상 문제로 이어질 수 있습니다.</p></div></section>''',
    "car-insurance-mileage-refund": '''<section data-savingio-editorial="car-insurance-mileage-refund-v1" data-savingio-problem-solving="v1"><h2>마일리지 환급을 놓치지 않는 실행 순서</h2><div class="callout action"><strong>지금 할 일</strong><ol><li>보험 만기일과 최종 주행거리 사진 제출 기한을 확인합니다.</li><li>계기판 전체와 차량번호가 식별되는 사진 조건을 확인합니다.</li><li>보험사 앱에서 최초·최종 주행거리 등록 상태를 확인합니다.</li><li>차량 매도·폐차·중도해지라면 별도 정산 절차를 문의합니다.</li></ol></div><h3>상황별로 환급이 달라지는 경우</h3><ul><li>사진이 흐리거나 계기판 숫자가 잘리면 재제출 요청을 받을 수 있습니다.</li><li>차량 교체나 계기판 교체 이력이 있으면 추가 증빙이 필요할 수 있습니다.</li><li>중도해지와 만기 정산은 계산 기간이 달라 환급액이 예상과 다를 수 있습니다.</li><li>운행거리 구간 경계에 가까우면 인정 주행거리 계산 방식을 확인해야 합니다.</li></ul><h3>비용과 환급액 확인법</h3><p>환급액은 단순히 주행거리만으로 정해지지 않고 보험료, 가입 기간, 특약 구간과 중도 변경 이력에 따라 달라질 수 있습니다. 보험사에 기준 주행거리, 인정 주행거리, 적용 할인율, 실제 환급액을 나눠 설명해 달라고 요청하세요.</p><h3>안전한 제출 기준</h3><p>계기판 사진은 공식 앱이나 공식 홈페이지에 제출합니다. 주행거리 환급을 이유로 원격제어 앱 설치나 계좌 비밀번호를 요구하는 연락은 정상 절차가 아닙니다.</p><div class="callout warn"><strong>하면 안 되는 행동</strong><p>주행거리 사진을 임의로 편집하거나 다른 차량 사진을 제출하지 마세요. 사실과 다른 자료 제출은 특약 취소나 계약상 불이익으로 이어질 수 있습니다.</p></div></section>''',
    "car-insurance-overpayment-refund": '''<section data-savingio-editorial="car-insurance-overpayment-refund-v3" data-savingio-problem-solving="v1"><h2>과납보험료가 의심되면 이렇게 확인하세요</h2><div class="callout action"><strong>지금 할 일</strong><ol><li>최근 계약뿐 아니라 과거 갱신 내역도 함께 엽니다.</li><li>가입 경력, 할인·할증 등급, 피보험자, 차량번호를 확인합니다.</li><li>누락이나 오류가 보이면 화면을 저장하고 산정 근거를 요청합니다.</li><li>정정 가능 기간과 필요한 증빙을 보험사 공식 고객센터에서 확인합니다.</li></ol></div><h3>상황별로 자주 생기는 누락</h3><ul><li>군 운전병·관공서·법인체 운전 경력이 반영되지 않은 경우</li><li>해외 자동차보험 가입 경력이 누락된 경우</li><li>보험사 변경이나 차량 변경 때 할인 등급이 끊긴 경우</li><li>명의 변경 후 피보험자 정보가 잘못 이어진 경우</li></ul><h3>환급액과 비용 계산을 확인하는 질문</h3><p>보험사에 정정 전 보험료, 정정 후 보험료, 환급 대상 기간, 적용된 등급과 실제 환급액을 나눠 설명해 달라고 요청하세요. 과납보험료는 쉽게 말하면 보험료를 계산하는 기초 정보가 뒤늦게 바로잡혀 이미 낸 금액 중 차액이 생긴 경우입니다.</p><h3>거절됐을 때 다음 행동</h3><p>접수번호와 답변 내용을 보관하고, 어떤 증빙이 부족한지 서면으로 확인합니다. 설명이 충분하지 않다면 보험사 민원창구와 공식 금융 민원 절차를 순서대로 이용합니다.</p><div class="callout warn"><strong>하면 안 되는 행동</strong><p>환급을 이유로 원격제어 앱을 설치하거나 계좌·카드 비밀번호를 알려주지 마세요. 문자 속 번호가 아니라 보험증권이나 공식 홈페이지의 대표번호로 다시 확인해야 안전합니다.</p></div></section>''',
    "car-tax-annual-payment": '''<section data-savingio-editorial="car-tax-annual-payment-v1" data-savingio-problem-solving="v1"><h2>자동차세 연납을 지금 신청할지 결정하는 기준</h2><div class="callout action"><strong>지금 할 일</strong><ol><li>현재 연납 신청 가능 기간인지 확인합니다.</li><li>차량번호와 납세자 정보를 준비합니다.</li><li>공식 지방세 납부 경로에서 고지 금액과 할인 반영 여부를 확인합니다.</li><li>차량 매도·폐차 예정이 있다면 환급 처리 방식을 먼저 확인합니다.</li></ol></div><h3>상황별 판단</h3><ul><li>차량을 계속 보유할 예정이면 연납 할인과 자금 여유를 비교합니다.</li><li>곧 매도하거나 폐차할 예정이면 남은 기간 세액 환급 절차를 확인합니다.</li><li>공동명의·법인차량은 납세자 정보와 신청 권한을 확인합니다.</li><li>이전 연도 자동 고지 여부를 믿지 말고 올해 고지 상태를 다시 확인합니다.</li></ul><h3>비용을 계산할 때</h3><p>연납은 1년치 세금을 미리 내고 일정 부분을 공제받는 방식입니다. 쉽게 말하면 선납 할인에 가깝지만, 신청 시점에 따라 실제 공제액이 달라질 수 있습니다. 고지서에서 본세, 지방교육세, 공제액과 최종 납부액을 각각 확인하세요.</p><h3>납부 후 안전 확인</h3><p>납부 완료 화면과 영수증을 저장하고, 카드 납부라면 승인 내역도 확인합니다. 중복 납부가 의심되면 같은 금액을 다시 결제하지 말고 관할 지자체나 공식 납부 시스템에서 처리 상태를 조회하세요.</p><div class="callout warn"><strong>하면 안 되는 행동</strong><p>검색 광고나 문자 링크에서 바로 납부하지 마세요. 자동차세 납부를 가장한 피싱을 피하려면 공식 지방세 사이트나 지자체 안내 경로로 직접 접속해야 합니다.</p></div></section>''',
}


def insert_before_faq(html: str, section: str) -> str:
    for marker in ('<section class="faq"', "<section class='faq'", '<section id="s6"', '<h2>자주 묻는 질문</h2>'):
        pos = html.find(marker)
        if pos >= 0:
            return html[:pos] + section + html[pos:]
    pos = html.rfind("</article>")
    if pos >= 0:
        return html[:pos] + section + html[pos:]
    raise RuntimeError("Could not locate editorial insertion point")


def replace_previous_patch(html: str, slug: str, section: str) -> str:
    pattern = re.compile(rf'<section\b[^>]*data-savingio-editorial=["\']{re.escape(slug)}-v\d+["\'][^>]*>.*?</section>', flags=re.I | re.S)
    return pattern.sub(section, html, count=1) if pattern.search(html) else insert_before_faq(html, section)


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
        path.write_text(replace_previous_patch(html, slug, section), encoding="utf-8", newline="\n")
        changed += 1
        print(f"patched {path.relative_to(ROOT)} -> {version}")
    print(f"changed={changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

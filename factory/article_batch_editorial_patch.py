#!/usr/bin/env python3
"""Curated editorial completion for the active five-article batch.

This is intentionally explicit and slug-scoped. It does not generate generic filler,
and it never overwrites an existing section carrying the same marker.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "articles"

PATCHES = {
    "car-aircon-fuel-saving": '''<section data-savingio-editorial="car-aircon-fuel-saving-v2"><h2>차종과 주행 환경에 따라 달라지는 냉방 효율</h2><p>자동차 에어컨이 연비에 미치는 영향은 차종과 주행 환경에 따라 달라집니다. 내연기관 차량은 압축기를 구동하는 과정에서 엔진 부하가 커질 수 있고, 하이브리드와 전기차는 배터리 전력을 사용하므로 주행 가능 거리에 영향을 줄 수 있습니다. 따라서 특정 온도 하나를 모든 차량의 정답처럼 적용하기보다 제조사 사용설명서의 공조 권장 방식과 현재 차량 상태를 함께 보는 것이 정확합니다.</p><p>도심 정체에서는 낮은 속도로 오래 움직이기 때문에 냉방 시간이 길어지고, 고속도로에서는 창문을 크게 열었을 때 공기저항이 증가할 수 있습니다. 저속에서는 짧은 환기로 열기를 빼고, 속도가 올라가면 창문을 닫은 뒤 공조기를 사용하는 방식이 현실적입니다. 승객이 여러 명이거나 습도가 높은 날에는 단순히 온도만 낮추기보다 제습 기능과 풍향을 함께 조절해야 체감 냉방이 빨라집니다.</p><h3>연비보다 먼저 확인할 안전 기준</h3><p>폭염에는 연료를 아끼려고 냉방을 지나치게 줄이지 마세요. 어린이, 노약자, 반려동물이 탑승한 차량은 짧은 시간에도 실내 온도가 빠르게 상승할 수 있습니다. 주차된 차량에 사람이나 동물을 남겨둔 채 에어컨 작동만 믿는 행동도 피해야 합니다. 냉방 효율은 비용 문제지만, 탑승자의 건강과 안전은 그보다 우선입니다.</p><div class="check"><strong>정비가 필요한 신호</strong><ul><li>같은 설정에서도 예전보다 찬바람이 약합니다.</li><li>송풍구마다 온도 차이가 크게 납니다.</li><li>에어컨을 켰을 때 심한 진동이나 소음이 발생합니다.</li><li>필터 교체 후에도 냄새가 계속 납니다.</li><li>차량 아래에 비정상적인 액체 흔적이 반복됩니다.</li></ul></div></section>''',
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


def main() -> int:
    changed = 0
    for slug, section in PATCHES.items():
        path = ARTICLES / f"{slug}.html"
        html = path.read_text(encoding="utf-8")
        marker = f'data-savingio-editorial="{slug}-v2"'
        if marker in html:
            continue
        updated = insert_before_faq(html, section)
        path.write_text(updated, encoding="utf-8", newline="\n")
        changed += 1
        print(f"patched {path.relative_to(ROOT)}")
    print(f"changed={changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

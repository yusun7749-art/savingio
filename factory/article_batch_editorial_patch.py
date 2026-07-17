#!/usr/bin/env python3
"""Curated editorial completion for the active five-article batch.

This is intentionally explicit and slug-scoped. It does not generate generic filler,
and it never overwrites an existing section carrying the same marker.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "articles"

PATCHES = {
    "car-aircon-fuel-saving": '''<section data-savingio-editorial="car-aircon-fuel-saving-v1"><h2>실제 운전에서 연비를 지키는 에어컨 사용 순서</h2><p>한여름에 차 문을 열자마자 에어컨을 최저 온도와 최대 풍량으로 켜는 경우가 많습니다. 하지만 실내가 이미 뜨겁게 달아오른 상태라면 먼저 창문이나 문을 열어 뜨거운 공기를 밖으로 내보내는 편이 효율적입니다. 출발 전 1~2분 정도 환기하고, 주행을 시작한 뒤에는 외기 모드로 남은 열기를 빼낸 다음 실내 온도가 내려가면 내기 순환으로 전환합니다. 이 순서만 지켜도 냉방기가 최고 부하로 작동하는 시간을 줄일 수 있습니다.</p><p>온도는 무조건 가장 낮게 고정하기보다 탑승자가 불편하지 않은 범위에서 풍량과 함께 조절하는 것이 좋습니다. 짧은 시내 주행에서는 목적지 도착 직전까지 강하게 켜 두기보다 실내가 충분히 시원해진 뒤 풍량을 낮추고, 도착 2~3분 전에는 송풍으로 전환하면 증발기 주변 습기를 줄이는 데도 도움이 됩니다. 다만 폭염이나 영유아·고령자 탑승 시에는 연비보다 안전한 실내 온도 유지가 우선입니다.</p><div class="check"><strong>출발 전 확인</strong><ul><li>그늘 주차나 햇빛가리개로 실내 온도 상승을 줄였는지 확인합니다.</li><li>에어컨 필터가 막혀 풍량이 약해지지 않았는지 점검합니다.</li><li>환기 후 외기 모드, 냉방 안정 후 내기 순환 순서를 적용합니다.</li><li>냉방이 약하거나 냄새가 심하면 냉매를 임의 충전하지 말고 정비소에서 누설 여부를 확인합니다.</li></ul></div></section>''',
    "car-insurance-overpayment-refund": '''<section data-savingio-editorial="car-insurance-overpayment-refund-v1"><h2>과납보험료가 생기는 대표 상황과 확인 순서</h2><p>자동차보험 과납보험료는 보험료를 단순히 비싸게 냈다는 뜻과는 다릅니다. 계약할 때 반영되지 않았던 가입 경력, 군 운전병 경력, 관공서·법인체 운전직 경력, 해외 자동차보험 가입 경력 등이 뒤늦게 인정되거나 할인·할증 등급이 잘못 적용된 경우처럼 보험료 산정 기초가 정정될 때 발생할 수 있습니다. 차량 소유관계나 피보험자 정보가 변경됐는데 계약에 제때 반영되지 않은 경우도 함께 확인할 필요가 있습니다.</p><p>먼저 현재 가입한 보험사의 계약 조회 화면에서 피보험자, 차량번호, 보험기간, 할인·할증 등급과 가입 경력 인정 내용을 확인합니다. 이상이 의심되면 보험사 고객센터에 과납 여부와 필요한 증빙을 문의하고, 경력증명서나 병적증명서처럼 본인 상황에 맞는 자료를 준비합니다. 환급 가능 여부와 금액은 개인별 계약 조건에 따라 달라지므로 문자나 광고 링크보다 보험사 공식 앱·홈페이지 또는 금융 관련 공식 조회 경로를 이용하는 것이 안전합니다.</p><h3>환급 신청 전 꼭 남겨둘 기록</h3><ul><li>보험계약번호와 해당 보험기간</li><li>정정 전후의 가입 경력 및 할인·할증 등급</li><li>제출한 증빙서류와 접수일</li><li>상담한 보험사 부서와 접수번호</li><li>환급 예정 금액, 지급 방식, 처리 예정일</li></ul><div class="callout warn"><strong>주의:</strong> 환급을 이유로 계좌 비밀번호, 카드 비밀번호, 원격제어 앱 설치를 요구하는 연락은 응하지 마세요. 보험료 환급은 반드시 보험사 공식 연락처를 통해 다시 확인해야 합니다.</div></section>''',
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
        marker = f'data-savingio-editorial="{slug}-v1"'
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

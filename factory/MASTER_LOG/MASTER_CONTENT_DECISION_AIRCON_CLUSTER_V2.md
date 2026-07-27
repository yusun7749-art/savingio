# SAVINGIO CONTENT DECISION — AIRCON CLUSTER V2

- 기준: `SAVINGIO_WRITING_CONSTITUTION_V2.md`
- 조사 대상: 에어컨 냉방비 관련 7개 HTML
- 판정일: 2026-07-27

## 1. 조사 대상

1. `articles/air-conditioner-electricity-saving.html`
2. `articles/aircon-dry-mode-electricity.html`
3. `articles/aircon-filter-cleaning-savings.html`
4. `articles/aircon-optimal-temperature-savings.html`
5. `articles/fan-aircon-combination-saving.html`
6. `articles/fixed-speed-aircon-saving.html`
7. `articles/inverter-aircon-saving-guide.html`

## 2. 최종 검색 의도 판정

### A. 종합 냉방비 절약 대표글

- `articles/air-conditioner-electricity-saving.html` — REPRESENTATIVE

사용자가 궁극적으로 해결하려는 문제는 에어컨 전기요금을 줄이면서 실내를 쾌적하게 유지하는 방법이다. 제품 형식 확인, 초기 냉방, 유지 온도, 습도, 공기 순환, 필터와 실외기 점검을 하나의 실행 순서로 연결하는 허브 글로 유지한다.

### B. 대표글 흡수 후 삭제·301 대상

- `articles/aircon-dry-mode-electricity.html` — MERGE CONFIRMED
- `articles/aircon-optimal-temperature-savings.html` — MERGE CONFIRMED
- `articles/fan-aircon-combination-saving.html` — MERGE CONFIRMED

세 글은 각각 제습모드, 설정 온도, 선풍기 병행이라는 하위 질문을 다루지만 최종 행동은 종합 냉방비 절약 순서 안에서 함께 해결된다. 대표글에 아래 고유 내용을 충분히 흡수한 뒤 기존 URL을 삭제하고 301 처리한다.

흡수 필수 항목:

- 제습모드가 냉방보다 항상 저렴하지 않은 이유
- 덥고 습한 경우와 온도는 괜찮고 습도만 높은 경우의 모드 선택
- 특정 온도 하나를 모든 가정에 적용하지 않는 판단 기준
- 초기 집중 냉방 후 1도씩 조정하는 유지 온도 탐색법
- 선풍기·서큘레이터의 위치와 집 구조별 공기 순환 방향
- 새 제품 구매 전 기존 선풍기로 확인하는 방법
- 하루 요금이 아닌 비슷한 날씨의 주간 사용량 비교

예정 Redirect:

- `/articles/aircon-dry-mode-electricity.html` → `/articles/air-conditioner-electricity-saving.html`
- `/articles/aircon-optimal-temperature-savings.html` → `/articles/air-conditioner-electricity-saving.html`
- `/articles/fan-aircon-combination-saving.html` → `/articles/air-conditioner-electricity-saving.html`

### C. 독립 유지 대표글

- `articles/aircon-filter-cleaning-savings.html` — KEEP

검색 목적이 단순 전기요금 절약이 아니라 필터 분리, 안전한 세척, 완전 건조, 냄새·누수·이상음과 전문점검 신호를 확인하는 유지관리 행동이다. 종합글과 연결하되 독립 유지한다.

- `articles/fixed-speed-aircon-saving.html` — KEEP
- `articles/inverter-aircon-saving-guide.html` — KEEP

정속형과 인버터형은 제품 형식 확인 이후 운전 방식과 외출 시 켜고 끄는 판단이 달라 별도 검색 의도가 성립한다. 두 글은 서로 비교·연결하고 종합 대표글에서 제품 유형별 상세 가이드로 보낸다.

## 3. 클러스터 최종 구조

| 역할 | URL 수 |
|---|---:|
| 종합 대표글 | 1 |
| 독립 유지글 | 3 |
| 흡수·삭제·301 확정 | 3 |
| 합계 | 7 |

최종 운영 URL은 4개다.

1. 종합 냉방비 절약
2. 필터 청소·점검
3. 정속형 운전법
4. 인버터형 운전법

## 4. 실행 순서 LOCK

1. `air-conditioner-electricity-saving.html`에 흡수 필수 항목을 새 문장과 새 구조로 보강
2. 대표글 내부에서 필터·정속형·인버터형 독립글로 연결
3. 독립글 3개에서 종합 대표글로 역링크 연결
4. 대표글 품질과 링크 검증
5. 통합 대상 3개 HTML 삭제
6. `_redirects`에 301 세 줄 추가
7. `sitemap.xml`, 글 목록, 카테고리, 관련글 내부링크에서 삭제 URL 제거
8. 실제 URL과 좁은 화면 확인 후 완료 처리

## 5. 전체 진행 현황

| 구분 | 현재 |
|---|---:|
| sitemap 기준 글 URL | 177 |
| V2 검색 의도 분석 완료 | 30 |
| V2 미분석 | 147 |
| 이번 클러스터 분석 | 7 |
| 대표글 확정 | 1 |
| 독립 유지 확정 | 3 |
| 통합·삭제·301 확정 | 3 |
| 이번 문서에서 실제 삭제 | 0 |
| 이번 문서에서 실제 301 | 0 |

> 삭제와 301은 대표글 흡수 및 내부링크 정리가 실제 완료된 뒤에만 실행한다. 계획 상태를 완료로 표시하지 않는다.

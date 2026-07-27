# SAVINGIO MASTER CONTENT DECISION — CAR INSURANCE V2

- 기준 헌법: `SAVINGIO_WRITING_CONSTITUTION_V2.md`
- 분석 대상: 자동차보험 검색 의도 클러스터 4개
- 분석일: 2026-07-27

## 1. 분석 URL

1. `articles/car-insurance-saving.html`
2. `articles/car-insurance-child-discount.html`
3. `articles/car-insurance-mileage-refund.html`
4. `articles/car-insurance-overpayment-refund.html`

## 2. 최종 판정

### 대표 허브 글 — KEEP / REPRESENTATIVE

- `articles/car-insurance-saving.html`

검색 의도:
- 자동차보험 갱신 전 전체 보험료 절약 방법
- 운전자 범위, 연령 조건, 할인특약, 담보, 자기부담금과 비교 순서

판정 이유:
- 자동차보험료를 줄이려는 사용자가 처음 들어오는 종합 검색 의도다.
- 자녀할인과 마일리지 특약을 포함하지만 개별 신청·증빙·환급 절차까지 대신하지는 않는다.
- 세부 글을 연결하는 자동차보험 절약 허브로 유지한다.

### 독립 유지 — KEEP

#### `articles/car-insurance-child-discount.html`

검색 의도:
- 태아·자녀 연령 조건, 가족관계, 증빙서류, 중도 가입과 갱신 확인

판정 이유:
- 자녀가 있는 가입자만 해당하는 명확한 조건형 검색 의도다.
- 임신확인서, 가족관계, 적용 시작일처럼 종합 절약 글에 모두 흡수하면 답변 깊이가 부족해진다.

#### `articles/car-insurance-mileage-refund.html`

검색 의도:
- 마일리지 특약 가입 확인, 계기판 사진 등록, 만기 정산, 차량 변경·중도해지 환급

판정 이유:
- 보험료 비교보다 이미 가입한 특약의 환급을 놓치지 않으려는 실행 의도가 강하다.
- 사진 등록 기한과 최종 정산이라는 독립 행동 단계가 있어 별도 유지 가치가 높다.

#### `articles/car-insurance-overpayment-refund.html`

검색 의도:
- 가입경력·할인정보 누락 등 자동차보험 과납 여부 확인과 공식 환급 요청

판정 이유:
- 일반적인 보험료 절약이나 마일리지 환급과 달리 계약정보가 잘못 반영된 과오납 문제를 해결한다.
- 보험개발원 통합조회와 증빙 제출이라는 별도 공식 절차가 있어 독립 유지한다.

## 3. 중복 경계 LOCK

- `car-insurance-saving.html`은 전체 갱신 점검 순서와 특약 발견 역할만 맡는다.
- 자녀할인의 대상·증빙·중도 적용 세부 절차는 `car-insurance-child-discount.html`에서 해결한다.
- 주행거리 사진 등록·만기 정산·차량 변경은 `car-insurance-mileage-refund.html`에서 해결한다.
- 가입경력 및 할인정보 오류에 따른 과납 환급은 `car-insurance-overpayment-refund.html`에서 해결한다.
- 대표글에서 세부 글의 핵심 답을 반복 복제하지 않고 문제 해결 사슬형 내부링크로 연결한다.

## 4. 삭제·301 판정

| URL | 판정 | 301 |
|---|---|---|
| `car-insurance-saving.html` | 대표 허브 유지 | 없음 |
| `car-insurance-child-discount.html` | 독립 유지 | 없음 |
| `car-insurance-mileage-refund.html` | 독립 유지 | 없음 |
| `car-insurance-overpayment-refund.html` | 독립 유지 | 없음 |

- 이 클러스터에서 삭제 확정 URL은 없다.
- 검색 의도는 모두 구분되므로 현재 301 대상도 없다.

## 5. 내부링크 구조

`car-insurance-saving.html`
→ 자녀가 있으면 `car-insurance-child-discount.html`
→ 주행거리가 짧으면 `car-insurance-mileage-refund.html`
→ 보험료 산출 오류가 의심되면 `car-insurance-overpayment-refund.html`

세부 글 3개에서는 사용자가 갱신 조건 전체를 다시 점검할 수 있도록 대표 허브 글로 되돌아가는 링크를 유지한다.

## 6. V2 누적 현황

| 구분 | 현재 |
|---|---:|
| sitemap 기준 글 URL | 177 |
| 이전 V2 분석 완료 | 46 |
| 이번 분석 | 4 |
| V2 분석 완료 누계 | 50 |
| V2 미분석 | 127 |
| 이번 삭제 확정 | 0 |
| 이번 301 확정 | 0 |

## 7. 결론

자동차보험 클러스터는 종합 절약 글 1개와 조건·환급별 독립 실행 글 3개의 허브 구조로 유지한다. 글 수를 줄이기 위한 억지 통합보다 사용자가 현재 문제에 맞는 정확한 절차로 이동하도록 내부링크를 강화하는 것이 적합하다.

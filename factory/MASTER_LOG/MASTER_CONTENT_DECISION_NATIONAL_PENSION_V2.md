# MASTER CONTENT DECISION — NATIONAL PENSION V2

작성일: 2026-07-28
저장소: yusun7749-art/savingio
대상 범위: 국민연금 관련 운영 글 3개

## 1. 검토 대상

1. `articles/national-pension-additional-payment.html`
2. `articles/national-pension-old-age-benefit-guide.html`
3. `articles/national-pension-overpayment-refund.html`

## 2. 최종 결정

### A. 대표 허브 유지

- `national-pension-old-age-benefit-guide.html`
- 역할: 국민연금 노령연금의 가입기간, 수급개시연령, 예상연금액, 조기·연기수령, 청구 절차를 연결하는 대표 허브
- 이유: 국민연금 전체 탐색의 시작점으로 가장 넓은 검색 의도와 문제 해결 범위를 가짐

### B. 독립 글 유지

- `national-pension-additional-payment.html`
- 역할: 납부예외·가입 공백이 있는 사용자의 추후납부 가능 기간, 보험료 계산, 분할납부 및 유불리 판단
- 대표 허브와 검색 의도 중복이 낮으므로 독립 유지

- `national-pension-overpayment-refund.html`
- 역할: 자격 변동·이중 납부 등으로 발생한 국민연금 과오납금의 조회, 충당, 환급 신청
- 추후납부·노령연금과 제도 목적이 다르므로 독립 유지

## 3. 통합·삭제 결정

- 즉시 통합 대상: 없음
- 즉시 삭제 대상: 없음
- URL 삭제 대상: 없음

세 글은 모두 국민연금이라는 공통 주제를 가지지만 사용자 사건과 검색 의도가 다르다.

- 받을 연금과 수급 시기를 확인하려는 사용자 → 노령연금 허브
- 부족한 가입기간을 채우려는 사용자 → 추후납부
- 잘못 낸 보험료를 돌려받으려는 사용자 → 과오납 환급

따라서 하나로 합치면 오히려 검색 의도와 실행 경로가 흐려진다.

## 4. 구조 및 품질 조치

### 공통 조치

- 세 글을 별도 `노후·연금` 카테고리 허브 아래 연결
- 현재 사용 중인 `/categories/government-support.html` 링크는 장기적으로 노후·연금 전용 카테고리 경로로 분리 검토
- 대표 허브에서 추후납부와 과오납 환급으로 문제 해결 사슬형 내부 링크 연결
- 각 독립 글에서 노령연금 허브로 복귀하는 링크 배치
- 공식 국민연금공단 조회·신청 경로는 최신 화면과 명칭 검증 후 연결

### 파일별 조치

#### `national-pension-old-age-benefit-guide.html`

- 국민연금 대표 허브로 유지
- 가입기간 10년 미달 상황에서 추후납부 글로 연결
- 보험료 과오납·중복 납부 상황에서 과오납 환급 글로 연결
- 기초연금과의 차이는 별도 주제 확장 가능하나 본 글의 핵심 검색 의도를 침범하지 않도록 제한

#### `national-pension-additional-payment.html`

- 추후납부 가능 기간과 현재 보험료 기준을 단정하지 않고 개인별 조회 기준으로 유지
- 예상연금 증가액과 총 납부액 비교 흐름 강화
- 임의계속가입과 추후납부 차이를 명확히 분리

#### `national-pension-overpayment-refund.html`

- 반환일시금과 과오납 환급의 차이를 명확히 유지
- 사업장가입자의 사용자·근로자 부담분 귀속 확인 절차 강화
- 환급금 조회 후 미납 충당 여부와 지급 계좌 확인 순서를 유지

## 5. 내부 링크 설계

`national-pension-old-age-benefit-guide.html`
→ 가입기간 부족: `national-pension-additional-payment.html`
→ 보험료 중복·과납: `national-pension-overpayment-refund.html`

`national-pension-additional-payment.html`
→ 추납 후 받을 시기와 예상액: `national-pension-old-age-benefit-guide.html`

`national-pension-overpayment-refund.html`
→ 환급과 별도로 노후 연금 수급 확인: `national-pension-old-age-benefit-guide.html`

## 6. 최종 판정

- 대표 허브: 1개
- 독립 유지: 2개
- 통합: 0개
- 삭제: 0개
- 분석 완료 글: 3개

누적 분석 진행률: 65 / 177
남은 분석 대상: 112

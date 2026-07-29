# MASTER CONTENT DECISION — SENIOR BENEFITS V2

작성일: 2026-07-29
저장소: yusun7749-art/savingio
대상 범위: 60세 이상 복지·기초연금·노인일자리·장기요양 관련 운영 글 4개

## 1. 검토 대상

1. `articles/over-60-benefits-guide.html`
2. `articles/basic-pension-application-guide.html`
3. `articles/senior-job-application-guide.html`
4. `articles/long-term-care-insurance-application.html`

## 2. 최종 결정

### A. 대표 허브 유지

- `over-60-benefits-guide.html`
- 역할: 60세 이후 확인할 연금, 건강, 일자리, 생활비·지역 감면을 한 번에 탐색하는 상위 안내 허브
- 이유: 특정 제도 하나가 아니라 사용자가 나이와 생활 상황을 기준으로 다음 행동을 고르는 가장 넓은 검색 의도를 가짐

### B. 독립 글 유지

- `basic-pension-application-guide.html`
- 역할: 만 65세 전후 기초연금 신청 시기, 소득인정액 확인, 준비서류와 결과 확인
- 국민연금 노령연금과 제도 목적·재원·선정 기준이 다르므로 독립 유지

- `senior-job-application-guide.html`
- 역할: 노인일자리 모집 시기, 참여 조건, 사업 유형 비교, 신청과 면접 준비
- 현금성 급여나 연금이 아니라 근로·사회활동 참여를 위한 실행 의도이므로 독립 유지

- `long-term-care-insurance-application.html`
- 역할: 장기요양 인정 신청, 방문조사, 의사소견서, 등급판정, 서비스 선택과 본인부담 확인
- 연령만으로 지급되는 혜택이 아니며 건강·돌봄 필요도에 따라 판정되는 별도 제도이므로 독립 유지

## 3. 통합·삭제 결정

- 즉시 통합 대상: 없음
- 즉시 삭제 대상: 없음
- URL 삭제 대상: 없음

네 글은 모두 고령층 생활 문제와 연결되지만 검색 의도와 사용자의 사건이 다르다.

- 무엇을 받을 수 있는지 전체적으로 찾는 사용자 → 60세 이상 혜택 허브
- 기초연금 수급 가능성과 신청을 확인하는 사용자 → 기초연금
- 소득·활동 기회를 찾는 사용자 → 노인일자리
- 일상생활 지원과 돌봄 서비스가 필요한 사용자 → 장기요양보험

따라서 대표 허브에서 갈라지는 구조가 적절하며, 하나의 장문으로 통합하면 신청 조건과 실행 경로가 섞여 오히려 가치가 낮아진다.

## 4. 구조 및 품질 조치

### 공통 조치

- `over-60-benefits-guide.html`을 상위 허브로 지정하고 세 독립 글을 문제 해결 사슬형으로 연결
- 국민연금 노령연금 허브와 기초연금 글 사이에 차이·동시 수급 가능성 확인 링크 배치
- 연령, 소득, 건강 상태, 지역별 모집·감면처럼 변동 가능한 조건은 단정하지 않고 공식 조회 기준으로 작성
- 주민센터, 복지로, 국민연금공단, 노인일자리 여기, 국민건강보험공단 등 공식 신청 경로의 최신 명칭과 URL을 발행 전 검증
- “60세 이상이면 자동 지급”처럼 오해를 만드는 표현 금지

### 파일별 조치

#### `over-60-benefits-guide.html`

- 대표 허브로 유지
- 연령대별로 60세, 65세, 75세 이상을 단순 나열하기보다 연금·건강·일자리·생활비 순서로 행동 경로 제시
- 전국 공통 제도와 지자체별 혜택을 명확히 분리
- 기초연금, 노인일자리, 장기요양보험으로 직접 이동하는 요약 카드와 내부 링크 배치

#### `basic-pension-application-guide.html`

- 국민연금 노령연금과 기초연금의 차이를 초반에 명확히 설명
- 소득인정액은 단순 월소득만이 아니라 재산 환산이 포함된다는 점을 강조
- 신청 가능 시기, 부부가구 감액 가능성, 결과 통지와 이의신청 흐름 강화
- 선정기준액과 지급액은 연도별 변동 가능성이 있으므로 공식 확인 경로 중심으로 유지

#### `senior-job-application-guide.html`

- 공익활동형, 사회서비스형, 시장형 등 사업 유형별 참여 조건과 활동 특성 비교
- 모집 시기와 급여·활동비를 전국 동일 조건처럼 단정하지 않음
- 거주지 수행기관, 주민센터, 노인일자리 여기에서 공고를 확인하는 순서 강화
- 연금 수급 여부와 근로소득의 관계는 개인별 제도 확인이 필요하다는 주의문구 배치

#### `long-term-care-insurance-application.html`

- 장기요양등급과 장애등급, 노인맞춤돌봄서비스를 혼동하지 않도록 차이 설명
- 신청 → 방문조사 → 의사소견서 → 등급판정 → 급여계약 순서를 실제 행동 기준으로 유지
- 가족이 대신 신청하는 경우 필요한 관계·위임 확인 절차 포함
- 본인부담률, 감경, 재가·시설급여 선택은 개인 판정과 최신 기준 확인을 우선

## 5. 내부 링크 설계

`over-60-benefits-guide.html`
→ 만 65세 전후 생활비 지원 확인: `basic-pension-application-guide.html`
→ 소득·사회활동 기회 확인: `senior-job-application-guide.html`
→ 일상생활 돌봄이 필요함: `long-term-care-insurance-application.html`
→ 국민연금 수급 시기와 예상액 확인: `national-pension-old-age-benefit-guide.html`

`basic-pension-application-guide.html`
→ 다른 고령층 혜택 전체 확인: `over-60-benefits-guide.html`
→ 국민연금과 비교: `national-pension-old-age-benefit-guide.html`

`senior-job-application-guide.html`
→ 다른 고령층 지원 확인: `over-60-benefits-guide.html`

`long-term-care-insurance-application.html`
→ 연금·일자리·생활비 지원 함께 확인: `over-60-benefits-guide.html`

## 6. 최종 판정

- 대표 허브: 1개
- 독립 유지: 3개
- 통합: 0개
- 삭제: 0개
- 분석 완료 글: 4개

누적 분석 진행률: 69 / 177
남은 분석 대상: 108

## 7. 다음 분석 후보

다음 클러스터는 아동·교육 지원 묶음으로 진행한다.

우선 검토 후보:

- `parental-benefit-guide.html`
- `child-allowance-application-guide.html`
- `child-care-service-government-support.html`
- `first-meeting-voucher-guide.html`
- `education-benefit-application.html`
- `education-expense-support-difference.html`
- `national-scholarship-application.html`
- `lifelong-education-voucher-guide.html`
- `student-loan-repayment-guide.html`

# SAVINGIO MASTER CONTENT MAP V2 — BATCH 01

- 기준 헌법: `SAVINGIO_WRITING_CONSTITUTION_V2.md`
- 대상: sitemap.xml의 첫 번째 글 묶음
- 분석 범위: 21개 URL
- 상태 표기
  - `KEEP` 검색 의도가 독립적이어서 대표글 후보로 유지
  - `REPRESENTATIVE` 동일 검색 의도 묶음의 대표글 후보
  - `MERGE CANDIDATE` 대표글에 정보·질문·사례를 흡수한 뒤 삭제 및 301 검토
  - `RESEARCH` 본문과 관련 글 전체 확인 후 최종 판정

## 1. 검색 의도 그룹 판정

### A. AI 부업 시작

**대표글 후보**
- `articles/ai-side-hustles-beginner.html` — REPRESENTATIVE

**핵심 검색 의도**
- AI로 처음 부업을 시작하는 현실적인 순서
- 서비스 선정, 포트폴리오, 첫 고객, 가격, 저작권, 개인정보, 세금, 사기 예방

**판정**
- 현재 sitemap 첫 묶음 안에는 직접 중복 글이 없음.
- 독립 대표글로 유지하되 이후 부업·사업 카테고리 전체 조사 후 흡수 범위를 확정한다.

---

### B. 에어컨 전기요금 절약

**대표글 후보**
- `articles/air-conditioner-electricity-saving.html` — REPRESENTATIVE

**동일 문제 해결 사슬 / 통합 검토 대상**
- `articles/aircon-dry-mode-electricity.html` — MERGE CANDIDATE
- `articles/aircon-filter-cleaning-savings.html` — MERGE CANDIDATE
- `articles/aircon-optimal-temperature-savings.html` — MERGE CANDIDATE

**후속 배치에서 함께 조사할 관련 URL**
- `articles/fan-aircon-combination-saving.html`
- `articles/fixed-speed-aircon-saving.html`
- `articles/inverter-aircon-saving-guide.html`

**검색 의도 판정**
- 사용자가 궁극적으로 묻는 질문은 “에어컨 전기요금을 실제로 어떻게 줄이는가”이다.
- 제습모드, 필터 청소, 적정 온도, 선풍기 병행, 정속형·인버터형은 독립 목적이 아니라 같은 문제를 해결하는 하위 질문일 가능성이 높다.

**V2 처리 방향**
1. 관련 글 7개 전체 본문 조사
2. 정부·공공기관·제조사 공식자료 확인
3. `air-conditioner-electricity-saving.html`을 최종 가이드로 재창조
4. 하위 글의 고유 정보·표·FAQ·사례 흡수
5. 검색 의도가 완전히 겹치는 글은 삭제 후 301
6. 제품 유형처럼 독립 검색 의도가 확인되는 글만 별도 대표글 유지

**현재 판정**
- 대표글 1개
- 통합 후보 3개
- 추가 조사 대상 3개

---

### C. 여름철 아파트 관리비

- `articles/apartment-management-fee-summer.html` — KEEP

**검색 의도**
- 여름철 아파트 관리비가 오른 이유와 항목별 절감·오류 확인

**판정**
- 에어컨 전기요금과 연관되지만 관리비 고지서 전체를 다루는 별도 검색 의도다.
- 독립 대표글 후보로 유지한다.

---

### D. 자동이체·구독·고정비 정리

**대표글 후보**
- `articles/automatic-payment-saving.html` — REPRESENTATIVE

**통합 검토 대상**
- `articles/cancel-unused-subscriptions.html` — MERGE CANDIDATE

**검색 의도 판정**
- 자동이체·자동결제 글은 계좌, 카드, 휴대폰, 앱스토어, 렌탈, 보험, 구독을 한 번에 찾고 유지·변경·해지하는 전체 문제를 다룬다.
- 사용하지 않는 구독 해지는 이 전체 문제의 핵심 하위 질문이다.

**V2 처리 방향**
1. 두 글의 고유 질문과 사례를 비교
2. 구독 해지의 플랫폼별 확인 위치, 무료체험, 결제일, 환불, 가족 결제, 해지 후 재청구 내용을 대표글에 흡수
3. 별도 검색 의도가 남지 않으면 `cancel-unused-subscriptions.html` 삭제
4. `/articles/cancel-unused-subscriptions.html` → `/articles/automatic-payment-saving.html` 301
5. sitemap·내부링크·카테고리 목록 정리

**현재 판정**
- 대표글 1개
- 통합 후보 1개

---

### E. 초보 돈 관리·예산 시스템

**대표글 후보**
- `articles/beginner-money-management.html` — REPRESENTATIVE CANDIDATE

**통합 검토 대상**
- `articles/beginner-budget-plan.html` — MERGE CANDIDATE
- `articles/bank-account-budgeting.html` — MERGE CANDIDATE

**별도 유지 가능성이 높은 글**
- `articles/budget-app-guide.html` — RESEARCH

**검색 의도 판정**
- 초보 돈 관리, 예산 계획, 통장 쪼개기는 한 사람이 월급을 배분하고 지출을 통제하며 비상금을 만드는 하나의 실행 과정으로 해결할 수 있다.
- 예산 앱은 “어떤 도구를 선택하고 설정하는가”라는 비교·사용 의도가 강하면 별도 대표글로 유지할 수 있다.

**V2 처리 방향**
1. 세 글의 질문·표·사례·체크리스트를 전체 비교
2. `beginner-money-management.html`을 월급일 기준 돈 관리 최종 가이드로 재창조
3. 예산 설정, 통장 구조, 자동이체, 비상금, 카드 사용, 월말 점검까지 한 페이지에서 해결
4. `beginner-budget-plan.html`, `bank-account-budgeting.html`은 독립 검색 의도가 남는지 확인 후 흡수·301 결정
5. `budget-app-guide.html`은 앱 비교·연동·개인정보·수동 기록 질문이 충분히 독립적이면 유지

**현재 판정**
- 대표글 후보 1개
- 통합 후보 2개
- 추가 조사 1개

---

### F. 은행 수수료 절약

- `articles/bank-fee-saving.html` — KEEP

**검색 의도**
- 이체·ATM·환전·해외결제 등 은행 수수료를 줄이는 방법

**판정**
- 예산 관리와 연관되지만 사용자의 직접 목적이 수수료 절감이므로 독립 대표글 후보로 유지한다.

---

### G. 복지·연금·지원 사기

- `articles/basic-livelihood-discounts.html` — KEEP
- `articles/basic-pension-application-guide.html` — KEEP
- `articles/benefit-scam-warning-2026.html` — KEEP / RELATED GROUP RESEARCH

**판정**
- 기초생활 수급 감면과 기초연금 신청은 대상·기관·신청 절차가 달라 각각 독립 검색 의도다.
- 지원금 사기 경고 글은 이후 `government-benefits-warning.html`, `government-benefit-alert-2026.html`, `government-benefit-alert-setup.html`과 중복 여부를 반드시 조사한다.

---

### H. 부동산·사업 세무

- `articles/building-land-property-tax.html` — KEEP / PROPERTY TAX CLUSTER RESEARCH
- `articles/business-card-hometax-registration.html` — KEEP
- `articles/business-closure-vat-order.html` — KEEP
- `articles/business-phone-expense-deduction.html` — KEEP
- `articles/business-vehicle-expense-basics.html` — KEEP

**판정**
- 각각 재산세 과세 대상, 사업용 카드 등록, 폐업 부가세 순서, 휴대폰 비용처리, 업무용 차량 비용처리라는 독립 행동 의도다.
- 다만 `building-land-property-tax.html`은 재산세 관련 다수 글과 함께 후속 클러스터에서 대표글·하위글 구조를 재판정한다.

## 2. Batch 01 집계

| 항목 | 개수 |
|---|---:|
| 분석 URL | 21 |
| 대표글 확정·후보 | 4 |
| 독립 유지 후보 | 10 |
| 통합 후보 | 6 |
| 추가 조사 | 1 |

> 중복 집계 방지를 위해 `REPRESENTATIVE CANDIDATE`는 대표글 후보에 포함했다. `KEEP / CLUSTER RESEARCH`는 독립 유지 후보에 포함했으며 최종 확정 전 상태다.

## 3. 즉시 실행 우선순위

1. 자동이체·구독 클러스터 2개 전체 비교
2. `automatic-payment-saving.html`에 구독 해지 고유 질문 흡수
3. `cancel-unused-subscriptions.html` 삭제·301 여부 확정 및 실행
4. 에어컨 클러스터 7개 전체 조사
5. 초보 돈 관리 클러스터 4개 전체 조사

## 4. 전체 현황

| 구분 | 현재 |
|---|---:|
| sitemap 기준 글 URL | 177 |
| V2 검색 의도 분석 완료 | 21 |
| V2 미분석 | 156 |
| 품질 개선 커밋 완료 | 1 |
| 통합 후보 | 6 |
| 삭제 확정 | 0 |
| 301 완료 | 0 |

## 5. LOCK

- 이 문서는 단순 계획표가 아니라 V2 콘텐츠 정리의 누적 판정 기록이다.
- 최종 삭제·301은 관련 본문 전체와 내부링크를 확인한 뒤에만 실행한다.
- 한 페이지에서 해결할 수 있는 동일 검색 의도는 여러 페이지로 유지하지 않는다.
- 기존 문장을 복사하지 않고 정보·사례·표·공식자료·질문만 흡수하여 대표글을 처음부터 다시 작성한다.

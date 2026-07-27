# Savingio MASTER CONTENT DECISIONS — PHASE 1

최종 목표는 글 수를 늘리는 것이 아니라 **검색 의도 하나당 사용자의 질문을 끝내는 대표 페이지 하나**를 만드는 것이다.

## 품질 기준 LOCK

- 본문 최소 5,000자. 상한 없음.
- 정보가 필요하면 10,000자 이상 허용.
- 반복 문장, 의미 없는 분량 확장, 범용 FAQ 재사용 금지.
- 대표글은 흡수 대상의 유효 정보를 빠짐없이 재검토해 새로 구성한다.
- 공식기관·법령·공식 서비스 근거가 필요한 항목은 최신 근거 확인 후 반영한다.
- URL 삭제 전 대표글 확장, 내부링크 교체, 301, sitemap, canonical, Explorer를 함께 처리한다.
- 검색 의도가 다르면 같은 주제여도 독립 유지한다.

## 현재 실제 감사 결과

- 운영 글: 180개
- 2개 이상 주제 그룹: 25개
- 단독 주제: 3개
- 자동 검출된 우선 중복·통합 관계: 4쌍

## 확정 통합 큐

### P1-001 부가세 매입세액 공제

대표글:
- `articles/vat-input-tax-deduction-2026.html`

흡수 후 삭제 후보:
- `articles/vat-input-tax-deduction-items.html`

판정 근거:
- 제목 유사도 0.69
- 본문 유사도 0.65
- 두 페이지 모두 매입세액 공제 가능·불공제 항목을 같은 검색 의도로 설명한다.

완료 조건:
- 대표글을 최소 5,000자 이상의 완결형 안내로 재작성
- 공제 기본요건, 사업 관련성, 적격증빙, 공제 가능·불공제 사례, 차량·접대비·면세사업·공통매입세액, 신고 전 점검표, 수정 대응, FAQ 포함
- 중복 URL 301
- sitemap·내부링크·Explorer·canonical 정리

상태: `NEXT — 대표글 실제 통합 작업`

### P1-002 소상공인 정책자금

대표글 후보:
- `articles/small-business-policy-fund.html`

흡수 후 삭제 후보:
- `articles/small-business-policy-fund-search.html`

판정 근거:
- 제목 유사도 0.67
- 본문 유사도 1.00
- 사실상 동일 본문으로 확인됨

상태: `QUEUED`

### P1-003 재산세 고지서 확인

대표글 후보:
- `articles/missing-property-tax-bill.html`

흡수 검토 후보:
- `articles/property-tax-bill-checklist-2026.html`

주의:
- 고지서 미도착 해결과 고지서 항목 검토는 검색 의도가 일부 다를 수 있다.
- 본문을 직접 대조한 뒤 완전 통합 또는 독립 유지 결정.

상태: `MANUAL INTENT REVIEW`

### P1-004 자동차세 조회·연납

독립 유지 우선:
- `articles/car-tax-annual-payment.html`
- `articles/car-tax-check-payment-guide.html`

판정:
- 연납 할인 신청과 일반 조회·납부는 검색자의 목적이 다르므로 자동 통합하지 않는다.
- 서로 중복된 설명만 정리하고 문제 해결 사슬형 내부링크로 연결한다.

상태: `KEEP SEPARATE / REMOVE OVERLAP`

## 5,000자 미달 우선 보강 큐

다음 글은 현재 보고서 기준 5,000자 미만이므로 통합 여부와 별개로 품질 보강이 필요하다.

- `electricity-bill-easy-calculator-guide.html` 4,756자
- `electricity-bill-saving.html` 4,645자
- `fan-aircon-combination-saving.html` 4,214자
- `fixed-speed-aircon-saving.html` 4,789자
- `general-vat-common-mistakes.html` 4,736자
- `hometax-vat-sales-check.html` 3,708자
- `budget-app-guide.html` 3,656자
- `emergency-fund-guide.html` 3,138자
- `spending-habits-change.html` 4,581자
- `summer-vacation-budget-plan.html` 4,841자
- `business-card-hometax-registration.html` 4,870자
- `small-business-closure-support.html` 4,518자
- `small-business-delivery-support.html` 4,498자
- `small-business-policy-fund-search.html` 4,509자
- `small-business-policy-fund.html` 4,509자
- `yellow-umbrella-mutual-aid-guide.html` 4,588자
- `four-major-insurance-deduction-guide.html` 4,903자
- `salary-slip-check-guide.html` 4,068자
- `severance-pay-calculation-guide.html` 3,515자
- `severance-pay-easy-calculator-guide.html` 4,727자
- `unemployment-benefit-checklist.html` 3,491자
- `weekly-holiday-pay-guide.html` 3,657자
- `hometax-refund-status.html` 3,814자
- `national-tax-refund-account.html` 4,953자
- `tax-credit-late-application.html` 4,993자
- `basic-pension-application-guide.html` 2,940자
- `national-pension-old-age-benefit-guide.html` 3,011자
- `over-60-benefits-guide.html` 4,285자
- `senior-job-application-guide.html` 4,276자
- `elementary-school-education-support.html` 3,166자
- `regional-development-bond-refund-guide.html` 4,373자
- `rental-car-vacation-saving.html` 4,694자
- `traffic-fines-difference-guide.html` 4,207자
- `government-benefit-alert-setup.html` 3,962자
- `government-support-calendar.html` 4,129자
- `government24-benefit-check.html` 3,724자
- `subsidy24-benefit-search.html` 4,104자
- `cash-advance-vs-card-loan.html` 3,472자
- `student-loan-repayment-guide.html` 3,973자
- `youth-leap-account-contribution.html` 4,842자
- `youth-savings-account-maintenance.html` 4,821자
- `health-insurance-out-of-pocket-refund.html` 4,960자
- `health-insurance-overpayment-refund.html` 3,975자
- `health-insurance-refund-guide.html` 4,925자
- `earned-income-credit-account-change.html` 4,645자
- `education-expense-vs-benefit.html` 4,921자
- `salary-take-home-easy-calculator-guide.html` 4,387자
- `duplicate-indemnity-insurance-check.html` 4,418자
- `insurance-auto-pay-discount.html` 4,516자
- `insurance-surrender-value-check.html` 3,762자
- `travel-insurance-comparison.html` 4,768자
- `lifelong-education-voucher-application.html` 4,284자
- `card-points-cashback-guide.html` 3,322자
- `subscription-audit-checklist.html` 4,920자
- `telecom-discount-guide.html` 4,808자
- `telecom-unclaimed-refund.html` 3,573자
- `car-insurance-mileage-refund.html` 4,565자
- `basic-livelihood-discounts.html` 4,580자

## 실행 순서

1. P1-001 대표글 통합·재작성
2. 중복 URL 301·sitemap·내부링크·Explorer 정리
3. 실제 URL과 모바일/데스크톱 검증
4. P1-002 동일 절차
5. 나머지 25개 그룹을 검색 의도 기준으로 수동 판정
6. 얇은 글은 통합 또는 최소 5,000자 이상의 실질 정보로 보강
7. 전체 QA 후 Search Console 재제출 및 AdSense 재심사

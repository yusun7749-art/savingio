# MASTER CONTENT MAP — 자동차 V1

기준일: 2026-07-27  
목표: 애드센스 재승인을 위한 검색 의도 통합 및 저가치·중복 페이지 축소

| 검색 의도 그룹 | 대표 URL | 처리 | 흡수·정리 대상 URL | 다음 작업 |
|---|---|---|---|---|
| 자동차 에어컨·연비 | `/articles/car-aircon-fuel-saving.html` | KEEP | `/articles/fuel-saving-driving-habits.html` | 대표글에 연비 운전 내용을 통합한 뒤 301 검토 |
| 자동차보험 절약 | `/articles/car-insurance-saving.html` | KEEP | `/articles/insurance-auto-pay-discount.html` | 할인·자동이체·갱신 체크를 대표글에 통합 |
| 자동차보험 자녀 할인 | `/articles/car-insurance-child-discount.html` | KEEP | 없음 | 독립 검색 의도 유지, 대표 자동차보험 허브와 연결 |
| 자동차보험 마일리지 환급 | `/articles/car-insurance-mileage-refund.html` | KEEP | `/articles/car-insurance-low-mileage-discount.html` | 중복 페이지 흡수 후 기존 URL 301 |
| 자동차세 연납 | `/articles/car-tax-annual-payment.html` | KEEP | 없음 | 자동차세 조회 글과 역할 분리 유지 |
| 자동차세 조회·납부 | `/articles/car-tax-check-payment-guide.html` | KEEP | 없음 | 연납 대표글과 상호 연결 |
| 사업용 차량 비용처리 | `/articles/business-vehicle-expense-basics.html` | KEEP | 없음 | 독립 사업자 검색 의도 유지 |
| 자동차보험 과납 환급 | `/articles/car-insurance-overpayment-refund.html` | KEEP | 없음 | 보험 환급 허브와 상호 연결 |
| 교통 과태료·범칙금 | `/articles/traffic-fines-difference-guide.html` | KEEP | 없음 | 벌점·조회·납부 내용을 대표글 내부에서 확장 |

## 제거 확정 후보

| URL | 처리 | 목적지 |
|---|---|---|
| `/articles/car-insurance-low-mileage-discount.html` | MERGE → 301 | `/articles/car-insurance-mileage-refund.html` |
| `/articles/fuel-saving-driving-habits.html` | MERGE → 301 검토 | `/articles/car-aircon-fuel-saving.html` |

## 현재 결과

- 확인된 자동차 관련 URL: 11개
- KEEP: 9개
- MERGE/301 후보: 2개
- 실제 HTML 삭제·301 적용: 아직 미실행
- 다음 실행 대상: `/articles/car-insurance-low-mileage-discount.html` 통합 및 리디렉션

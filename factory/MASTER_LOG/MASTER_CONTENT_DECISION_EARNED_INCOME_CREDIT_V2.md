# MASTER CONTENT DECISION — EARNED INCOME CREDIT V2

## 상태
- PART: 018
- 범위: 근로장려금 클러스터 4개 URL
- 누적 분석: 57 / 177
- 남은 분석: 120

## 검토 URL
1. `/articles/earned-income-tax-credit-korea.html`
2. `/articles/earned-income-credit-payment.html`
3. `/articles/earned-income-credit-status-check.html`
4. `/articles/earned-income-credit-account-change.html`

## 최종 결정

### 대표 허브 유지
- `/articles/earned-income-tax-credit-korea.html`
- 역할: 2026 근로장려금 신청 대상, 가구·소득·재산 기준, 정기·반기·기한 후 신청, 지급일을 연결하는 종합 허브
- 이유: 신청 전 단계의 가장 넓은 검색 의도를 담당하며 나머지 세부 글로 연결하는 중심 페이지로 적합함

### 독립 유지
- `/articles/earned-income-credit-payment.html`
- 역할: 정기·반기 지급 시기, 결정금액, 실제 입금 지연과 지급계좌 확인
- 이유: 사용자가 신청 후 ‘언제 입금되는지’를 직접 찾는 명확한 사후 검색 의도

- `/articles/earned-income-credit-status-check.html`
- 역할: 접수·심사중·결정완료·지급제외·보완요청 상태 해석
- 이유: 지급일 글과 일부 연결되지만 핵심 목적이 날짜가 아니라 심사 상태 판독과 대응임

- `/articles/earned-income-credit-account-change.html`
- 역할: 지급계좌 변경, 해지·휴면·오기입 계좌, 반송 및 재지급 대응
- 이유: 긴급성이 높은 계좌 오류 해결 의도로 다른 글에 통합하면 탐색성이 떨어짐

## 통합·삭제 결정
- 통합 대상 없음
- 삭제 대상 없음
- 리디렉션 대상 없음

## 내부 연결 원칙
- 대표 허브에서 지급일 → `earned-income-credit-payment.html`
- 대표 허브에서 심사진행 조회 → `earned-income-credit-status-check.html`
- 대표 허브 및 지급일 글에서 계좌 오류·변경 → `earned-income-credit-account-change.html`
- 상태 조회 글에서 결정완료 후 미입금 → 지급일 글과 계좌 변경 글로 연결
- 각 세부 글에서 신청자격·정기/반기 구분이 필요할 때 대표 허브로 되돌림

## AdSense 품질 판단
- 네 글은 같은 제도를 다루지만 신청 전 종합 안내, 지급 시기, 심사 상태, 계좌 오류라는 서로 다른 문제 해결 단계에 배치됨
- 제목과 리드에서 검색 의도가 명확히 분리되어 있음
- 서로를 반복 요약하는 구조가 아니라 순차적 문제 해결 사슬로 운영 가능함
- 현재 단계에서 무리한 통합보다 독립 유지와 내부 링크 강화가 사용자 경험과 콘텐츠 가치에 유리함

## QA 체크
- canonical URL 서로 다름
- H1 검색 의도 서로 다름
- 신청 전/심사 중/지급 전후/계좌 오류 단계 분리됨
- 대표 허브 1개 + 세부 해결 글 3개 구조 확인
- 중복 URL·삭제 필요 없음

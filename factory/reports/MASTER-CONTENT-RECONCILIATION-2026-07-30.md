# Savingio 콘텐츠 재고 정정 및 재작성 실행표

기준일: 2026-07-30
기준 브랜치: `main`

## 1. 재고 계산 정정

기존 `MASTER-CONTENT-CONSOLIDATION-DECISION.md`의 175개 계산은 오류다.

`content-cluster-audit.json`의 `article_count: 172`는 다음 항목을 이미 모두 포함한다.

- G001~G025 그룹 소속 본문: 169개
- 단독 주제 본문: 3개
- 합계: 172개

따라서 단독 주제 3개를 다시 더해 175개로 계산하면 안 된다.

현재 분석 기준:

- 실제 분석된 일반 본문: 172개
- 시스템 목록 페이지: `articles/index.html` 1개
- 분석 관리 총량: 173개
- 과거 운영 관리 수치 177개와의 차이: 4개

## 2. 차이 4개의 판정

현재 `sitemap.xml`에는 이미 `main`에서 삭제된 과거 URL이 남아 있다. 아래 URL은 GitHub `main`에서 실제 파일이 존재하지 않는 것을 확인했다.

- `articles/health-insurance-out-of-pocket-refund.html`
- `articles/health-insurance-overpayment-refund.html`
- `articles/irs-tax-refund-status.html`
- `articles/low-income-cooling-support.html`
- `articles/small-business-policy-fund-search.html`
- `articles/subscription-audit-checklist.html`
- `articles/subsidy24-benefit-search.html`

따라서 177은 현재 파일 재고가 아니라 삭제 전 과거 관리 수치다. 콘텐츠 분석과 재작성은 현재 `main`에 존재하며 자동 감사된 172개 일반 본문을 기준으로 진행한다.

사이트맵에 남은 삭제 URL은 콘텐츠 재작성과 별도로 사이트맵 정리 대상으로 관리한다.

## 3. 통합·삭제 판정 유지

- 본문 통합: 0개
- 본문 삭제: 0개
- 301 리다이렉트 신규 지정: 0개
- 재산세 고지서 후보 2건: 검색 의도 분리로 각각 독립 유지
- `articles/index.html`: 시스템 페이지이므로 본문 재작성 제외

## 4. DNA 재작성 큐

기존 5,000자 미만 대상: 61개

### P0 — 3,000자 미만

1. `articles/long-term-repair-reserve-refund-guide.html` — 재작성 완료
2. `articles/home-water-leak-self-check.html` — 다음 작업
3. `articles/basic-pension-application-guide.html` — 대기

### P1 — 3,000~3,999자

P0 완료 후 기존 마스터 판정표 순서대로 진행한다.

### P2 — 4,000~4,999자

P1 완료 후 기존 마스터 판정표 순서대로 진행한다.

## 5. 현재 진행 수치

- 재작성 최초 대상: 61개
- 완료: 1개
- 남음: 60개
- 다음 파일: `articles/home-water-leak-self-check.html`

## 6. 첫 재작성 검증 내용

`articles/long-term-repair-reserve-refund-guide.html`

- 기존 짧은 본문 전면 교체
- 본문 썸네일 제거
- Breadcrumb → H1 → Lead → 작성·검수 → 5초 결론 → 30초 질문 → 지금 해야 할 행동 → 목차 → 상세 본문 → 비교표 → 체크리스트 → 사례 → 법률·분쟁 대응 → 공식 확인처 → FAQ → 관련 글 → Footer 구조 적용
- 오른쪽 카드 5개 목적과 순서 적용
- 장기수선충당금 소유자 부담, 임차인 대납 반환, 관리주체 납부확인서 발급 규정 반영
- URL·파일명·주제 유지

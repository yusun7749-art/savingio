# MASTER CONTENT DECISION — TAX REFUND STATUS V2

## 작업 목적

Savingio 전체 콘텐츠 중 세금 환급 진행상태·종합소득세 확인 관련 글의 검색 의도, 대표 역할, 중복 가능성, 카테고리 정합성을 판정한다.

## 검토 대상

1. `articles/hometax-refund-status.html`
2. `articles/irs-tax-refund-status.html`
3. `articles/self-employed-income-tax-refund-check.html`

## 판정 요약

### 1. `hometax-refund-status.html`

- 판정: **독립 유지**
- 역할: 한국 국세 환급 신고 후 처리단계·지급 지연 확인 가이드
- 핵심 의도: 홈택스에서 접수, 환급 확정, 지급계좌, 체납 충당 상태 확인
- 연결 허브: `national-tax-refund.html`
- 비고: 국세환급금의 존재 여부를 찾는 허브와 달리, 신고 후 진행상태 확인이라는 후속 행동 의도가 분명하다.

### 2. `irs-tax-refund-status.html`

- 판정: **독립 유지 + 별도 해외세금 분류 필요**
- 역할: 미국 IRS 연방 세금 환급 상태 확인 가이드
- 핵심 의도: Where’s My Refund, IRS2Go, 환급 추적 절차
- 중복 여부: 한국 홈택스 환급 글과 기관·대상·절차가 완전히 다르므로 통합 금지
- 보완 필요: 현재 한국 세금·환급 글과 같은 탐색 경로에 섞이지 않도록 `해외생활/미국 세금` 또는 별도 해외세금 분류로 격리해야 한다.

### 3. `self-employed-income-tax-refund-check.html`

- 판정: **독립 유지 + URL·카테고리 정합성 수정 대상**
- 실제 검색 의도: 종합소득세 신고 대상 확인
- 현재 문제:
  - 파일명은 `income-tax-refund-check`이지만 H1과 본문은 환급 조회가 아니라 신고 대상 판단이다.
  - Breadcrumb와 배지가 `주거`로 잘못 연결되어 있다.
  - 최신 Savingio 글 DNA보다 오래된 레이아웃을 사용한다.
- 처리 원칙:
  - 본문 의도는 유지한다.
  - 향후 URL 정리 단계에서 의미가 맞는 신규 slug 또는 안전한 리디렉션 계획을 별도 수립한다.
  - 세금·환급 또는 사업자 세금 카테고리로 이동한다.
  - 콘텐츠 DNA 재작성 우선순위를 높인다.

## 대표 구조

```text
국세 환급금 조회 허브
└─ national-tax-refund.html
   ├─ national-tax-refund-account.html
   └─ hometax-refund-status.html

종합소득세 신고 대상
└─ self-employed-income-tax-refund-check.html
   └─ URL·카테고리·DNA 정합성 수정 필요

미국 연방 세금 환급
└─ irs-tax-refund-status.html
   └─ 해외세금 별도 분류
```

## 통합·삭제 판정

- 즉시 통합: 없음
- 즉시 삭제: 없음
- URL 변경: 현재 단계에서는 보류
- 향후 수정 필수: `self-employed-income-tax-refund-check.html`의 slug·Breadcrumb·카테고리·글 DNA

## 내부링크 원칙

- `national-tax-refund.html` → `hometax-refund-status.html` → `national-tax-refund-account.html` 순서로 문제 해결 사슬을 구성한다.
- `self-employed-income-tax-refund-check.html`은 종합소득세 신고·사업자 세금 글과 연결한다.
- `irs-tax-refund-status.html`은 한국 국세환급 글의 동일 클러스터 내부링크에서 제외하고 해외세금 콘텐츠끼리만 연결한다.

## 진행 현황

- 이전 누적 분석: 59 / 177
- 이번 분석: 3개
- 누적 분석 완료: **62 / 177**
- 남은 분석: **115개**

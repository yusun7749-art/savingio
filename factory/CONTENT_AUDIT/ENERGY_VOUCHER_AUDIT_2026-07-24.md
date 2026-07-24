# Savingio 콘텐츠 중복 감사 — Energy Voucher

검사일: 2026-07-24
기준 브랜치: main
검사 기준: sitemap.xml 등재 URL, 실제 HTML 존재 여부, title, canonical, H1, 검색의도, 본문 구조

## 결론

- sitemap.xml 등재 URL: 8개
- 실제 HTML 존재: 6개
- sitemap에만 남아 있고 실제 파일이 없는 URL: 2개
- 명확한 중복 통합 대상: 1개
- 독립 검색의도로 유지 가능한 글: 5개

## URL별 판정

### 1. KEEP — 허브/종합 안내

`/articles/energy-voucher-2026-application.html`

- H1: 2026 에너지바우처 신청 대상과 금액, 사용기간까지 한 번에
- 역할: 에너지바우처 전체 허브
- 검색의도: 대상·지원금액·신청기간·사용기간·이용방식 종합
- 판정: 유지

### 2. MISSING — sitemap 정리 필요

`/articles/energy-voucher-application-2026.html`

- sitemap에는 등재되어 있으나 main 브랜치에 실제 HTML 파일 없음
- 판정: sitemap에서 제거
- 리디렉션 권장 대상: `/articles/energy-voucher-2026-application.html`

### 3. MISSING — sitemap 정리 필요

`/articles/energy-voucher-application.html`

- sitemap에는 등재되어 있으나 main 브랜치에 실제 HTML 파일 없음
- 판정: sitemap에서 제거
- 리디렉션 권장 대상: `/articles/energy-voucher-2026-application.html`

### 4. KEEP — 잔액 조회/사용처 전용

`/articles/energy-voucher-balance-check-2026.html`

- H1: 2026년 에너지바우처 잔액 조회와 사용처 확인 방법
- 검색의도: 선정 후 잔액 조회, 사용기간, 사용처, 요금차감·국민행복카드
- 판정: 유지

### 5. MERGE/DELETE — 4번과 중복

`/articles/energy-voucher-balance-use.html`

- H1: 에너지바우처 잔액 조회와 사용 방법
- 검색의도: 잔액 조회와 사용 방법
- 문제: `/energy-voucher-balance-check-2026.html`과 검색의도가 동일함
- 품질: 구형 템플릿이며 내용이 일반론 중심이고 2026 상세 정보가 부족함
- 판정: 삭제 후 `/articles/energy-voucher-balance-check-2026.html`로 301 리디렉션

### 6. KEEP — 주민센터 준비서류 전용

`/articles/energy-voucher-documents.html`

- H1: 에너지바우처 주민센터 신청 준비서류
- 검색의도: 본인·대리 신청 서류, 고객번호, 고지서, 위임장
- 판정: 유지

### 7. KEEP — 자격 판정 전용

`/articles/energy-voucher-eligibility-2026.html`

- H1: 2026 에너지바우처 신청 대상 확인법
- 검색의도: 소득기준과 세대원 특성기준, 제외 사유, 자동·재신청
- 판정: 유지

### 8. KEEP — 복지로 온라인 신청 전용

`/articles/energy-voucher-online-application.html`

- H1: 에너지바우처 온라인 신청 방법
- 검색의도: 복지로 로그인부터 제출·보완·접수상태 확인
- 판정: 유지

## 최종 권장 구조

1. 종합 허브: `energy-voucher-2026-application.html`
2. 자격 확인: `energy-voucher-eligibility-2026.html`
3. 온라인 신청: `energy-voucher-online-application.html`
4. 주민센터 준비서류: `energy-voucher-documents.html`
5. 잔액 조회·사용처: `energy-voucher-balance-check-2026.html`

## 실제 반영 대기 작업

- sitemap.xml에서 아래 3개 URL 제거
  - `energy-voucher-application-2026.html`
  - `energy-voucher-application.html`
  - `energy-voucher-balance-use.html`
- `_redirects`에 아래 리디렉션 추가
  - `/articles/energy-voucher-application-2026.html` → `/articles/energy-voucher-2026-application.html` 301
  - `/articles/energy-voucher-application.html` → `/articles/energy-voucher-2026-application.html` 301
  - `/articles/energy-voucher-balance-use.html` → `/articles/energy-voucher-balance-check-2026.html` 301
- `articles/energy-voucher-balance-use.html` 삭제
- 관련글·카테고리·내부링크에서 삭제 URL 참조 여부 확인 후 교체

## 상태

AUDIT PASS ✅
DELETE/REDIRECT APPLY 대기

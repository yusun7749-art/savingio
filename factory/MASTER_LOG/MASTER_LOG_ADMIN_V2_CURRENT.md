# Savingio Admin V2 Current

최종 갱신: 2026-07-26 KST
저장소: `yusun7749-art/savingio`
브랜치: `main`

## 현재 구현 상태

- 공통 Center Renderer / Store Factory
- 개발 진행 보드와 완료 진실성 LOCK
- Runtime Audit / Production Auto Verify
- Search Console / AdSense / GitHub Release / Cloudflare Center
- Content / SEO / Image / QA / Deploy / Analytics / Revenue Inventory Center
- 통합 운영 대시보드 Store
- 통합 상황실·전체 진행률·오류·수익 요약 화면의 실데이터 연결
- 승인 센터와 오류·중지 센터의 Inventory 직접 처리 강화
- QA 실패·배포 실패·분석 중지·수익 중지에서 긴급 수정 워크플로 생성

## 구현 원칙 LOCK

- 실제 외부 API가 연결되지 않은 상태에서 PASS·승인·배포·수익을 만들지 않는다.
- Search Console, Analytics, AdSense, GitHub, Cloudflare, 실제 URL 상태는 확인된 값만 기록한다.
- 추정 수익·확정 수익·정산 완료액을 분리한다.
- 실제 URL 확인 전에는 배포 검증 완료로 판정하지 않는다.
- 실패·중지 항목은 자동으로 정상 상태로 바꾸지 않는다.
- 긴급 수정 버튼은 원본 문제를 유지한 채 별도 `urgent-fix` 워크플로만 생성한다.
- 전체 Runtime Audit가 PASS가 아니면 진행 보드를 100% 완료로 만들지 않는다.
- Production Auto Verify는 `savingio.com`, `www.savingio.com`, `savingio.pages.dev`에서만 자동 실행한다.

## 승인·오류 통합 처리

- 승인 센터에서 워크플로 승인 대기·승인 완료·반려·배포 승인 완료 상태 통합 표시
- 오류·중지 센터에서 워크플로 오류와 Inventory 문제를 함께 표시
- 통합 대상: QA fail/blocked, Deploy failed/rolled-back, Analytics blocked, Revenue blocked
- 문제별 원본 센터 바로 이동
- 문제별 긴급 수정 워크플로 생성
- 생성 작업 유형: `urgent-fix`
- 생성 작업 우선순위: `urgent`
- 원본 URL 또는 대상 URL을 프로젝트 ID로 연결
- 운영 문제 액션을 별도 `operational-actions.js` 브리지로 처리

## 실제 생성·수정 파일

- `admin-v2/core/content-inventory-store.js`
- `admin-v2/core/seo-inventory-store.js`
- `admin-v2/core/image-inventory-store.js`
- `admin-v2/core/qa-inventory-store.js`
- `admin-v2/core/deploy-inventory-store.js`
- `admin-v2/core/analytics-inventory-store.js`
- `admin-v2/core/revenue-inventory-store.js`
- `admin-v2/core/operations-dashboard-store.js`
- `admin-v2/modules/content.js`
- `admin-v2/modules/seo.js`
- `admin-v2/modules/image.js`
- `admin-v2/modules/qa.js`
- `admin-v2/modules/deploy.js`
- `admin-v2/modules/analytics.js`
- `admin-v2/modules/revenue.js`
- `admin-v2/modules/command.js`
- `admin-v2/modules/runtime-audit.js`
- `admin-v2/operational-actions.js`
- `admin-v2/index.html`

## 런타임 검증 범위

- 운영 모듈 Registry 등록
- 운영 Store 전역 객체
- 메뉴 버튼과 script 실제 로딩
- Content / SEO / Image / QA / Deploy / Analytics / Revenue Store 무결성
- Operations Dashboard Store 무결성
- Command Center와 Dashboard 연결
- Operational Actions 브리지 로딩과 핸들러
- Release Marker / Production Auto Verify / Shell
- Build Progress 완료 진실성 LOCK

## 현재 판정

- GitHub main 파일 생성·수정: PASS
- 7개 운영 Inventory Store·Module: REPOSITORY PASS
- 통합 Dashboard Store: REPOSITORY PASS
- 승인·오류 Inventory 통합 화면: REPOSITORY PASS
- 긴급 수정 워크플로 액션 브리지: REPOSITORY PASS
- index.html 로딩 순서 연결: PASS
- Runtime Audit 검사 연결: PASS
- Production 브라우저 자동 런타임 결과: PENDING

## 다음 작업

1. Production 브라우저 E2E 검증
2. 실제 운영 URL 확인 결과를 Deploy Inventory와 Build Progress에 반영
3. 브라우저에서 긴급 수정 버튼 → 워크플로 생성 → 재렌더링 흐름 검증
4. 외부 API 연결 시 Search Console·Analytics·AdSense 실데이터 수집 구조 연결
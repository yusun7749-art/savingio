# Savingio Admin V2 — Current

최종 갱신: 2026-07-26 KST
저장소: `yusun7749-art/savingio`
브랜치: `main`

## 현재 구현 완료

- Content / SEO / Image / QA / Deploy / Analytics / Revenue Center
- 통합 운영 대시보드
- 승인·오류 통합 처리
- Runtime Audit / Production E2E / Deployment Probe / Auto Verify
- 외부 API Adapter 및 Provider 구조
- 외부 Provider 오류·긴급 수정·자동 재시도 엔진
- 왼쪽 검색트리 전체 Route 검사
- 메뉴·화면 연결 검사 센터
- 끊긴 Route 무반응 방지

## 메뉴·화면 연결 검사

- 파일: `admin-v2/modules/navigation-audit.js`
- 왼쪽 검색트리의 모든 `data-view`를 실제 Module Registry와 대조
- 현재 화면 내부의 모든 `data-route`를 Registry와 대조
- 표시 항목
  - 메뉴명
  - Route ID
  - 연결 여부
  - 정상 연결 화면 바로가기
- 상단 지표
  - 왼쪽 메뉴 수
  - 정상 연결 수
  - 연결 끊김 수
  - 중복 Route 수
  - 등록 모듈 수
  - 전체 PASS / FAIL
- 왼쪽 메뉴에 `메뉴·화면 연결 검사` 항목 추가

## Router 수정

- 파일: `admin-v2/app.js`
- 기존 문제
  - 등록되지 않은 `data-view` 또는 `data-route` 클릭 시 아무 반응 없이 종료
  - 잘못된 URL의 `?view=` 값이 들어오면 조용히 메인으로 대체되어 오류 원인을 알 수 없음
- 수정
  - 끊긴 Route 클릭 시 메뉴·화면 연결 검사로 이동
  - Route ID를 사용자에게 표시
  - 잘못된 URL Route도 연결 검사 화면으로 이동
  - Shell 상태에 메뉴 수와 Route 누락 수 표시
  - 구조 검사 팝업에 누락 Route와 중복 Route 표시
  - `verifyNavigation()`을 Admin V2 공개 검증 API에 추가

## Production E2E 강화

- 파일: `admin-v2/production-e2e-verify.js`
- 왼쪽 검색트리 전체 Route 25개를 검사 대상으로 고정
- 각 Route별 검사
  - 왼쪽 메뉴 존재
  - Registry 모듈 존재
  - 렌더 결과 Root 정확히 1개
- 추가 검사
  - 알 수 없는 메뉴 Route
  - 누락된 필수 Route
  - 중복 Route
  - Navigation Audit 전역 객체
  - Admin Shell Navigation 검증

## Runtime Audit 강화

- `tool-navigation-audit` 모듈 등록 검사
- `SavingioV2NavigationAudit` 전역 객체 검사
- `navigation-audit.js` script 로딩 검사
- 메뉴 수, 누락 수, 중복 수를 실시간 검사 결과에 표시
- Runtime Audit에서 메뉴 연결 검사로 바로 이동 가능

## 진실성 LOCK

1. 메뉴가 존재한다고 해서 화면 연결 완료로 추정하지 않는다.
2. Registry에 실제 모듈이 있어야 연결 완료로 판정한다.
3. 렌더 결과 Root가 정확히 1개여야 Production E2E PASS로 판정한다.
4. 끊긴 Route를 무반응으로 숨기지 않는다.
5. 누락 Route와 중복 Route를 사용자 화면에 그대로 표시한다.
6. 실제 운영 브라우저에서 클릭 검증하기 전에는 Browser PASS를 선언하지 않는다.

## 실제 생성·수정 파일

- `admin-v2/modules/navigation-audit.js`
- `admin-v2/app.js`
- `admin-v2/modules/runtime-audit.js`
- `admin-v2/production-e2e-verify.js`
- `admin-v2/index.html`
- `admin-v2/MASTER_LOG_CURRENT.md`

## Repository 판정

- 메뉴·화면 연결 검사 센터 생성: PASS
- 왼쪽 검색트리 메뉴 노출: PASS
- 끊긴 Route 무반응 방지: PASS
- 잘못된 URL Route 감지: PASS
- Shell Navigation 검증 연결: PASS
- 구조 검사 Route 상세 표시: PASS
- 전체 Sidebar Route Production E2E 등록: PASS
- Runtime Audit 연결: PASS
- 캐시 버전 갱신: PASS
- GitHub main 반영: PASS
- 실제 운영 브라우저 메뉴 클릭 전수 확인: PENDING
- 실제 Cloudflare 배포 반영 확인: PENDING

## 다음 우선순위

1. 운영 브라우저에서 왼쪽 메뉴 25개 전수 클릭 확인
2. 연결 검사 화면에서 실제 FAIL 항목 확인 및 개별 수정
3. 어드민 메인 카드·버튼의 내부 Route 전수 검사
4. 모바일/좁은 화면 왼쪽 검색트리 동작 확인

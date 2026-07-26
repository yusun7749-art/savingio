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
- 어드민 메인 운영 센터 바로가기 지도

## 어드민 메인 운영 센터 지도

- 파일: `admin-v2/modules/command.js`
- 통합 상황실 첫 화면에 주요 센터 24개를 그룹별 카드로 표시
- 그룹
  - 통합 상황실
  - 운영 부서
  - 진단 도구
  - 외부 점검
- 각 카드 표시
  - 센터 이름
  - 센터 역할
  - 연결 상태
  - 화면 열기
- Module Registry에 실제 등록된 센터만 `화면 열기`로 표시
- 등록되지 않은 센터는 `연결 끊김`으로 빨간색 표시
- 메인 카드와 왼쪽 검색트리가 동일 Route를 사용
- 전체 메뉴 연결 검사 화면으로 바로 이동 가능
- Command Center verify에 센터 지도 연결 수와 누락 Route를 추가

## 메뉴·화면 연결 검사

- 파일: `admin-v2/modules/navigation-audit.js`
- 왼쪽 검색트리의 모든 `data-view`를 실제 Module Registry와 대조
- 현재 화면 내부의 모든 `data-route`를 Registry와 대조
- 메뉴명, Route ID, 연결 여부, 정상 화면 바로가기를 표시
- 왼쪽 메뉴 수, 정상 연결 수, 연결 끊김 수, 중복 Route 수, 등록 모듈 수를 표시

## Router 수정

- 파일: `admin-v2/app.js`
- 등록되지 않은 Route 클릭 시 무반응으로 종료하지 않음
- 끊긴 Route ID를 표시하고 메뉴·화면 연결 검사로 이동
- 잘못된 URL의 `?view=`도 연결 검사 화면으로 이동
- 클릭 후 상단 제목, 왼쪽 활성 메뉴, URL query를 함께 갱신

## Production E2E / Runtime Audit

- 왼쪽 검색트리 전체 Route를 검사 대상으로 고정
- 메뉴 존재, Registry 등록, 렌더 Root 1개를 각각 검사
- Navigation Audit 전역 객체와 script 로딩 검사
- Command Center 센터 지도 누락도 verify 실패에 반영

## 디자인 수정

- 파일: `admin-v2/admin-v2.css`
- 어드민 메인 운영 센터 카드 그리드 추가
- 정상 연결 카드 hover/focus 표시
- 연결 끊김 카드 빨간색 표시
- 데스크톱 4열, 중간 화면 2열, 모바일 1열 반응형

## 진실성 LOCK

1. 메뉴가 존재한다고 해서 화면 연결 완료로 추정하지 않는다.
2. Registry에 실제 모듈이 있어야 연결 완료로 판정한다.
3. 렌더 Root가 정확히 1개여야 Production E2E PASS로 판정한다.
4. 끊긴 Route를 무반응으로 숨기지 않는다.
5. 메인 카드와 왼쪽 검색트리는 동일 Route를 사용한다.
6. 실제 운영 브라우저에서 클릭 검증하기 전에는 Browser PASS를 선언하지 않는다.

## 실제 생성·수정 파일

- `admin-v2/modules/navigation-audit.js`
- `admin-v2/modules/command.js`
- `admin-v2/app.js`
- `admin-v2/modules/runtime-audit.js`
- `admin-v2/production-e2e-verify.js`
- `admin-v2/admin-v2.css`
- `admin-v2/index.html`
- `admin-v2/MASTER_LOG_CURRENT.md`

## Repository 판정

- 메뉴·화면 연결 검사 센터: PASS
- 끊긴 Route 무반응 방지: PASS
- 전체 Sidebar Route E2E 등록: PASS
- 어드민 메인 센터 지도 생성: PASS
- 센터 지도 Registry 연결 판정: PASS
- 센터 지도 반응형 스타일: PASS
- command/css 캐시 버전 갱신: PASS
- GitHub main 반영: PASS
- 실제 운영 브라우저 메뉴 클릭 전수 확인: PENDING
- 실제 Cloudflare 배포 반영 확인: PENDING

## 다음 우선순위

1. 운영 브라우저에서 왼쪽 메뉴와 메인 카드 전수 클릭 확인
2. 연결 검사 화면에서 실제 FAIL 항목 확인 및 개별 수정
3. 모바일/좁은 화면 왼쪽 검색트리 동작 확인
4. 메인 화면 운영 수치와 각 센터 데이터 일치 검증

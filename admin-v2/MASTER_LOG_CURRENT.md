# Savingio Admin V2 — Current

최종 갱신: 2026-07-26 KST
저장소: `yusun7749-art/savingio`
브랜치: `main`

## 현재 구현 완료

- Content / SEO / Image / QA / Deploy / Analytics / Revenue Center
- 통합 운영 대시보드
- 승인·오류 통합 처리
- 긴급 수정 워크플로 E2E 및 감사 이력
- Runtime Audit / Production E2E / Deployment Probe / Auto Verify
- Production Verification Center
- Deploy 검사 이력 누적 저장
- 외부 API 공통 Adapter
- 외부 데이터 연결 센터
- Search Console Provider Bridge
- Analytics Provider Bridge
- AdSense Provider Bridge

## AdSense Provider

- 파일: `admin-v2/core/adsense-provider.js`
- Provider ID: `adsense`
- 실제 외부 연결 함수: `window.SavingioAdSenseApiBridge.sync()`
- Bridge 미등록 상태에서는 인증 완료와 동기화 성공을 만들지 않음
- 명시적 `ok === true`, `authenticated === true` 응답만 반영
- Publisher ID LOCK: `pub-7605193583747751`
- Client ID LOCK: `ca-pub-7605193583747751`
- Site LOCK: `https://savingio.com/`
- ads.txt LOCK: `google.com, pub-7605193583747751, DIRECT, f08c47fec0942fa0`
- 위 4개 값 중 하나라도 다르면 Store 반영 차단
- AdSense Store에 다음 상태만 반영
  - siteStatus
  - adsTxtStatus
  - adServingStatus
  - policyStatus
  - revenueConnected
- 실제 수익 금액은 이 Provider에서 생성하지 않음
- Bridge 이름, LOCK 값, 상태, 동기화 시각은 Adapter metadata에 보존

## AdSense 진실성 LOCK

1. `SavingioAdSenseApiBridge`가 없으면 인증 완료로 판정하지 않는다.
2. Publisher ID가 공식 값과 다르면 동기화를 실패 처리한다.
3. Client ID가 공식 값과 다르면 동기화를 실패 처리한다.
4. Site가 `https://savingio.com/`과 다르면 반영하지 않는다.
5. ads.txt 문구가 공식 LOCK과 다르면 반영하지 않는다.
6. 명시적 성공·인증 응답이 아니면 기존 AdSense Store를 변경하지 않는다.
7. Bridge 응답 없이 광고 상태나 수익 연결 상태를 생성하지 않는다.
8. 실제 수익 금액은 Revenue Center에서 확인된 외부 데이터로만 기록한다.

## Runtime Audit 추가 검사

- `SavingioV2AdSenseProvider` 전역 객체
- `adsense-provider.js` 실제 script 로딩
- Publisher ID LOCK
- Client ID LOCK
- Site LOCK
- ads.txt LOCK
- Bridge 등록 여부 표시
- 허위 AdSense 연결 상태 방지
- External Adapter Provider 등록 수 표시

## 최종 완료 게이트 LOCK

다음 조건이 모두 확인되어야만 Build Progress를 100% 완료로 처리한다.

1. Production Deployment Probe PASS
2. Production E2E PASS
3. Runtime Audit PASS
4. Deploy Inventory 실제 URL 확인
5. 최근 긴급 수정 액션 E2E가 FAIL이 아님
6. External API Adapter 구조 무결성과 허위 연결 방지 검사 PASS
7. Search Console Provider Property LOCK과 허위 인증 방지 PASS
8. Analytics Provider Origin LOCK과 허위 수치 방지 PASS
9. AdSense Publisher·Client·Site·ads.txt LOCK과 허위 상태 방지 PASS

외부 실행 환경에서 운영 URL 또는 Google 인증을 확인하지 못한 경우 완료로 추정하지 않고 PENDING을 유지한다.

## 실제 생성·수정 파일

- `admin-v2/core/adsense-provider.js`
- `admin-v2/modules/runtime-audit.js`
- `admin-v2/index.html`
- `admin-v2/MASTER_LOG_CURRENT.md`

## Repository 판정

- AdSense Provider 생성: PASS
- External Adapter Provider 등록: PASS
- AdSense Store 반영 구조: PASS
- Publisher ID LOCK: PASS
- Client ID LOCK: PASS
- Site LOCK: PASS
- ads.txt LOCK: PASS
- 허위 인증·허위 광고 상태 방지: PASS
- index script 로딩 연결: PASS
- Runtime Audit 연결: PASS
- GitHub main 반영: PASS
- 실제 Google AdSense 인증·API 동기화: PENDING

## 다음 우선순위

1. 외부 동기화 결과 운영 검증 센터 표시
2. Search Console·Analytics·AdSense Bridge 또는 서버 Endpoint 연결
3. 외부 동기화 실패를 오류·중지 센터에 통합
4. 운영 브라우저 전체 재검사 결과 확인

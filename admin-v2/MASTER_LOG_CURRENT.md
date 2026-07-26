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
- 외부 API 공통 Adapter
- 외부 데이터 연결 센터
- Search Console / Analytics / AdSense Provider Bridge 구조
- 운영 검증 센터 외부 Provider 상태 통합
- 외부 Provider 오류·중지 센터 및 긴급 수정 워크플로 연결
- 외부 Provider 긴급 수정 이력 운영 검증 센터 표시
- 외부 Provider 제한형 자동 재시도 엔진

## 외부 Provider 자동 재시도 엔진

- 파일: `admin-v2/core/external-retry-engine.js`
- 대상 Provider
  - `search-console`
  - `analytics`
  - `adsense`
- External API Adapter에서 실제 `state === error` 상태만 재시도 대상으로 선택
- Provider가 등록되어 있고 오류 상태일 때만 예약
- 최대 재시도 횟수: 3회
- 재시도 간격
  - 1차: 1분 후
  - 2차: 5분 후
  - 3차: 15분 후
- 브라우저에 같은 Provider 예약 타이머가 이미 있으면 중복 예약 차단
- 재시도 성공 시 상태와 예약 정보를 초기화
- 재시도 실패 시 다음 단계 예약
- 3회 실패 시 `exhausted` 상태로 기록하고 자동 반복 중단
- Provider 오류가 해소되면 예약과 시도 횟수를 초기화
- 운영자가 운영 검증 센터에서 재시도 예약 또는 예약 취소 가능

## 재시도 감사 이력

- 저장 키: `savingio-admin-v2-external-retry-audit`
- 최대 100건 유지
- 기록 이벤트
  - retry-scheduled
  - retry-start
  - retry-success
  - retry-failed
  - retry-exhausted
  - retry-cancelled
  - retry-engine-error
  - reset
- 기록 항목
  - Provider ID
  - 실행 시각
  - 시도 횟수
  - PASS / FAIL
  - 메시지
  - 다음 재시도 시각
- 운영 검증 센터에서 최근 감사 이력을 별도 표시
- Provider 카드에서 현재 시도 횟수, 예약 여부, 다음 재시도, 횟수 소진 여부 표시

## 진실성·안전 LOCK

1. 실제 Adapter 상태가 `error`가 아니면 자동 재시도를 실행하지 않는다.
2. `disconnected`, `configured`, `syncing`, `connected` 상태를 오류로 취급하지 않는다.
3. 재시도는 최대 3회로 제한하며 무한 반복하지 않는다.
4. 같은 Provider의 동시 예약 타이머를 두 개 이상 생성하지 않는다.
5. Adapter의 기존 Provider LOCK과 인증 검사를 우회하지 않는다.
6. 재시도 성공 판정은 `state === connected`와 `authenticated === true`를 모두 요구한다.
7. 실패 결과와 오류 메시지를 PASS로 변환하지 않는다.
8. 횟수 소진 후에는 운영자 확인 또는 명시적 reset 전까지 자동 재시도를 중단한다.
9. 실제 Google Bridge가 없으면 재시도하더라도 인증 성공으로 만들지 않는다.
10. 브라우저 실행 확인 전에는 운영 Runtime PASS를 선언하지 않는다.

## Runtime Audit 추가 검사

- `SavingioV2ExternalRetryEngine` 전역 객체
- `external-retry-engine.js` 실제 script 로딩
- 최대 시도 횟수와 지연 정책
- 재시도 상태 데이터 무결성
- 시도 횟수 0~3 범위
- exhausted 상태와 시도 횟수 일치
- 감사 이력 수
- 예약 수와 횟수 소진 수

## 실제 생성·수정 파일

- `admin-v2/core/external-retry-engine.js`
- `admin-v2/modules/production-verification.js`
- `admin-v2/modules/runtime-audit.js`
- `admin-v2/index.html`
- `admin-v2/MASTER_LOG_CURRENT.md`

## Repository 판정

- 자동 재시도 엔진 생성: PASS
- 실제 오류 상태만 대상 선택: PASS
- 3회 횟수 제한: PASS
- 1분 / 5분 / 15분 지연 정책: PASS
- 중복 예약 방지: PASS
- 성공 시 자동 초기화: PASS
- 실패 후 다음 단계 예약: PASS
- 횟수 소진 후 중단: PASS
- 운영자 예약·취소 버튼: PASS
- 재시도 감사 이력: PASS
- 운영 검증 센터 표시: PASS
- Runtime Audit 연결: PASS
- index script 로딩 연결: PASS
- GitHub main 반영: PASS
- 실제 운영 브라우저 타이머 실행 확인: PENDING
- 실제 Google API 인증·동기화: PENDING

## 다음 우선순위

1. Search Console·Analytics·AdSense 실제 Bridge 또는 서버 Endpoint 연결
2. 횟수 소진 Provider의 운영자 승인형 재활성화 기능
3. 운영 브라우저 전체 재검사 결과 확인
4. 실제 외부 API 인증 후 성공·실패 시나리오 E2E 검증

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

## 외부 Provider 오류 통합

- 파일: `admin-v2/modules/command.js`
- External API Adapter에서 `state === error`인 Provider만 오류 항목으로 수집
- 대상 Provider
  - `search-console`
  - `analytics`
  - `adsense`
- 통합 상황실에 외부 API 오류 건수 표시
- 오류·중지 센터에 Provider별 오류 카드 표시
- 카드에 다음 정보 보존
  - Provider ID
  - Provider 이름
  - 오류 메시지
  - 최근 오류 시각
  - 원본 외부 연결 센터 경로
- `disconnected`, `configured`, `syncing` 상태는 오류로 집계하지 않음
- Bridge 미등록 또는 인증 대기는 실제 오류 상태로 기록된 경우에만 오류 카드에 표시

## 외부 Provider 긴급 수정 워크플로

- 기존 `data-operational-action="create-fix"` 경로 재사용
- 기존 Operational Actions E2E 검증 경로 재사용
- 외부 Provider 원본은 `SavingioV2ExternalApiAdapter.read(providerId)`로 재확인
- 원본 상태가 실제 `error`가 아니면 워크플로 생성 차단
- 생성 작업
  - type: `urgent-fix`
  - priority: `urgent`
  - stage: `content`
  - status: `pending`
- projectId에 `external:<providerId>:<error>` 형식으로 원본 오류 보존
- 생성 후 기존 감사 이력과 E2E PASS/FAIL 검사를 그대로 적용

## 진실성 LOCK

1. 실제 `state === error`인 Provider만 오류·중지 센터에 표시한다.
2. 연결 대기와 인증 대기를 오류로 과장하지 않는다.
3. Provider 오류 메시지를 숨기거나 임의 수정하지 않는다.
4. 긴급 수정 생성 전에 Adapter 원본 상태를 다시 확인한다.
5. 오류가 해소된 Provider에서는 기존 화면 카드로 새 워크플로를 생성할 수 없다.
6. 외부 Provider 작업도 기존 긴급 수정 E2E 검증을 통과해야 PASS로 기록한다.

## 실제 수정 파일

- `admin-v2/modules/command.js`
- `admin-v2/index.html`
- `admin-v2/MASTER_LOG_CURRENT.md`

## Repository 판정

- 외부 Provider 오류 수집: PASS
- 통합 상황실 오류 집계: PASS
- 오류·중지 센터 카드 표시: PASS
- Provider 오류 메시지·시각 보존: PASS
- 원본 외부 연결 센터 이동: PASS
- 외부 Provider 긴급 수정 생성 경로: PASS
- 기존 Operational Actions E2E 재사용: PASS
- command cache version 갱신: PASS
- GitHub main 반영: PASS
- 실제 운영 브라우저 카드 생성 확인: PENDING
- 실제 Google API 인증·동기화: PENDING

## 다음 우선순위

1. 외부 Provider 긴급 수정 실행 결과를 운영 검증 센터 이력에 별도 표시
2. Search Console·Analytics·AdSense 실제 Bridge 또는 서버 Endpoint 연결
3. Provider 오류 자동 재시도 정책 설계
4. 운영 브라우저 전체 재검사 결과 확인

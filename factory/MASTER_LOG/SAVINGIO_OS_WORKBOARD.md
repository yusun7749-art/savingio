# SAVINGIO OS WORKBOARD

최종 갱신: 2026-07-25 KST

이 문서는 Savingio Admin HQ / Savingio OS 개발의 고정 작업표다.

## 운영 규칙

- 완료 항목은 삭제하지 않고 `[x]` 상태로 그대로 유지한다.
- 진행 중인 항목은 `[~]`로 표시한다.
- 아직 시작하지 않은 항목은 `[ ]`로 표시한다.
- 보류 항목은 `[-]`, 실패 또는 수정 필요 항목은 `[!]`로 표시한다.
- 새 작업이 생기면 기존 번호를 지우지 않고 아래에 추가한다.
- 다른 요청으로 잠시 이동해도, 다시 이 문서를 읽고 마지막 `[~]` 항목부터 이어간다.
- 실제 구현·검증하지 않은 항목은 완료 처리하지 않는다.
- 각 작업 완료 시 관련 커밋 SHA와 수정 파일을 기록한다.

## 상태 요약

- 전체 Phase: 5
- 현재 Phase: Phase 2 — Workflow Engine
- 현재 진행 위치: Phase 2-02
- 관리자 화면 실제 Production 검증: PENDING

---

# Phase 1 — Module OS Foundation

- [x] 1-01 Module Registry 구축
  - 모듈 ID, 이름, 아이콘, 순서, 활성 상태, 분류, 기능 규격
  - 파일: `admin/os/module-registry.js`

- [x] 1-02 Module Engine 구축
  - 모듈 등록·수정·켜기·끄기·삭제·초기화
  - 공통 Asset 생성 규격
  - 파일: `admin/os/module-engine.js`

- [x] 1-03 Module Workspace 구축
  - 왼쪽 본부 클릭 시 중앙 작업판 교체
  - 하위 분류 필터
  - 항목 추가·보관·상태 요약
  - 파일: `admin/os/module-workspace.js`, `admin/os/module-workspace.css`
  - 커밋: `016221fecdef8181349aa7c222c2c42d07f7d59a`

- [x] 1-04 Module Manager 구축
  - 새 모듈 설치
  - 이름·아이콘·순서·분류·기능 수정
  - 모듈 켜기·끄기
  - OS 고정 모듈 LOCK
  - 파일: `admin/os/module-manager.js`, `admin/os/module-manager.css`
  - 커밋: `383de7a85ee907529cff0f3ec76c27f7d86b5db6`

- [x] 1-05 관리자 페이지 로딩 연결
  - Module Registry / Engine / Workspace / Manager 연결
  - 중복 스크립트 로딩 제거
  - 파일: `admin/admin-data.js`

---

# Phase 2 — Workflow Engine

- [x] 2-01 Workflow Engine 기반 구축
  - 프로젝트별 단계 저장
  - 시장분석 → 콘텐츠 → 이미지·쇼츠 → 승인 → 배포 → 분석
  - 단계 완료 시 다음 단계 인계
  - 승인 단계 승인 대기 처리
  - 일시 중지·재시작
  - 진행률 계산
  - 파일: `admin/os/workflow-engine.js`

- [x] 2-02 Workflow Board 기반 구축
  - 자동화센터 → 워크플로 관리 연결
  - 프로젝트별 전체 단계 표시
  - 단계 진행·승인·중지·재시작 UI
  - 파일: `admin/os/workflow-board.js`, `admin/os/workflow-board.css`

- [~] 2-03 Workflow 실제 관리자 화면 검증
  - 자동화센터 → 워크플로 관리 진입 확인
  - 단계 완료 버튼 동작 확인
  - 승인 대기 → 승인 처리 확인
  - 중지 → 재시작 확인
  - 진행률 자동 계산 확인
  - 새로고침 후 상태 유지 확인
  - Production `/admin/` 육안 검증

- [ ] 2-04 단계별 담당 본부 연결
  - 각 Workflow 단계에 담당 Module ID 지정
  - 현재 단계에 맞는 본부 작업판 바로 열기
  - 본부 이동 후 프로젝트 문맥 유지

- [ ] 2-05 단계별 산출물 연결
  - 조사자료
  - 글
  - 이미지
  - 쇼츠 대본
  - 영상
  - 상품
  - 배포 URL
  - 성과 데이터

- [ ] 2-06 승인 이력 연결
  - 승인자
  - 승인 시각
  - 반려 사유
  - 재검토 기록
  - 승인 전후 변경 내역

- [ ] 2-07 실행 로그 연결
  - 단계 시작·완료 시각
  - 자동 실행 결과
  - 실패 원인
  - 재시도 횟수
  - 긴급 중지 기록

- [ ] 2-08 Workflow QA
  - 다른 프로젝트 데이터 침범 방지
  - 중복 단계 실행 방지
  - 승인 없이 배포 단계 이동 방지
  - 새로고침·브라우저 재접속 복구
  - 잘못된 상태 전환 차단

---

# Phase 3 — Project Engine

- [ ] 3-01 공통 Project Schema 확정
- [ ] 3-02 새 프로젝트 생성 화면 연결
- [ ] 3-03 프로젝트와 Asset 연결
- [ ] 3-04 프로젝트와 Workflow 연결
- [ ] 3-05 프로젝트 상세 통합 화면
- [ ] 3-06 프로젝트 복제·보관·복구
- [ ] 3-07 프로젝트 검색·필터·정렬
- [ ] 3-08 Project Engine QA

---

# Phase 4 — Automation Engine

- [ ] 4-01 승인 후 GitHub 작업 생성
- [ ] 4-02 GitHub 반영 상태 확인
- [ ] 4-03 Cloudflare 배포 상태 확인
- [ ] 4-04 실제 URL 검증
- [ ] 4-05 실패 자동 기록·재시도
- [ ] 4-06 다음 작업 자동 생성
- [ ] 4-07 전체 중지·부분 재실행
- [ ] 4-08 Automation Engine QA

---

# Phase 5 — Plugin Store

- [ ] 5-01 Plugin Manifest 규격
- [ ] 5-02 Plugin 설치·제거
- [ ] 5-03 메뉴·작업판 자동 생성
- [ ] 5-04 권한·데이터 격리
- [ ] 5-05 계산기 Plugin
- [ ] 5-06 심리테스트 Plugin
- [ ] 5-07 게임 Plugin
- [ ] 5-08 이미지 스토어 Plugin
- [ ] 5-09 쿠폰·제휴 Plugin
- [ ] 5-10 전자책·디지털 상품 Plugin
- [ ] 5-11 Plugin Store QA

---

# 추가 요청 대기판

새로운 요청은 기존 작업을 삭제하지 않고 여기에 추가한다.

- [ ] 추가 요청 없음

---

# 마지막 작업 기록

- 2026-07-25: 이전 방 Module Workspace·Module Manager 실제 커밋 확인
- 2026-07-25: Workflow Engine·Workflow Board 기반 파일 생성 및 관리자 로딩 연결
- 2026-07-25: 고정 작업표 `SAVINGIO_OS_WORKBOARD.md` 생성

# 다음 재시작 위치

`Phase 2-03 Workflow 실제 관리자 화면 검증`부터 이어서 진행한다.

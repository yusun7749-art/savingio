# SAVINGIO ADMIN OS CURRENT

최종 갱신: 2026-07-25 KST

## 사용자 확정 방향

Savingio Admin HQ는 개별 페이지 모음이 아니라, 공통 OS 위에 교체 가능한 모듈을 꽂는 운영체제로 만든다.

- OS 고정 영역: 메뉴 구조, 공통 데이터 규격, 승인, 배포, 통계, 권한, 공통 UI
- 교체 모듈: 콘텐츠, 쇼츠, 이미지, 상품, 심리검사, 게임, 쿠폰, AI, 전자책 등
- 새 사업은 프로그램 재제작이 아니라 모듈과 분류 추가로 확장한다.
- 모든 자료는 공통 Asset으로 관리하고 본부는 필요한 자료만 필터링해 보여준다.
- 최종 목표는 Savingio뿐 아니라 생활백서맘, NOVA, HAVEN도 같은 운영 OS를 공유하는 구조다.

## 확인된 실제 구현

### Phase 1 — Module OS

- Module Registry
- Module Engine
- Module Workspace
- Module Manager
- 공통 Asset 규격
- 왼쪽 본부/하위 분류 클릭 시 중앙 작업판 교체
- 모듈 추가·수정·켜기·끄기·기본값 복원
- OS 고정 모듈 LOCK

관련 커밋:

- `016221fecdef8181349aa7c222c2c42d07f7d59a` — reusable module workspace runtime
- `383de7a85ee907529cff0f3ec76c27f7d86b5db6` — workspace and module manager load

## 이번 회차 실제 구현

### Phase 2-01 — Workflow Engine Foundation

수정·추가 파일:

- `admin/os/workflow-engine.js`
- `admin/os/workflow-board.js`
- `admin/os/workflow-board.css`
- `admin/os/module-registry.js`
- `admin/os/module-engine.js`
- `admin/admin-data.js`

구현 내용:

- 프로젝트별 공통 워크플로 저장소
- 기본 단계: 시장분석 → 콘텐츠 → 이미지·쇼츠 → 승인 → GitHub·Cloudflare 배포 → 성과분석
- 현재 단계 완료 후 다음 본부 자동 인계
- 승인 단계는 자동 통과하지 않고 승인 대기 상태 유지
- 승인 후 다음 단계 인계
- 일시 중지·재시작
- 프로젝트 진행률 자동 계산
- 기존 관리자 샘플 프로젝트를 워크플로 데이터로 초기 연결
- 자동화센터에 `워크플로 관리` 메뉴 추가
- 관리자 화면에서 프로젝트별 단계와 상태를 눈으로 확인하는 작업판 추가
- Module Engine이 Workspace를 중복 로드하던 구조 제거

관련 커밋:

- `56ca7964086ec57cd76cf102ce4d46e05d846071`
- `8a2a924e5b95854f480c1079e41dc08579988ef1`
- `f6c20cf627a92034a418fea388844b297ac44236`
- `8263378c524fd0b5ab9ebc8a65d978f2b269c26e`
- `7813d2fef71ea45a4b5cbda53422036971191376`
- `32e327f4833233d02432db11ff95e7613ac52ba3`

## 검증 상태

- GitHub `main` 파일 생성·수정 및 커밋: PASS
- 파일 재조회: PASS
- 브라우저 실제 화면 렌더링: PENDING
- Cloudflare Production 반영: PENDING
- 버튼별 실제 클릭 E2E: PENDING
- localStorage 초기화·복원 회귀검사: PENDING

실제 화면 검증 전에는 Phase 2 전체 완료로 판정하지 않는다.

## 다음 즉시 실행 작업

1. Cloudflare 반영 후 `/admin/` 실제 화면을 연다.
2. 자동화센터 → 워크플로 관리 진입을 확인한다.
3. 샘플 프로젝트 목록과 단계 진행률을 확인한다.
4. `현재 단계 완료·인계`, `승인 후 다음 단계`, `일시 중지`, `다시 시작`을 실제 클릭 검증한다.
5. 새 프로젝트 생성 시 워크플로가 자동 생성되는지 확인한다.
6. 오류가 없으면 Phase 2-02로 진행한다.
7. Phase 2-02에서는 단계별 산출물 ID, 담당 본부, 승인 기록, 실행 로그, 실패 원인, 재실행 지점을 공통 규격으로 연결한다.
8. 이후 Project Engine에서 글·이미지·쇼츠·상품·SNS를 하나의 프로젝트 ID 아래 묶는다.

## 절대 변경 금지

- OS와 Module을 다시 섞지 않는다.
- 새 기능마다 별도 관리자 페이지를 만들지 않는다.
- 공통 데이터 엔진과 공통 작업판을 우회하지 않는다.
- 화면 검증 없이 PASS를 주장하지 않는다.
- 공식 AdSense Publisher ID `pub-7605193583747751`을 변경하지 않는다.

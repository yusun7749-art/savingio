# Savingio Admin V2 — STEP 1 전수조사

상태: COMPLETE
기준 브랜치: main
작업 범위: 구조 조사만 수행. 디자인 변경·기능 추가·삭제 없음.

## 1. 현재 운영 Admin 진입 흐름

`/admin/index.html`

직접 로드:

1. `/admin/admin-data.js`
2. `/admin/os/project-engine.js`
3. `/admin/os/workflow-engine.js`
4. `/admin/admin.js`
5. `/admin/os/project-create.js`
6. `/admin/os/workflow-board.js`
7. `/admin/os/workboard-board.js`
8. `/admin/device-manager.js`
9. `/admin/content-center.js`
10. `/admin/content-center-runtime.js`
11. `/admin/content-action-runtime.js`
12. `/admin/rewrite-review.js`
13. `/admin/lina-home.js`

`admin-data.js`가 document.write로 추가 로드:

1. `/admin/os/module-registry.js`
2. `/admin/os/module-engine.js`
3. `/admin/os/module-workspace.js`
4. `/admin/os/module-manager.js`
5. `/admin/os/workflow-engine.js`
6. `/admin/os/workflow-board.js`
7. `/admin/os/workboard-board.js`

동적 추가 로드:

- `/admin/final-approval-runtime.js`

## 2. 확인된 중복 로딩

아래 파일은 현재 `/admin/index.html`과 `/admin/admin-data.js` 양쪽에서 동시에 로드된다.

- `/admin/os/workflow-engine.js`
- `/admin/os/workflow-board.js`
- `/admin/os/workboard-board.js`

위 3개는 동일 페이지에서 두 번 실행될 수 있으므로 이벤트 중복 등록, DOM 중복 렌더링, 상태 덮어쓰기 가능성이 있다.

## 3. 확인된 Legacy 단일 페이지 구조

운영 Admin의 한 페이지 안에 다음 화면이 동시에 존재한다.

- 통계 영역 `#stats`
- 프로젝트 목록 `#projectList`
- 상세 패널 `#detailPanel`
- 콘텐츠 승인센터 `#contentApprovalCenter`
- 부서별 작업판 `.department-panel`
- 부서 보드 `#departmentBoard`
- 프로젝트 생성 Dialog
- 콘텐츠 검사 Dialog
- 재작성 검토 Dialog
- 보안센터 Dialog
- 리나 관리자봇

이 구조는 Explorer 클릭 시 Workspace 하나만 교체하는 구조가 아니라 여러 작업판이 한 DOM에 공존하는 Legacy 구조다.

## 4. Admin V2 현재 구조

`/admin-v2/index.html`

고정 Shell:

- Explorer: `#adminExplorer`
- Navigation: `#adminNav`
- Header: `.admin-header`
- Workspace: `#adminWorkspace`

로드 순서:

1. `/admin-v2/core/project-store.js`
2. `/admin-v2/core/module-registry.js`
3. `/admin-v2/modules/command.js`
4. `/admin-v2/app.js`

실행 흐름:

`Explorer / Workspace route click → app.js mount() → Module Registry → Workspace replaceChildren() → module.render()`

## 5. Admin V2 검증 결과

### KEEP

- `/admin-v2/index.html`
  - Shell이 Explorer / Header / Workspace로 분리됨.
- `/admin-v2/app.js`
  - Router와 Mount가 하나로 통합됨.
  - Workspace를 `replaceChildren()`으로 비우고 단일 모듈만 삽입함.
  - Explorer 1개, Workspace 1개, Module Root 1개, Sidebar 255px, 중복 ID, Legacy Board를 검사함.
- `/admin-v2/core/module-registry.js`
  - 모듈 중복 등록을 차단함.
- `/admin-v2/modules/command.js`
  - 통합 상황실 6개 화면을 독립 module id로 등록함.

### REWRITE

- `/admin-v2/core/project-store.js`
  - 현재 데이터가 실제 운영 DB가 아니라 브라우저 localStorage와 예시 기본값에 의존함.
  - 이후 실제 CMS/Factory 데이터 어댑터로 교체해야 함.

### LEGACY — 이후 이관 대상

- `/admin/admin.js`
- `/admin/os/project-engine.js`
- `/admin/os/project-create.js`
- `/admin/device-manager.js`
- `/admin/content-center.js`
- `/admin/content-center-runtime.js`
- `/admin/content-action-runtime.js`
- `/admin/rewrite-review.js`
- `/admin/lina-home.js`
- `/admin/final-approval-runtime.js`

### REMOVE 후보 — STEP 2에서 의존성 확인 후 확정

- `/admin/os/workflow-engine.js` 중복 로드 경로 1개
- `/admin/os/workflow-board.js` 중복 로드 경로 1개
- `/admin/os/workboard-board.js` 중복 로드 경로 1개
- Legacy `.department-panel` / `#departmentBoard` 렌더링 경로

현재 단계에서는 실제 파일 삭제를 하지 않았다.

## 6. LOCK

다음 구조는 이후 변경하지 않는다.

1. Explorer
2. Header
3. Workspace
4. Module Registry
5. 단일 Router / Mount 흐름
6. Workspace 내부 Module Root 정확히 1개
7. 기능 1개 = 독립 Module 파일 1개

## 7. 다음 고정 단계

STEP 2: 중복 실행 경로 제거

순서:

1. `admin-data.js`의 document.write 로더 의존성 확인
2. workflow 관련 3개 파일의 중복 실행 여부 확인
3. 단일 로드 위치 확정
4. 중복 경로만 제거
5. 기존 운영 Admin 기능 회귀 여부 확인

STEP 2가 완료되기 전에는 Admin V2 디자인, 새 부서, 새 기능을 추가하지 않는다.

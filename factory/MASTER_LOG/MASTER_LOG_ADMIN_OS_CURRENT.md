# SAVINGIO ADMIN OS CURRENT

최종 갱신: 2026-07-26 KST

## 🚨 ADMIN HQ RED LOCK

- `/admin`은 유일한 본사(HQ)다.
- `/admin/v2`는 실험실이며 이번 작업에서 수정하지 않는다.
- 왼쪽 Explorer, 중앙 Workspace, 오른쪽 Lina Assistant의 3열 구조를 유지한다.
- 카드형 장식 UI를 다시 추가하지 않는다.
- 기존 연결과 기능을 유지한 상태에서 레이아웃만 수정한다.
- 실제 GitHub 조회·수정 가능 여부를 먼저 확인하고, 실패가 확인된 뒤에만 불가를 보고한다.

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

## 2026-07-26 HQ 레이아웃 긴급 복구

### 사용자 확인으로 드러난 실패

- 전체 화면이 왼쪽으로 쏠렸다.
- 3열로 보이지만 실제로는 오른쪽 열이 빈 공간이 되고 Lina 패널은 grid 밖에 있었다.
- 왼쪽 Explorer가 흰색에 가까운 저대비 상태로 글자가 잘 보이지 않았다.
- Lina Assistant가 우측 고정 비서로 보이지 않았다.
- 이전 화면을 정상이라고 판단한 것은 잘못이었고, Production 육안 판정은 FAIL이다.

### 실제 원인

- `.app-shell`에 3열 grid를 적용했지만 `#linaPanel`은 `.app-shell` 바깥의 `body` 직계 자식이었다.
- 따라서 세 번째 grid 열은 비어 있고, 중앙 영역이 왼쪽으로 압축됐다.
- 밝은 sidebar override가 기존 어두운 Explorer 색상과 충돌해 메뉴 대비가 크게 떨어졌다.

### 실제 수정

수정 파일:

- `admin/hq-clean.css`

수정 내용:

- `body` 자체를 `Explorer / Workspace / Lina` 3열 grid로 변경했다.
- `.app-shell`은 `display: contents`로 바꿔 sidebar와 main이 body grid에 직접 참여하게 했다.
- `#linaPanel`을 실제 3열 오른쪽 고정 패널로 배치했다.
- Explorer를 짙은 네이비 배경과 밝은 텍스트로 복원했다.
- 본부 제목, 하위 메뉴, hover, active 상태의 대비를 강화했다.
- 중앙 Workspace가 남은 폭을 실제로 모두 사용하도록 수정했다.
- 모바일에서는 기존 단일 열 방식으로 되돌아가도록 반응형 fallback을 유지했다.

관련 커밋:

- `7ae1c052d0aff131c332f96b1684d492f2a89f6b`

## 검증 상태

- GitHub `main` 파일 수정 및 커밋: PASS
- 수정 파일 재조회: PENDING
- Cloudflare Production 반영: PENDING
- `/admin/` 실제 3열 화면 육안 검증: PENDING
- Explorer 글자 가독성 사용자 확인: PENDING
- Lina 우측 고정 표시 사용자 확인: PENDING
- 버튼별 실제 클릭 E2E: PENDING

실제 화면 검증 전에는 HQ 레이아웃 복구를 완료로 판정하지 않는다.

## 다음 즉시 실행 작업

1. Cloudflare 배포 후 `/admin/`을 강력 새로고침한다.
2. 왼쪽 Explorer가 짙은 배경으로 표시되는지 확인한다.
3. 중앙 Workspace가 빈 오른쪽 공간 없이 화면 폭을 채우는지 확인한다.
4. 오른쪽에 Lina HQ가 고정 표시되는지 확인한다.
5. 메뉴 글씨, 선택 상태, 하위 항목이 선명하게 보이는지 확인한다.
6. 화면이 정상인 경우 카드 최소화와 실제 Explorer 계층 구조 정리를 계속한다.
7. 화면이 여전히 쏠리면 실제 DOM/CSS 계산값을 기준으로 즉시 2차 수정한다.

## 절대 변경 금지

- OS와 Module을 다시 섞지 않는다.
- 새 기능마다 별도 관리자 페이지를 만들지 않는다.
- 공통 데이터 엔진과 공통 작업판을 우회하지 않는다.
- 화면 검증 없이 PASS를 주장하지 않는다.
- `/admin/v2`를 이번 HQ 복구 작업에서 수정하지 않는다.
- Explorer 또는 Lina Assistant를 삭제·숨김 처리하지 않는다.
- 공식 AdSense Publisher ID `pub-7605193583747751`을 변경하지 않는다.

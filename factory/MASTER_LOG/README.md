# MASTER LOG INDEX

Savingio의 공식 기억 저장소입니다.

## 읽기 순서
1. `MEMORY_CONSTITUTION.md`
2. `BOOT_ORDER.json`
3. `MASTER_LOG_CURRENT.md`
4. 현재 작업이 관리자 OS·모듈·워크플로이면 `MASTER_LOG_ADMIN_OS_CURRENT.md`
5. 관리자 OS 작업이면 반드시 `SAVINGIO_OS_WORKBOARD.md`
6. `04_HANDOVER/NEXT_TASK.md`
7. 현재 작업과 관련된 분류 문서
8. GitHub `main` 실제 파일과 최신 커밋 대조

## 자동 분류
- 완료·성공·릴리스 → `01_SUCCESS/`
- 실패·원인·재발 금지 → `02_FAILURE/`
- 구조·작업공간·엔진·브랜드 결정 → `03_DECISIONS/`
- 다음 작업·세션 인수인계·필수 맥락 → `04_HANDOVER/`
- 중요 대화·채택 아이디어·참고자료 → `05_KNOWLEDGE/`
- 버그·회귀·검수표 → `06_QA/`

## 작업표 운영 규칙
- 완료 항목은 삭제하지 않고 체크 상태로 유지한다.
- 진행 중인 항목과 다음 작업을 항상 작업표에 표시한다.
- 새 요청이 생기면 기존 작업을 지우지 않고 작업표에 추가하거나 보류 상태로 남긴다.
- 다른 작업 후 복귀할 때는 마지막 진행 중 항목부터 이어간다.
- 실제 구현·검증하지 않은 항목은 완료 처리하지 않는다.

## 회차 종료 규칙
하나의 실행이 끝나는 같은 회차에 관련 분류 문서와 `MASTER_LOG_CURRENT.md`, 현재 작업 전용 CURRENT, `SAVINGIO_OS_WORKBOARD.md`, `04_HANDOVER/NEXT_TASK.md`를 즉시 갱신합니다. 실행하지 않은 항목은 완료로 기록하지 않습니다.

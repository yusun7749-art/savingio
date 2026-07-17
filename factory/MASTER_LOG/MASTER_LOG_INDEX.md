# Savingio Factory MASTER LOG INDEX

최종 갱신: 2026-07-17 16:52 KST

## 읽는 순서
1. `MASTER_LOG_CURRENT.md` - 현재 버전, 마지막 완료, 다음 시작 위치
2. `MASTER_LOG_PART1.md` - 날짜별 하루 전체 요약
3. `MASTER_LOG_PART1-1.md` - 시간대별 실제 진행 기록
4. `MASTER_LOG_PART2.md` - 구현·수정 파일·기능 개발 기록
5. `MASTER_LOG_PART3.md` - QA·테스트·배포·검증 기록
6. `REPORTS/` - 사용자 전달용 Word 보고서 보관

## 공식 상태값
- VERIFIED: 실제 확인 및 검증 완료
- IMPLEMENTED: 실제 코드/파일 구현 완료
- FAILED: 실행했으나 실패
- NOT RUN: 실행하지 않음
- PLANNED: 다음 작업 예정

## 영구 운영 규칙
- 작업 보고와 프로젝트 내부 로그 저장은 하나의 작업으로 처리한다.
- 채팅에 보고한 내용은 같은 작업 회차의 로그에 반드시 반영한다.
- 완료를 주장하기 전에 수정 파일, 실행 여부, 테스트 결과, 로그 저장 여부를 확인한다.
- `MASTER_LOG_CURRENT.md`는 항상 최신 한 페이지 상태로 덮어쓴다.
- PART1은 날짜별 하루 요약을 누적한다.
- PART1-1은 시간대별 진행 상황을 누적한다.
- PART2는 실제 구현과 수정 파일을 누적한다.
- PART3는 실제 수행한 테스트·QA·배포만 누적한다.
- 작업 종료 시 사용자용 DOCX 보고서를 만들고 `REPORTS/`에도 같은 사본을 저장한다.
- 새 대화에서 사용자가 “그것 봐”라고 하면 CURRENT → PART1 → PART1-1 → PART2 → PART3 순서로 확인한다.

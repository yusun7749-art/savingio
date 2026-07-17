# MASTER LOG PART2 - IMPLEMENTATION HISTORY

## 2026-07-17 14:40 KST

### 구현 내용
- 공식 MASTER_LOG 폴더 구조 생성
- 날짜별 일일 요약과 시간대별 진행 기록 분리
- 현재 상태 한 페이지 문서 생성
- 작업 보고를 로그에 추가할 수 있는 `master_log_manager.py` 생성
- Windows 실행용 `UPDATE-MASTER-LOG.bat` 생성
- 사용자용 보고서 보관 폴더 `REPORTS/` 생성

### 생성·수정 파일
- `factory/MASTER_LOG/MASTER_LOG_INDEX.md`
- `factory/MASTER_LOG/MASTER_LOG_CURRENT.md`
- `factory/MASTER_LOG/MASTER_LOG_PART1.md`
- `factory/MASTER_LOG/MASTER_LOG_PART1-1.md`
- `factory/MASTER_LOG/MASTER_LOG_PART2.md`
- `factory/MASTER_LOG/MASTER_LOG_PART3.md`
- `factory/MASTER_LOG/master_log_manager.py`
- `factory/MASTER_LOG/UPDATE-MASTER-LOG.bat`
- `factory/MASTER_LOG/REPORTS/Savingio_MASTER_LOG_REPORT_2026-07-17.docx`

### 상태
IMPLEMENTED

## 2026-07-17 16:19 KST

### 구현 내용
- 공식 `core-run` CLI에 반복 가능한 `--evidence` JSON 입력 추가
- 상대 evidence 경로를 프로젝트 루트 기준 절대 경로로 정규화
- evidence 입력을 공식 Manager→Executor 실행 경로에 전달
- Research HQ PASS를 단순 처리 성공이 아니라 전체 항목의 `ready_for_publish` 충족으로 판정
- Research 보고서에 `publish_ready_count`와 `review_required_count` 추가
- 근거 미충족 시 상태를 `review_required`로 기록하고 Core가 Research에서 중단
- Windows 공식 실행 BAT 사용법에 `--evidence` 예시 추가

### 생성·수정 파일
- `03-RUN-FACTORY-CORE.bat`
- `factory/factory_cli.py`
- `factory/research_hq.py`
- `factory/tests/test_runner_manager_executor_integration.py`
- `factory/tests/test_sprint003_research_hq.py`
- `factory/MASTER_LOG/MASTER_LOG_CURRENT.md`
- `factory/MASTER_LOG/MASTER_LOG_PART1.md`
- `factory/MASTER_LOG/MASTER_LOG_PART1-1.md`
- `factory/MASTER_LOG/MASTER_LOG_PART2.md`
- `factory/MASTER_LOG/MASTER_LOG_PART3.md`

### 상태
VERIFIED / CODE READY FOR REVIEW

## 2026-07-17 16:49 KST

### 구현 내용
- Writer가 길이를 채우기 위해 동일 5문장을 반복하던 로직 제거
- 검증된 공식 evidence의 claim/excerpt를 본문 판단 근거로 반영
- 주제 키워드와 법령 원문 우선순위에 따른 evidence 관련도 정렬
- 계약서·고지서·납부내역·정산 요청·증빙 보관을 다루는 고유 실행 문단 생성
- Writer QA에 장문 동일 문단 반복 차단 규칙 추가
- 이미지 provider 완료 시 hero/infographic을 글에 자동 삽입
- 이미지 완료 상태를 QA1→QA2→CMS로 자동 전달하고 CMS를 `content_ready`로 갱신
- Approval Center에 현행 CMS handoff/report 형식 호환 추가
- 장기수선충당금 공식 근거 JSON, 실제 article, WebP 이미지 3종 생성

### 생성·수정 파일
- `factory/writer.py`
- `factory/writer_dna.py`
- `factory/image_provider_result.py`
- `factory/approval_center.py`
- `factory/tests/test_sprint013_writer_hq_completion.py`
- `factory/tests/test_v2022.py`
- `factory/tests/test_v2032.py`
- `factory/input/research/long-term-repair-reserve.json`
- `articles/장기수선충당금-소유자-부담과-임차인-반환-확인-107af18f.html`
- `images/generated/장기수선충당금-소유자-부담과-임차인-반환-확인-107af18f/hero.webp`
- `images/generated/장기수선충당금-소유자-부담과-임차인-반환-확인-107af18f/og.webp`
- `images/generated/장기수선충당금-소유자-부담과-임차인-반환-확인-107af18f/infographic.webp`

## IDEA → IMPLEMENTED: Savingio Life Map
- Savingio는 카테고리 목록이 아니라 사용자의 실제 다음 질문을 잇는 인생 지도다.
- 기본 관계는 `집/자동차/아이/돈/건강/세금/법률/복지 → 상황 → 문제 → 해결 단계 → 다음 질문`이다.
- 단순 관련 글 나열 대신 현재 위치와 다음 행동이 보이는 순서형 경로를 각 글에 표시한다.
- 존재하지 않는 목적지 링크는 금지하며, 필요한 하위 노드는 Research evidence를 거쳐 만든다.
- 1차 미생성 핵심 노드: 윗집 누수, 일상생활배상책임보험(일배책) 누수 보상.
- `factory/MASTER_LOG/MASTER_LOG_CURRENT.md`
- `factory/MASTER_LOG/MASTER_LOG_INDEX.md`
- `factory/MASTER_LOG/MASTER_LOG_PART1.md`
- `factory/MASTER_LOG/MASTER_LOG_PART1-1.md`
- `factory/MASTER_LOG/MASTER_LOG_PART2.md`
- `factory/MASTER_LOG/MASTER_LOG_PART3.md`

### 상태
VERIFIED / APPROVED / READY FOR GITHUB REVIEW

### GitHub 전달
- 브랜치: `agent/long-term-repair-reserve-e2e`
- 커밋: `5b7336389e3619cac7b8a954538e7de58592e98c`
- Draft PR: `https://github.com/yusun7749-art/savingio/pull/2`
- 선택 파일: 19개
- 임시 실행 큐·상태 파일·승인 토큰: 커밋 제외
- PR #2 squash merge 완료
- main V3.006: `8a2ee3f2016c25172a17a9f17d4b50520a136ff7`
- Production article: LIVE VERIFIED

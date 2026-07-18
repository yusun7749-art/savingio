# LIFEBOOKMOM FACTORY — CURRENT HANDOFF

최종 갱신: 2026-07-18 KST

## 이 문서의 목적

새 대화에서는 사용자가 `마스터로그 확인하고 와`라고만 말해도 이 문서와 공식 MASTER LOG 5개를 읽고, 연결·권한·진행 상황을 처음부터 다시 묻지 말고 아래 재시작 지점에서 바로 실제 개발을 이어간다.

읽기 순서:

1. `factory/MASTER_LOG/MASTER_LOG_CURRENT.md`
2. `factory/MASTER_LOG/MASTER_LOG_PART1.md`
3. `factory/MASTER_LOG/MASTER_LOG_PART1-1.md`
4. `factory/MASTER_LOG/MASTER_LOG_PART2.md`
5. `factory/MASTER_LOG/MASTER_LOG_PART3.md`
6. `factory/MASTER_LOG/MASTER_LOG_LIFEBOOKMOM_CURRENT.md`
7. GitHub `main` 최신 커밋과 실제 파일 비교

MASTER LOG는 인수인계 기준이고, GitHub `main`의 실제 파일이 구현 상태의 최종 근거다.

---

## 저장소와 연결 상태

- GitHub 저장소: `yusun7749-art/savingio`
- 작업 브랜치: `main`
- ChatGPT GitHub Connector로 저장소 읽기와 쓰기를 실제 수행했다.
- 이 회차에서 GitHub 파일 생성·수정 커밋이 실제 성공했다.
- 따라서 새 대화에서 근거 없이 `GitHub 연결이 안 됩니다`, `쓰기 권한이 없습니다`라고 되돌아가지 않는다.
- GitHub 작업 전에 최신 `main`, 관련 파일, 기존 MASTER LOG를 먼저 확인한다.
- 사용자의 컴퓨터에는 Blogger API 실행 환경과 기존 인증 정보가 구성되어 있으며, 이전 실행에서 Blogger 비공개 초안 생성과 post ID 확인까지 성공했다.
- Blogger 인증 정보는 저장소에 공개 저장하지 않고 사용자 PC의 기존 환경변수·인증 파일을 그대로 사용한다.
- 새 대화에서 근거 없이 `아이디가 연결되지 않아 Blogger에 접속할 수 없습니다`라고 처음 상태로 되돌아가지 않는다.
- 단, 새로운 초안 생성·발행의 성공은 해당 회차의 실제 실행 결과로 검증하며, 실행하지 않은 성공은 주장하지 않는다.

---

## Blogger 자동화에서 실제로 완료된 범위

### Sprint017 — Blogger 비공개 초안

- Blogger API를 이용한 실제 비공개 초안 생성 성공.
- 확인된 Blogger post ID: `3288570173236822272`.
- 주제 → 콘텐츠 요청 → 글 초안 → QA → Blogger 비공개 초안 경로를 구현했다.
- PR #15 병합 기록이 있다.

### Sprint016 보정

- Windows 실행 시 Python 모듈 경로 오류를 수정했다.
- PR #16 병합 기록이 있다.

### Sprint018 — Blogger 초안 검증

- 생성 직후 Blogger에서 초안을 다시 조회하고 CMS 기록과 일치하는지 확인하는 검증 엔진을 구현했다.
- PR #17 병합 기록이 있다.

### Sprint019 — 안전 발행

- 공개 발행은 명시적 `PUBLISH` 확인값이 있어야 진행하도록 안전장치를 구현했다.
- PR #18 병합 기록이 있다.
- 사용자 확인 없이 공개 발행하지 않는다.

중요 판정:

- Blogger API 연결과 비공개 초안 생성 경로는 이미 실제 성공 이력이 있다.
- `연결 자체`를 다시 만드는 단계가 아니다.
- 현재 미완성 핵심은 생활백서맘 글 품질, 이미지 3종, 이미지 삽입, 자동 QA, 완전한 사용자 개입 제거다.

---

## 생성 글 품질 감사 결과

Blogger에 글이 올라간 기술 성공과 콘텐츠 품질 성공을 혼동하면 안 된다.

실제 문제:

- 생활백서맘 고유 문체와 감성 DNA가 부족했다.
- 정보 나열형·교과서형 문체가 강했다.
- 실제 하루의 장면과 아이의 말이 부족했다.
- 부모의 감정, 아이의 마음, 부모의 시선 변화와 깨달음이 부족했다.
- 썸네일이 없었다.
- 본문 연관 이미지가 없었다.
- 세로형 10컷 인포그래픽이 없었다.
- Blogger 본문에 이미지 자동 삽입이 없었다.
- 이미지 ALT, 대표 이미지 연결, 최종 화면 검증이 미완성이다.

재발 방지:

- Brand QA 실패 시 Blogger 초안 생성 단계로 보내지 않는다.
- Content QA와 Brand QA를 분리한다.
- 필수 이미지가 준비되지 않으면 발행 준비 상태로 전환하지 않는다.
- 실제 Blogger 화면에서 제목·본문·카테고리·이미지·배치까지 확인해야 최종 PASS다.

---

## Sprint020-01 — Brand DNA Engine 실제 반영

### 생성 파일

- `lifebookmom_engine/brand_dna_engine.py`
- `tests/test_brand_dna_engine.py`

### 수정 파일

- `lifebookmom_automation/topic_to_blogger_draft_runner.py`

### 구현 내용

- 일반 설명형 글 앞에 실제 퇴근 후 가정 장면을 넣는다.
- 아이의 실제 대사를 넣는다.
- 부모의 즉각적인 감정과 판단을 넣는다.
- 아이의 말 뒤에 있는 마음을 해석한다.
- 부모가 자신의 시선을 돌아보는 문단을 넣는다.
- 생활백서맘 감성 마무리를 넣는다.
- 본문에서 캐릭터 이름 `리니`가 나오면 Brand QA 실패 처리한다.
- Brand QA를 Content QA보다 먼저 실행한다.
- Brand QA 실패 시 상태를 `BLOCKED_BY_BRAND_QA`로 기록하고 Blogger 전송을 차단한다.
- Brand QA 보고서를 `lifebookmom_cms/brand_qa_reports/`에 별도 JSON으로 저장한다.

### 관련 커밋

- `7e778b36c766ad5f7950c3cd17c44d0fb9a184a1`
- `7c6d896696fea10d9d84161c18c22e5a43c4f0c6`
- `39bd36d9a2e19c38bb353724efa8305acdd9ce4e`
- MASTER LOG 기록 커밋: `eea62f80e7f7c4fe1a66337a587d4ea5a1fbc077`, `fa30691d94a0eca115b5049842ad71b3a57944cc`

### 검증 상태

- 코드와 테스트 파일의 GitHub 저장은 완료했다.
- 당시 연결된 GitHub Actions Workflow run이 없어서 테스트 실행 PASS는 확인하지 못했다.
- 따라서 상태는 `IMPLEMENTED / TEST EXECUTION PENDING`이다.
- 다음 대화에서 코드가 존재하는지 먼저 확인하고 테스트를 자동 실행할 CI 경로를 검증해야 한다.

---

## 사용자 개입 ZERO화 작업

### 생성 파일

- `LIFEBOOKMOM-FACTORY.bat`
- `.github/workflows/lifebookmom-factory-qa.yml`

### 의도한 자동 실행 순서

1. 최신 `main` 동기화
2. pytest 확인 및 필요한 경우 설치
3. Brand DNA 집중 테스트
4. 전체 회귀 테스트
5. 테스트 실패 시 Blogger 전송 차단
6. 주제 입력 기반 글 생성
7. Brand QA
8. Content QA
9. Blogger 비공개 초안 생성
10. 결과 로그 저장

### 관련 커밋

- `f5274c5e0ec48ac80ed6d52ffbd46c624e76c97e`
- `7550c4c5e41dd5e654cc7539564f25a7c1226c77`
- 로그 기록 커밋: `d486afbafad5181512702d72fddfcfd169398d63`

### 중요한 정정

- 사용자가 `git pull`, `pytest`, 개별 Python 명령을 매번 입력하는 구조는 폐기한다.
- 사용자가 해야 하는 반복 작업을 답변으로 넘기지 않는다.
- `진행`을 받으면 가능한 GitHub 수정·검증·기록을 현재 회차 안에서 실제로 수행한다.
- 사용자 PC에서만 가능한 로컬 인증 실행이 최종적으로 필요하면, 여러 명령을 던지지 말고 One Click BAT 한 번으로 끝나게 한다.
- `LIFEBOOKMOM-FACTORY.bat`의 존재만으로 완전 자동화 PASS라고 판단하지 않는다. 실제 동작, 실패 처리, 로그, Blogger 초안 생성까지 검증해야 한다.

---

## 현재 잘못되었거나 빠진 부분

1. Brand DNA 테스트가 GitHub Actions에서 실제로 실행되어 PASS했는지 미확인.
2. `LIFEBOOKMOM-FACTORY.bat`의 실제 Windows 실행 검증 미완료.
3. Factory가 Git 동기화 실패, pytest 설치 실패, QA 실패, Blogger 인증 실패를 정확한 로그로 남기는지 미검증.
4. 이미지 Factory 미구현 또는 미완성.
5. 대표 썸네일, 본문 연관 이미지, 세로형 10컷 인포그래픽 3종 생성 계약 미완성.
6. 공식 생활백서맘 월계관·하트 워터마크 확인 자동화 미완성.
7. 초등학교 3학년 긴 머리 한국 여자아이 캐릭터 LOCK 확인 자동화 미완성.
8. 이미지 파일명, ALT, 대표 이미지, 본문 삽입 위치, Blogger 업로드·삽입 미완성.
9. 글의 실제 2026년 한국 맞벌이 가정 장면과 부모 시선 변화가 주제마다 자연스럽게 생성되는지 실제 샘플 검증 미완료.
10. 체크리스트, FAQ, 관련 글, 추천 섹션, SEO 요소의 누락 검사 강화 필요.
11. 사용자가 주제만 입력하거나 `진행`만 말해도 끝까지 수행되는 전체 E2E는 아직 최종 검증되지 않았다.

---

## 사용자 개입 ZERO 최종 계약

사용자가 반복해서 하지 않는 것:

- `git pull`
- `git add`, `git commit`, `git push`
- `pytest`
- 개별 Python 명령 실행
- Blogger 수동 업로드
- QA 결과 판정
- 로그 작성
- 오류 원인 추적
- 빠진 이미지 확인

Factory가 수행할 것:

- 코드 및 실행환경 사전 점검
- 테스트
- 글 생성
- Brand QA
- Content QA
- 이미지 3종 생성 및 검증
- Blogger 비공개 초안 생성
- 생성 직후 Blogger 재조회 검증
- CMS·로그 저장
- GitHub 반영 및 상태 기록
- 실패 단계·원인·재시작 위치 저장

사용자의 최종 입력:

- `진행`
- 또는 글 주제 한 줄

공개 발행만 안전상 명시적 확인을 유지한다.

---

## 다음 대화에서 바로 시작할 정확한 위치

### Sprint020-02 — Zero-Intervention Audit + Image Factory

반드시 아래 순서로 시작한다.

1. GitHub `main`에서 다음 파일의 실제 존재와 최신 내용을 확인한다.
   - `lifebookmom_engine/brand_dna_engine.py`
   - `lifebookmom_automation/topic_to_blogger_draft_runner.py`
   - `tests/test_brand_dna_engine.py`
   - `LIFEBOOKMOM-FACTORY.bat`
   - `.github/workflows/lifebookmom-factory-qa.yml`
2. 최근 관련 커밋과 Workflow 실행 여부를 확인한다.
3. 테스트가 실행되지 않았다면 CI가 실제 실행되도록 Workflow 트리거와 경로를 수정한다.
4. Brand DNA 집중 테스트와 전체 관련 테스트를 실제 실행하고 결과를 PART3에 기록한다.
5. 실패가 있으면 실패 원인, 수정 파일, 재발 방지 규칙을 기록하고 수정한다.
6. Image Factory 계약을 구현한다.
   - thumbnail
   - body image
   - vertical 10-panel infographic
   - watermark
   - character lock
   - ALT
   - Blogger insertion
7. 이미지 하나라도 누락되면 Blogger 단계로 넘어가지 않는 Gate를 구현한다.
8. 실제 주제 `엄마, 나만 친구 집에 못 가?` / 카테고리 `생활·관계`로 dry-run을 수행한다.
9. Brand QA, Content QA, Image QA 결과를 각각 분리 저장한다.
10. 모든 검증이 통과한 경우에만 Blogger 비공개 초안을 생성하고, 생성 직후 재조회 검증한다.
11. 수행 결과를 완료·실패 여부와 관계없이 CURRENT, PART1, PART1-1, PART2, PART3에 같은 회차에 저장한다.

### 새 대화 시작 명령

사용자:

`마스터로그 확인하고 와. 생활백서맘 Sprint020-02부터 바로 진행해.`

어시스턴트:

- 설명부터 반복하지 않는다.
- 연결 여부를 처음부터 되묻지 않는다.
- 위 파일과 `main`을 실제 확인한 뒤 바로 수정·검증·로그 저장을 시작한다.
- 실행하지 않은 것은 PASS 처리하지 않는다.

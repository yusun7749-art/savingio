# MASTER LOG CURRENT

최종 갱신: 2026-07-18 KST

- 프로젝트: Savingio Factory
- 저장소: `yusun7749-art/savingio`
- 작업 브랜치: `main`
- 감사 기준: `121f0ed` 이후 `main` 비교 완료
- 확인된 진행량: 기준 커밋 이후 62개 커밋, 60개 변경 파일
- 확인된 최신 기록 커밋: `b34372d V3.022 record repository QA and production pending`
- 실제 개발 상태: V3.024 작업 및 offset 25 / limit 5 배치 자동화까지 저장소에 반영
- 공식 Publisher ID: `pub-7605193583747751` (LOCK 유지)

## 중요 운영 원칙

MASTER LOG만 현재 상태의 단일 근거로 사용하지 않는다.
새 대화 시작 시 반드시 다음 순서로 실제 상태를 복원한다.

1. `main` 최신 커밋을 확인한다.
2. MASTER LOG 기준 커밋과 `main`을 비교한다.
3. 변경 파일, Workflow, Factory 엔진, 글, 이미지 자산을 확인한다.
4. 로그에 빠진 실제 작업을 먼저 MASTER LOG에 복구한다.
5. 그 뒤 다음 개발 위치를 확정한다.

GitHub `main`이 실제 구현 상태의 최종 기준이다.

## 저장소에서 복구 확인된 누락 작업

### Article Batch Engine

- `.github/workflows/article-batch-qa.yml` 추가
- `factory/article_batch_qa.py` 추가
- `factory/article_batch_editorial_patch.py` 추가
- `factory/ARTICLE_BATCH_QA.json` 추가
- offset 25 / limit 5 배치 처리 기록 존재
- 본문, 썸네일, 메타 이미지, 작성자 박스, 스키마, canonical, 관련 글, 카테고리, 필수 섹션 검사 추가
- `FIX` 글이 남아 있으면 배치를 완료하지 못하도록 Workflow 조건 강화

### Image Pipeline

- `.github/workflows/savingio-image-pipeline.yml` 추가
- `factory/image_pipeline.py` 추가
- 다수 글의 `images/articles/*.svg` 대표 이미지 자산 추가
- 누수, 자동차 에어컨, 자동차보험, 자동차세, 교통벌금 관련 이미지 반영 확인

### 실제 콘텐츠 작업

- `articles/car-aircon-fuel-saving.html` 재작성 및 이미지 연결
- 자동차보험·자동차세 5개 배치 작업 기록 확인
- 누수 3개 글 재작성 및 실제 SVG 대표 이미지 적용
- `articles/traffic-fines-difference-guide.html` V3.024 레이아웃 정리 작업 확인

### offset 25 배치 보고서 기록

보고서상 선택 글 5개:

1. `car-aircon-fuel-saving.html`
2. `car-insurance-child-discount.html`
3. `car-insurance-mileage-refund.html`
4. `car-insurance-overpayment-refund.html`
5. `car-tax-annual-payment.html`

보고서 기록은 `pass_count: 5`, `fix_count: 0`이지만 다음 불일치가 확인됐다.

- 자동차 에어컨 글 보고 문자 수: 3496자
- 과납보험료 글 보고 문자 수: 2870자
- 이후 Workflow는 3500자 이상을 요구하도록 강화됨
- 따라서 기존 JSON의 PASS만으로 최종 완료 판정하지 않고 현재 파일을 다시 검사해야 한다.

## 현재 발견된 실제 오류

### 교통벌금 글 레이아웃 중복

`articles/traffic-fines-difference-guide.html`에 `3초 요약` 제목이 4회 들어가 있다.

현재 판정: FAIL

원인 후보:

- `factory/fix_traffic_article_layout.py` 또는 반복 실행된 레이아웃 정규화 작업의 멱등성 부족
- 기존 요소 존재 여부를 정확히 확인하지 않고 제목을 재삽입

필수 수정:

1. 본문에는 `3초 요약` 제목을 1회만 유지한다.
2. 작성자 박스 위치를 3초 요약 제목 위 또는 공통 DNA 순서에 맞게 1회만 유지한다.
3. 레이아웃 보정 스크립트를 반복 실행해도 추가 삽입되지 않도록 멱등성 검사를 추가한다.
4. 전체 글에서 같은 중복 패턴이 있는지 검사한다.

## 누수 3개 Production 검증

사용자 확인 완료:

- 누수 긴급 대응 글 검증 완료
- 일배책 누수 보험 글 검증 완료
- 누수 자가진단 글 검증 완료

따라서 기존의 `NEXT BATCH BLOCKED`는 해제한다.

## 현재 판정

- GitHub 실제 진행 상태 재감사: 진행 중
- `121f0ed → main` 비교: PASS
- 누락된 Batch/Image Pipeline 확인: PASS
- 누수 3개 Production 사용자 검증: PASS
- MASTER LOG 현재 상태 복구: PASS
- offset 25 배치 최종 재검사: PENDING
- 교통벌금 3초 요약 중복: FAIL / FIX REQUIRED
- 전체 반복 삽입 패턴 검사: PENDING
- 다음 신규 배치: 위 오류 및 현재 배치 재검사 후 진행

## Savingio 바로 이어서 할 작업

1. 교통벌금 글 중복 제목 수정
2. `fix_traffic_article_layout.py` 멱등성 수정
3. offset 25의 현재 5개 글을 강화된 QA 기준으로 다시 검사
4. 중복 제목·작성자 박스·대표 이미지 중복을 전체 글에서 검색
5. 실제 완료 배치와 미완료 배치를 다시 분리
6. 결과를 PART1, PART1-1, PART2, PART3에 복구 기록
7. 다음 5개 배치 시작

# V3.016 — 전체 글 리모델링 1차(20개) 적용

- 실제 공개 글 208개를 20개 단위로 검수하며 리모델링하기로 확정했다.
- 1차 20개는 관리비 → 장기수선충당금 → 누수 → 일배책 → 수도·공과금 → 전월세·주택세금 흐름으로 묶었다.
- 20개 전부에 공통 리모델링 CSS, 제목 기반 주제 썸네일, 사람이 다음에 찾는 연관 행동 경로를 적용했다.
- `장기충당금`, `아랫집에서 누수 연락`, `일배책으로 누수 보험 처리`처럼 실제 사용자 표현을 연결 제목에 포함했다.
- 리디렉션 호환 문서 14개는 공개 글/리모델링 대상에서 제외한다.
- 1차 전용 계약 검사와 기존 검색·레이아웃·Factory 검사를 통과한 뒤 배포한다.

---

# LIFEBOOKMOM FACTORY 현재 인수인계

상세 단일 문서:

- `factory/MASTER_LOG/MASTER_LOG_LIFEBOOKMOM_CURRENT.md`

새 대화에서 `마스터로그 확인하고 와`라는 요청을 받으면 위 문서를 포함해 공식 MASTER LOG를 모두 읽고 GitHub `main` 실제 파일과 비교한 뒤 바로 이어서 작업한다.

## 연결과 권한의 확인된 사실

- ChatGPT GitHub Connector로 `yusun7749-art/savingio` 파일 생성·수정을 실제 수행했다.
- Blogger API 기반 비공개 초안 생성은 이전 실제 실행에서 성공했다.
- 확인된 Blogger post ID는 `3288570173236822272`다.
- Blogger 초안 재조회 검증 엔진과 명시적 `PUBLISH` 기반 안전 발행 엔진도 구현·병합 기록이 있다.
- 사용자 PC에 기존 Blogger 인증 실행 환경이 구성되어 있다.
- 새 대화에서 근거 없이 `GitHub 연결이 안 됩니다`, `쓰기 권한이 없습니다`, `Blogger 아이디가 연결되지 않았습니다`라고 초기화하지 않는다.
- 단, 새 실행의 성공은 실제 실행 결과로 검증한다.

## 완료·구현된 LifeBookMom 범위

- Sprint017: Blogger 비공개 초안 생성 성공
- Sprint018: Blogger 생성 직후 재조회 및 CMS 일치 검증
- Sprint019: 명시적 확인 기반 안전 공개 발행
- Sprint020-01: Brand DNA Engine과 Brand QA 선행 차단
- `LIFEBOOKMOM-FACTORY.bat` 생성
- `.github/workflows/lifebookmom-factory-qa.yml` 생성
- MASTER LEARNING LOG 및 JSONL 작업 기록 생성

## 현재 검증되지 않았거나 빠진 범위

- Brand DNA 테스트의 실제 GitHub Actions 실행 PASS 미확인
- `LIFEBOOKMOM-FACTORY.bat`의 실제 Windows E2E 미검증
- 대표 썸네일·본문 연관 이미지·세로형 10컷 인포그래픽 자동화 미완성
- 워터마크·캐릭터 LOCK·ALT·대표 이미지·Blogger 삽입 QA 미완성
- 사용자가 `진행` 또는 주제 한 줄만 입력하고 끝까지 자동 수행되는 E2E 미완성

## LifeBookMom 정확한 재시작 지점

Sprint020-02 — Zero-Intervention Audit + Image Factory

1. Brand DNA, Runner, 테스트, One Click BAT, Workflow 실제 파일을 `main`에서 확인한다.
2. Workflow 실행이 없었던 원인을 찾아 실제 CI가 돌도록 수정한다.
3. Brand DNA 집중 테스트와 관련 회귀 테스트를 실제 실행한다.
4. 대표 썸네일, 본문 이미지, 10컷 인포그래픽, 워터마크, 캐릭터 LOCK, ALT, Blogger 삽입 계약을 구현한다.
5. 이미지 하나라도 누락되면 Blogger 단계로 보내지 않는 Gate를 만든다.
6. `엄마, 나만 친구 집에 못 가?` / `생활·관계` 주제로 dry-run 한다.
7. Brand QA, Content QA, Image QA를 분리 저장한다.
8. 모두 통과하면 Blogger 비공개 초안을 생성하고 즉시 재조회 검증한다.
9. 성공·실패와 관계없이 같은 회차에 CURRENT, PART1, PART1-1, PART2, PART3를 모두 갱신한다.

새 대화 시작 문구:

`마스터로그 확인하고 와. 생활백서맘 Sprint020-02부터 바로 진행해.`

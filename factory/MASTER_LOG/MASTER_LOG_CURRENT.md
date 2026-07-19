# MASTER LOG CURRENT

최종 갱신: 2026-07-19 KST

## V3.026 기억 복구·분류형 MASTER LOG

- `마스터로그보고와` 명령은 Savingio의 헌법, BOOT ORDER, CURRENT, NEXT TASK, 01_SUCCESS~06_QA 전체, 기존 PART 로그, 최신 `main`을 모두 확인하라는 뜻으로 LOCK했다.
- 실행 종료 즉시 성공·실패·결정·인수인계·지식·QA 문서에 자동 분류 저장하도록 고정했다.
- 분류형 MASTER LOG 폴더와 문서 19개, `README.md`, `MASTER_LOG_HISTORY.md`를 추가했다.
- ZIP 방식은 명시 요청 또는 백업일 때만 사용하며 GitHub `main`이 공식 본집이다.
- 이번 작업 완료 후 원래 Savingio 시작점은 교통벌금 중복 제목 수정과 offset 25 배치 재검사다.

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
6. 결과를 분류형 로그와 기존 PART 로그에 함께 기록
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

---

## V3.027 MASTER LOG 실시간 기억·실행 우선 절대 규칙

### MASTER LOG의 정의

- MASTER LOG는 단순 작업일지, 사후 인수인계 문서, 프로젝트 종료 후 작성하는 보고서가 아니다.
- MASTER LOG는 Savingio Factory를 이어서 수행하는 **리나의 지속 기억이자 프로젝트 두뇌**다.
- 새 채팅, 새 세션, 재시작, 다른 리나 인스턴스에서도 MASTER LOG와 GitHub `main`을 읽으면 사용자가 이전 작업을 다시 설명하지 않고 즉시 이어갈 수 있어야 한다.
- 프로젝트 상태가 대화가 바뀔 때 사라지는 일을 최우선 운영 실패로 본다.

### 원자적 완료 규칙

- **답변 완료 = MASTER LOG 업데이트 완료**로 LOCK한다.
- 사용자의 `진행`, `다음`, `시작`, `0` 등 한 작업 단위가 끝날 때마다 같은 회차에 MASTER LOG를 즉시 갱신한다.
- 한 답변이 실제 작업을 완료했다면 그 답변에 대응하는 MASTER LOG 기록이 반드시 하나 존재해야 한다.
- 프로젝트 종료, 하루 종료, 큰 마일스톤까지 기다렸다가 몰아서 작성하지 않는다.
- 작업을 완료하고도 MASTER LOG에 기록하지 않은 상태는 완료가 아니다.

### 매 작업 단위 필수 기록 항목

- KST 시각
- 사용자 명령
- 실제 수행한 작업
- 실제 수정 파일
- 검증·테스트 결과
- 성공 내용
- 실패 내용과 원인
- 새로 발견한 문제
- 결정 및 방향 변경
- 다음 즉시 실행 작업
- 관련 커밋 SHA 또는 PR 번호

### 실행 우선 원칙

- `할 수 없습니다`, `연결이 없습니다`, `쓰기 권한이 없습니다`, `도구가 사라졌습니다`라고 추측해서 답하지 않는다.
- 먼저 실제 GitHub 저장소와 권한을 조회하고, 필요한 파일을 읽고, 가능한 쓰기 작업을 직접 시도한다.
- 실제 호출 실패 결과가 확인된 뒤에만 실패 사실과 정확한 원인을 보고한다.
- 과거에 확인된 연결·쓰기 성공 사실을 새 대화에서 근거 없이 초기화하거나 부정하지 않는다.
- GitHub Connector가 활성화되어 있고 push 권한이 확인되면 채팅 설명으로 대체하지 말고 실제 파일 수정과 커밋을 우선한다.

### 자동저장에 대한 정확한 정의

- 채팅 본문에 내용을 적는 것만으로 GitHub 파일이 변경되는 것은 아니다.
- GitHub Connector의 `create_file` 또는 `update_file` 실행이 성공해야 저장소의 MASTER LOG가 변경된다.
- 파일 수정 성공 후 생성된 커밋 SHA를 다시 확인해야 저장 완료로 판정한다.
- 실제 저장하지 않은 내용을 `저장했다`, `반영했다`, `기록했다`고 보고하지 않는다.

### 새 대화 복구 규칙

1. 저장소 `yusun7749-art/savingio` 연결과 push 권한을 실제 확인한다.
2. `factory/MASTER_LOG/MASTER_LOG_CURRENT.md` 및 공식 MASTER LOG 문서를 읽는다.
3. 최신 `main`과 기록된 기준 커밋을 비교한다.
4. 로그에 누락된 실제 구현이 있으면 먼저 복구 기록한다.
5. 마지막 기록의 `다음 즉시 실행 작업`부터 바로 진행한다.
6. 사용자가 이전 작업을 다시 설명해야 하는 상황이 발생하면 이를 운영 실패로 기록하고 복구한다.

### 이번 회차 사실 기록

- 사용자는 GitHub Connector가 활성화되어 있고 이전 회차에 리나가 MASTER LOG 파일 생성·수정·확인을 실제 수행했다고 명확히 지적했다.
- 기존 응답에서 실제 GitHub 연결과 권한을 확인하지 않은 채 쓰기 기능이 없다고 단정한 것은 잘못이었다.
- 이번 회차에 저장소 권한을 실제 재확인한 결과 `admin`, `maintain`, `push` 권한이 모두 활성 상태였다.
- `factory/MASTER_LOG/MASTER_LOG_CURRENT.md`를 실제 조회한 뒤 본 절대 운영 규칙을 동일 파일에 직접 반영했다.
- 다음부터는 가능 여부를 설명하기 전에 실제 실행·검증을 먼저 수행한다.

---

## V3.028 Savingio 메인 Hero 배경 교체 인수인계

### KST 시각

- 2026-07-19 저녁

### 사용자 명령

- 현재 Savingio 메인 화면의 로고, 메뉴, 문구, 검색창, 태그, 카드, 레이아웃은 그대로 유지한다.
- 사용자가 제시한 `PATTERN NAVIATIONS` 레퍼런스처럼 오른쪽 Hero 배경의 선 패턴만 더 조용하고 정돈된 형태로 교체한다.
- 새 홈페이지 이미지나 시안을 만들지 말고 GitHub 실제 메인 `index.html`을 수정한다.

### 실제 수행한 작업

- 저장소 `yusun7749-art/savingio`의 `main/index.html`을 실제 조회했다.
- 기존 Hero SVG가 과도한 점, 도트 그리드, 연결선, 문자 `Savingio`, 삼각형 면, 다수 육각형 아이콘으로 구성된 것을 확인했다.
- 메인 HTML 구조와 Hero 문구를 유지한 상태에서 배경 SVG 리터치 커밋을 생성했다.

### 실제 수정 파일

- `index.html`

### 관련 커밋

- `af902e9a2d7570558ee3d86671421526dea1111b`

### 확정된 수정 범위 LOCK

다음 요소는 절대 수정하지 않는다.

- Savingio 로고
- 상단 메뉴
- Hero 작은 제목 `일상 속 답답함이 생길 때`
- Hero 메인 제목 `필요한 답을 가장 빠르게!`
- Hero 설명 문구
- 검색창
- 키워드 태그
- 안내 카드
- 전체 레이아웃과 콘텐츠 구조

수정 가능 범위는 **Hero 오른쪽 배경 SVG만**이다.

### 사용자 평가와 실패 내용

- 기존 배경 선은 `땅따먹기 점선`처럼 보였다.
- 점이 너무 강해 `나 점이야`라고 자기주장하는 느낌이었다.
- 선과 점이 연결을 요구하는 것처럼 보여 배경이 아니라 주인공이 됐다.
- 점무늬는 `깨를 뿌려놓은 것`처럼 보였다.
- 배경만 수정하라는 요청에 새 홈페이지 이미지를 생성하고 문구·레이아웃까지 바꾼 것은 명백한 범위 이탈이었다.
- 사용자의 핵심 비유는 `벽지를 바꿔달랬더니 집을 때려 부쉈다`이며, 앞으로 디자인 수정 범위 이탈 QA 기준으로 사용한다.

### 디자인 방향 LOCK

- 화면의 80~90%는 여백으로 유지한다.
- 선은 보이되 존재감을 드러내지 않는 매우 옅은 연결선으로 제한한다.
- 점은 최소화하고 작은 노드 또는 옅은 링 허브만 일부 사용한다.
- 도트 그리드와 깨처럼 흩어진 점 장식은 사용하지 않는다.
- `Savingio` 철자 장식은 제거한다.
- 삼각형 면 장식은 제거하거나 거의 보이지 않게 한다.
- 육각형 아이콘은 작고 드물게 사용한다.
- 배경은 사용자가 처음부터 인식하는 그래픽이 아니라 나중에 `배경이 있었네`라고 느끼는 수준이어야 한다.
- 제시된 `PATTERN NAVIATIONS` 3개 샘플 중 첫째·둘째 카드의 조용한 기하학 선 밀도를 참고한다.

### 검증 결과

- GitHub 실제 파일 수정 및 커밋 생성: PASS
- Cloudflare 실제 화면 반영 및 사용자 최종 승인: PENDING
- 현재 배경이 레퍼런스 수준으로 충분히 조용해졌는지: PENDING

### 다음 즉시 실행 작업

1. 새 컴퓨터 자리에서 `factory/MASTER_LOG/MASTER_LOG_CURRENT.md`와 최신 `main`을 먼저 확인한다.
2. 커밋 `af902e9` 이후의 실제 `index.html`과 Savingio 운영 화면을 비교한다.
3. 로고·메뉴·Hero 문구·검색창·태그·안내 카드가 변경되지 않았는지 확인한다.
4. Hero 오른쪽 배경 SVG만 검수한다.
5. 점무늬, 문자, 과도한 연결선이 남아 있으면 해당 SVG 부분만 수정한다.
6. Cloudflare 반영 후 사용자의 실제 화면 확인을 받아 Hero 배경을 완료 처리한다.
7. 완료 전에는 다른 레이아웃이나 콘텐츠를 수정하지 않는다.

### 재시작 문구

`마스터로그 확인하고 와. Savingio 메인 Hero 벽지 작업부터 이어서 진행해.`

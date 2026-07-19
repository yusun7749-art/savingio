# MASTER LOG CURRENT — CONTINUATION 2026-07-20

이 문서는 `factory/MASTER_LOG/MASTER_LOG_CURRENT.md`의 공식 이어쓰기 문서다.
새 대화에서는 반드시 기존 CURRENT를 읽은 직후 이 파일을 이어서 읽는다.

## V3.029 Savingio 콘텐츠 전면 재정비·새 대화 인수인계

### 최상위 목적

- 최우선 목표는 애드센스 승인이다.
- 기능 확장보다 기존 Savingio 사이트 품질 완성이 먼저다.
- 작업 순서는 콘텐츠 품질 통일 → 내부 링크/계산기 QA → 좌측 Brain Explorer/검색창 수정 → 전체 QA → 애드센스 신청이다.
- 공식 본집은 GitHub `yusun7749-art/savingio`의 `main`이다.
- ZIP이 없어도 작업 가능하다. GitHub Connector가 연결되어 있고 실제 push 권한이 확인되었으므로 새 대화에서 `집이 없습니다`, `ZIP이 없습니다`, `수정할 프로젝트가 없습니다`, `GitHub를 직접 수정할 권한이 없습니다`, `여기서는 실행할 수 없습니다`라고 초기화하거나 추측해서 답하지 않는다.
- 먼저 저장소와 권한을 실제 조회하고, MASTER LOG와 대상 파일을 읽고, 바로 수정·커밋한다.
- 사용자가 `시작`, `진행`, `다음`, `0`이라고 하면 설명보다 실제 GitHub 작업을 우선한다.

## 연결·권한 절대 사실

- 저장소: `yusun7749-art/savingio`
- 기본 브랜치: `main`
- GitHub Connector 권한 확인 결과: admin / maintain / push 모두 활성.
- 이 대화에서 `articles/car-insurance-overpayment-refund.html`을 실제 수정했고 GitHub 커밋이 생성됐다.
- 관련 커밋: `89cc9655643823bf52c980bcec1bf2febbc3d6f6`
- 따라서 새 대화에서 연결이 없다고 말하지 말고 실제 저장소를 열어 이어서 작업한다.
- 단, 완료·PASS는 실제 파일 재조회와 검증 후에만 기록한다.

## 이번 대화에서 발생한 잘못과 교정

### 잘못

- 실제 GitHub 연결과 쓰기 권한이 있는데도 `ZIP이 없다`, `저장소를 수정할 권한이 없다`, `프로젝트가 없어 실행할 수 없다`고 잘못 말했다.
- 불과 직전까지 GitHub를 수정했던 실제 사실과 모순되는 답을 했다.
- 사용자는 이 문제를 능력 부족이 아니라 대화 전환 과정의 기억 상실 문제로 정확히 지적했다.

### 교정 LOCK

- 가능 여부를 말하기 전에 반드시 실제 GitHub Connector를 조회한다.
- 저장소 권한 확인 → MASTER LOG 확인 → 최신 main 확인 → 대상 파일 확인 → 실제 수정 순서로 움직인다.
- `할 수 없습니다`는 실제 도구 호출 실패가 확인되기 전에는 사용하지 않는다.
- GitHub가 연결되어 있으면 ZIP 없이도 바로 작업한다.
- 사용자의 집과 작업 집은 `main` 하나로 통일한다.

## Savingio 글 전면 재정비 목표

- 실제 공개 글 약 200개를 하나씩 검수하고 공통 DNA로 통일한다.
- 기존 글을 단순 덧씌우기 변환기로 기계 수정하지 않는다.
- 내용이 약하거나 구조가 뒤섞인 글은 기존 제목과 URL을 유지한 채 새 글로 전면 재작성한다.
- URL과 slug는 절대 바꾸지 않는다.
- 리디렉션 호환 문서는 공개 글 작업 대상에서 제외한다.
- 내용만 바꾸고 기존 주소는 유지한다.

## 공식 기본글 DNA

### 기준 글

- 현재 새 글의 실질적 구조 기준은 `articles/car-aircon-fuel-saving.html`의 최신형 레이아웃이다.
- 단, 해당 글에 남아 있는 대표 이미지/썸네일 구조는 새 LOCK에 따라 제거 대상이다.
- 과거 A001에서 검증된 정보 구조를 바탕으로 다음 공통 순서를 고정한다.

### 필수 구조 순서

1. Breadcrumb
2. Hero
   - 카테고리 배지
   - H1
   - Lead
   - 작성·검수 / 최종 업데이트 / 예상 읽기 시간
3. 작성·검수 및 주의문구
4. 5초 결론
5. 30초 안에 가장 많이 찾는 질문
6. 5분 자세히 보기 목차
7. 핵심 본문
8. 비교표 또는 상황별 판단표
9. 단계별 실행 순서
10. 체크리스트
11. FAQ
12. 관련 글
13. Footer

### 필수 품질

- 단순 정보 나열이 아니라 실제 사용자의 문제를 해결하는 순서형 글.
- 제목은 사용자가 실제로 검색하거나 겪는 상황 중심.
- 본문은 대략 5천자 수준을 목표로 하되 무의미한 반복으로 분량만 늘리지 않는다.
- 최소 기준은 강화된 QA 기준 3500자 이상이지만 최종 목표는 충분한 문제 해결형 장문이다.
- 표, 체크리스트, FAQ, 관련 글, 작성·검수 문구, canonical, Article schema, FAQ schema를 포함한다.
- 관련 글은 사용자가 다음에 실제로 궁금해할 행동 경로로 연결한다.
- 광고가 들어가도 본문 흐름이 끊기지 않도록 첫 화면부터 정보 밀도를 확보한다.

## 썸네일 삭제 최종 결정 — 절대 변경 금지

### 최종 방향

- 본문 상단 대표 썸네일은 전부 삭제한다.
- `figure.thumb`, 본문 대표 이미지, figcaption을 사용하지 않는다.
- Hero 바로 아래에 광고가 들어갈 공간과 정보 시작 공간을 확보한다.
- 새 글은 제목 → Lead → 작성·검수 → 5초 결론으로 바로 이어진다.
- 사용자가 `어차피 광고가 들어가니 썸네일은 과감히 버리자`고 최종 결정했다.

### 삭제 대상

- `<figure class="thumb">...</figure>`
- `.thumb` 관련 본문 CSS
- 본문 상단 대표 이미지 markup
- 본문 대표 이미지 caption

### 메타 이미지 처리

- 본문 썸네일과 SNS 공유용 메타 이미지는 구분한다.
- `og:image`, `twitter:image`, Article schema의 `image`는 검색/공유 목적상 유지 가능하다.
- 다만 기본글 QA에서는 본문에 실제 `<figure class="thumb">`가 없어야 PASS다.
- 이후 정책을 완전히 메타 이미지까지 제거하기로 별도 결정하지 않는 한 메타 이미지는 유지한다.

## 이번 대화에서 실제 수정된 글

### `articles/car-insurance-overpayment-refund.html`

- 기존 짧고 오래된 레이아웃을 최신 통합 DNA로 전면 재작성했다.
- 제목 변경: `자동차보험료를 더 냈을 때, 과납보험료 확인부터 환급까지`
- URL 유지: `/articles/car-insurance-overpayment-refund.html`
- canonical 유지: `https://savingio.com/articles/car-insurance-overpayment-refund.html`
- 적용 내용:
  - Lead
  - 작성·검수
  - 5초 결론
  - 30초 질문
  - 목차
  - 계약정보 비교 7단계
  - 대표 확인 사례
  - 준비 자료
  - 환급 요청 절차
  - 비교표
  - 환급이 어려운 경우
  - 다음 갱신 재발 방지
  - 체크리스트
  - FAQ
  - 관련 글
  - Article/FAQ schema
- 커밋: `89cc9655643823bf52c980bcec1bf2febbc3d6f6`

### 현재 미완료 이유

- 본문에 `<figure class="thumb">`가 남아 있다.
- 썸네일 삭제 최종 결정 이후 기준으로는 아직 PASS가 아니다.
- 따라서 1/200 완료로 계산하면 안 된다.
- 다음 작업의 첫 단계에서 썸네일 markup과 `.thumb` CSS를 제거하고 재조회 검증한 후 완료 처리한다.

## 다음 대상 글

### `articles/car-insurance-child-discount.html`

- 현재 기존 파란색 카드형 구형 DNA가 남아 있다.
- 본문 상단 썸네일이 존재한다.
- 기존 구조를 부분 수정하지 말고 최신 공통 DNA로 새로 재작성한다.
- URL 유지: `/articles/car-insurance-child-discount.html`
- canonical 유지.
- 썸네일 없는 구조로 작성한다.
- 주제 핵심:
  - 태아 포함 여부
  - 자녀 연령 조건
  - 기명피보험자 관계
  - 증빙 서류
  - 가입 후 중도 변경
  - 갱신 시 재확인
  - 다른 할인특약과의 비교
  - 최종 보험료 기준 비교

## 기존 offset 25 배치 재판정

기존 보고서 5개:

1. `car-aircon-fuel-saving.html`
2. `car-insurance-child-discount.html`
3. `car-insurance-mileage-refund.html`
4. `car-insurance-overpayment-refund.html`
5. `car-tax-annual-payment.html`

기존 JSON의 PASS를 최종 PASS로 인정하지 않는다.

이유:

- 당시 QA는 썸네일 존재를 요구했다.
- 현재는 본문 썸네일 삭제가 최종 LOCK으로 변경됐다.
- 일부 글은 3500자 기준 미달 기록이 있다.
- 글마다 구형/신형 레이아웃이 섞여 있다.

새 QA 기준으로 5개 전부 재검사한다.

## 교통벌금 오류도 유지 중

- `articles/traffic-fines-difference-guide.html`에 `3초 요약` 제목이 여러 번 삽입된 오류 기록이 있다.
- `factory/fix_traffic_article_layout.py` 멱등성 부족 가능성이 있다.
- 콘텐츠 재작성 흐름과 별도로 반드시 수정한다.
- 스크립트를 반복 실행해도 제목, 작성자 박스, 대표 요소가 중복되지 않도록 검사한다.
- 전체 글에서 `3초 요약`, 작성자 박스, FAQ, 목차 중복 패턴을 전수 검색한다.

## 진행 순서

### 1단계 — 현재 자동차·교통 배치 마무리

1. `car-insurance-overpayment-refund.html` 썸네일 제거
2. 해당 글 CSS에서 `.thumb` 제거
3. 본문 구조 재조회 QA
4. `car-insurance-child-discount.html` 최신 DNA 전면 재작성
5. `car-insurance-mileage-refund.html` 재검사 및 재작성
6. `car-aircon-fuel-saving.html` 썸네일 제거 및 분량/구조 재검사
7. `car-tax-annual-payment.html` 재검사
8. 교통벌금 중복 제목 수정
9. offset 25 5개 최종 QA

### 2단계 — 카테고리 순차 정비

1. 보험
2. 세금
3. 정부지원
4. 생활요금
5. 금융
6. 주거·관리비
7. 자동차·교통 나머지
8. 기타 생활정보

실제 저장소의 사람 설계 카테고리 체계를 먼저 확인하고, 자동 제목 그룹핑으로 임의 재분류하지 않는다.

### 3단계 — 전체 연결 QA

- 모든 내부 링크
- 관련 글 연결
- 계산기 연결
- 카테고리 경로
- canonical
- sitemap
- 검색 결과 연결
- 버튼 목적지
- 잘못된 301/404

### 4단계 — 좌측 Brain Explorer 및 검색창 수정

콘텐츠 기본 정비가 완료된 뒤 실행한다.

#### 좌측 Explorer 목표 구조

대분류 → 중분류 → 소분류 → 현재 글 → 관련 글 → 계산기

#### 절대 규칙

- 글 제목을 자동으로 묶은 단순 목록으로 만들지 않는다.
- 사용자가 검색어를 몰라도 탐색할 수 있는 지식 탐색 시스템으로 만든다.
- 현재 위치를 강조한다.
- 현재 글과 관련 계산기를 자연스럽게 연결한다.
- 모바일에서도 접근 가능해야 한다.
- 기존 URL은 바꾸지 않는다.

#### 검색창 수정 목표

- 메인 검색창과 좌측 Explorer 검색이 같은 데이터 소스를 바라보도록 통일한다.
- 실제 존재하는 글, 카테고리, 계산기만 노출한다.
- 삭제/리디렉션 문서는 검색 결과에서 제외한다.
- 키워드, 동의어, 사용자의 생활 문장으로 검색 가능하도록 한다.
- 검색 결과 클릭 시 정확한 글 또는 계산기로 이동해야 한다.
- `급여 확인하기`가 에어컨 글로 가는 식의 잘못된 목적지 연결은 전수 차단한다.

## AdSense Publisher LOCK

- 공식 Publisher ID: `pub-7605193583747751`
- 절대 변경 금지.
- 다른 Publisher ID 복원 금지.
- 코드, 템플릿, 생성 엔진에 임의 하드코딩 금지.
- 단일 설정 파일에서만 읽는다.
- 배포 전 ads.txt, index.html, 모든 HTML, header/footer, JS, config, Factory 템플릿, 생성 엔진 전체 검사.

## 보고 규칙

- 실제 수정한 파일만 수정 완료로 보고한다.
- 실제 커밋 SHA를 함께 남긴다.
- 재조회하지 않은 파일은 PASS 금지.
- 계획을 완료처럼 쓰지 않는다.
- `1/200` 같은 진행률은 실제 완성 글만 계산한다.
- 썸네일이 남은 과납보험료 글은 현재 완료 수에 넣지 않는다.
- 한 글 완료 조건:
  1. 새 DNA
  2. 썸네일 없음
  3. 본문 품질 충족
  4. 표/체크리스트/FAQ/관련 글
  5. canonical/schema
  6. 내부 링크 정상
  7. 모바일 구조
  8. GitHub 재조회 확인

## 새 대화 BOOT ORDER

새 대화에서 다음 순서로 즉시 실행한다.

1. GitHub Connector로 `yusun7749-art/savingio` 조회
2. push 권한 확인
3. `factory/MASTER_LOG/MASTER_LOG_CURRENT.md` 읽기
4. 이 파일 `factory/MASTER_LOG/MASTER_LOG_CURRENT_CONTINUATION_2026-07-20.md` 읽기
5. 최신 `main` 커밋 확인
6. `articles/car-insurance-overpayment-refund.html` 재조회
7. 본문 썸네일 제거
8. 저장 및 커밋
9. 재조회 QA
10. `articles/car-insurance-child-discount.html` 최신 DNA 재작성 시작

사용자에게 다시 ZIP을 달라고 하지 않는다.
`집이 없다`, `실행할 수 없다`, `권한이 없다`고 말하지 않는다.
이미 연결되어 있으므로 그냥 실제 GitHub 작업을 시작한다.

## 새 대화 시작 문구

아래 한 줄이면 충분하다.

`마스터로그 확인하고 와. MASTER_LOG_CURRENT_CONTINUATION_2026-07-20까지 읽고 과납보험료 썸네일 제거부터 바로 진행해.`

## 이번 회차 최종 상태

- GitHub 연결 및 쓰기 권한: 확인 완료
- 과납보험료 글 최신 DNA 재작성: 실제 반영 완료
- 과납보험료 글 썸네일 제거: 미완료
- 과납보험료 글 최종 PASS: 보류
- 자녀할인 글 최신 DNA 재작성: 미시작
- 전체 200개 재정비: 시작 단계
- 좌측 Brain Explorer/검색창 수정: 콘텐츠 정비 후 실행 예정
- MASTER LOG 인수인계 저장: 이 파일로 완료

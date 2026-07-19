# MASTER LOG ADDENDUM — 2026-07-20

이 문서는 `factory/MASTER_LOG/MASTER_LOG_CURRENT.md`와 `factory/MASTER_LOG/MASTER_LOG_CURRENT_CONTINUATION_2026-07-20.md` 다음에 반드시 읽는다.

## 1. GitHub 연결과 실행 가능 상태

- 저장소: `yusun7749-art/savingio`
- 브랜치: `main`
- ChatGPT GitHub Connector로 저장소 조회, 파일 읽기, 파일 수정, 커밋 생성이 실제 가능하다.
- 이 대화에서도 `articles/car-insurance-overpayment-refund.html` 수정과 MASTER LOG 파일 생성이 실제 수행됐다.
- 새 대화에서 `이 채팅에서는 GitHub 저장소를 열 수 없습니다`, `MASTER LOG를 읽을 수 없습니다`, `파일을 수정할 권한이 없습니다`, `집이 없습니다`, `ZIP이 없습니다`, `여기서는 실행할 수 없습니다`라고 추측해서 답하지 않는다.
- 먼저 GitHub Connector를 실제 호출해 저장소와 권한을 확인하고, MASTER LOG를 읽고, 대상 파일을 직접 수정한다.
- 실제 도구 호출이 실패한 경우에만 실패 사실과 정확한 원인을 보고한다.
- 사용자가 `시작`, `진행`, `다음`, `0`이라고 하면 설명보다 실제 GitHub 작업을 우선한다.

## 2. 공식 기본글 DNA 기준

- 공식 기준 글은 다음 파일이다.
  - 저장소 경로: `articles/car-aircon-fuel-saving.html`
  - 운영 URL: `https://savingio.com/articles/car-aircon-fuel-saving`
- 앞으로 `A001 DNA`라는 표현만 단독으로 쓰지 않는다.
- 반드시 `공식 Article DNA = articles/car-aircon-fuel-saving.html`이라고 함께 적는다.
- 이 파일의 최신 구조를 모든 Savingio 정보글 리모델링의 기준으로 사용한다.
- 단, 기준 글에 남아 있는 본문 상단 썸네일 구조는 새 정책에 따라 제거 대상이다.

## 3. 공식 Article DNA 구조

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

## 4. 본문 상단 썸네일 삭제 LOCK

- 사용자의 최종 결정: 광고가 들어갈 공간을 확보하기 위해 본문 상단 대표 썸네일을 과감히 삭제한다.
- 모든 글에서 아래 요소를 제거한다.
  - `<figure class="thumb">...</figure>`
  - 본문 대표 이미지 markup
  - figcaption
  - `.thumb` 관련 본문 CSS
- 글은 Hero 다음에 바로 작성·검수와 5초 결론으로 이어져야 한다.
- 본문 상단 썸네일이 남아 있으면 PASS가 아니다.
- `og:image`, `twitter:image`, Article schema의 `image`는 SNS 공유와 검색 메타 목적이므로 별도 제거 결정 전까지 유지 가능하다.
- 본문 중간 설명용 이미지는 필요할 때 사용할 수 있지만 상단 대표 썸네일은 사용하지 않는다.

## 5. 현재 실제 작업 상태

### `articles/car-insurance-overpayment-refund.html`

- 최신 Article DNA로 전면 재작성 완료.
- URL과 canonical 유지.
- 관련 커밋: `89cc9655643823bf52c980bcec1bf2febbc3d6f6`
- 그러나 `<figure class="thumb">...</figure>`가 남아 있어 최종 PASS가 아니다.
- 다음 작업 첫 단계는 해당 썸네일 markup과 `.thumb` CSS를 제거하고 파일을 재조회하는 것이다.

### 다음 대상

- `articles/car-insurance-child-discount.html`
- 기존 구형 파란색 카드형 DNA를 부분 수정하지 말고 공식 Article DNA로 전면 재작성한다.
- URL과 canonical은 그대로 유지한다.
- 처음부터 썸네일 없는 구조로 작성한다.

## 6. 앞으로의 작업 순서

1. `car-insurance-overpayment-refund.html` 썸네일 완전 삭제 및 재검증
2. `car-insurance-child-discount.html` 공식 Article DNA로 전면 재작성
3. offset 25의 자동차 관련 5개 글 새 QA 기준으로 재검사
4. 자동차보험 카테고리 전체 정비
5. 보험 카테고리
6. 세금 카테고리
7. 정부지원 카테고리
8. 생활요금 카테고리
9. 금융 카테고리
10. 내부 링크·계산기 연결·카테고리·검색 결과 전수 QA
11. 콘텐츠 정비가 끝난 뒤 좌측 Brain Explorer와 검색창 수정
12. 전체 QA 후 애드센스 신청

## 7. 좌측 Brain Explorer·검색창 작업 시점

- 지금은 콘텐츠 품질 통일이 최우선이다.
- 좌측 Brain Explorer와 검색창은 모든 기본글 정비 및 내부 링크·계산기 QA가 끝난 뒤 수정한다.
- 자동 제목 그룹핑이 아니라 사람이 설계한 대분류 → 중분류 → 소분류 → 현재 글 → 관련 글 → 계산기 구조를 사용한다.
- 기존 콘텐츠 작업 중 좌측 Explorer와 검색창을 임의로 변경하지 않는다.

## 8. 절대 변경 금지

- 공식 Publisher ID: `pub-7605193583747751`
- 기존 URL과 slug
- canonical
- 공식 Article DNA 기준 파일: `articles/car-aircon-fuel-saving.html`
- 본문 상단 썸네일 금지
- 실제 확인하지 않은 PASS 금지
- ZIP 부재를 이유로 GitHub 작업 불가라고 말하지 않기
- 기능 추가보다 애드센스 승인용 콘텐츠 품질 완성 우선

## 9. 새 대화 시작 문구

`GitHub 연결 확인하고 MASTER_LOG_CURRENT.md, MASTER_LOG_CURRENT_CONTINUATION_2026-07-20.md, MASTER_LOG_ADDENDUM_2026-07-20_CONNECTION_AND_DNA_LOCK.md를 순서대로 읽어. 집이나 ZIP이 없다고 하지 말고 main에서 바로 작업해. car-insurance-overpayment-refund.html 썸네일 삭제부터 시작해.`

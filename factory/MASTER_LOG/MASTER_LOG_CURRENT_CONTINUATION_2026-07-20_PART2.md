# MASTER LOG CURRENT — CONTINUATION 2026-07-20 PART 2

이 문서는 기존 로그를 덮어쓰지 않는 공식 이어쓰기 문서다.

읽기 순서:

1. `factory/MASTER_LOG/MASTER_LOG_CURRENT.md`
2. `factory/MASTER_LOG/MASTER_LOG_CURRENT_CONTINUATION_2026-07-20.md`
3. 이 파일 `factory/MASTER_LOG/MASTER_LOG_CURRENT_CONTINUATION_2026-07-20_PART2.md`

---

## 이번 대화 작업 범위

프로젝트: Savingio 콘텐츠 품질 개선 / 애드센스 승인 준비

저장소: `yusun7749-art/savingio`

브랜치: `main`

최우선 목표는 기능 추가가 아니라 다음 순서다.

1. 기존 콘텐츠 품질 완성
2. 모든 글 DNA 통일
3. 좌측 Explorer·중앙 본문·우측 Right Rail 레이아웃 통일
4. 내부 링크와 카테고리 검증
5. 애드센스 승인 준비

GitHub `main`이 공식 본집이며 ZIP 기준으로 작업하지 않는다.

---

## 이번 대화에서 확인한 GitHub 연결 상태

ChatGPT GitHub Connector를 통해 다음 작업을 실제 수행했다.

- 저장소 파일 조회
- 기존 blob SHA 확인
- HTML 전면 교체
- CSS 수정
- `main` 커밋 생성
- 수정 후 파일 재조회 검증

따라서 다음 대화에서 근거 없이 `GitHub를 수정할 수 없다`, `쓰기 권한이 없다`, `ZIP이 필요하다`고 답하지 않는다.

사용자가 `진행`, `다음`, `0`, `시작`이라고 하면 저장소와 대상 파일을 확인한 뒤 실제 수정부터 수행한다.

---

## 이번 대화에서 완료한 글 1

### `articles/basic-livelihood-discounts.html`

주제: 기초생활수급자 생활요금 감면 신청 방법

실제 반영 커밋:

`504b005d8bbe2d0817f219d185f857882921c2d8`

반영 blob:

`19d235849e1f707a7a8a0d502f907050e7084ded`

적용 내용:

- SEO title 및 meta description 재작성
- canonical 유지
- OG metadata 정리
- Article schema
- FAQ schema
- Hero
- 작성·검수 영역
- 5초 결론
- 30초 질문
- 목차
- 생활요금 감면 전체 설명
- 자동 적용과 별도 신청 구분
- 전기요금 감면
- 도시가스 감면
- 지역난방 감면
- 이동통신 감면
- 유선전화 감면
- TV 수신료 감면
- 이사 후 고객번호 변경과 재신청 안내
- 실행 체크리스트
- FAQ
- 관련글
- 본문 상단 썸네일 없음

주의:

이 글은 새 3열 레이아웃 수정 전에 작성되었으므로, 좌측 Explorer가 없는 2열형 코드가 남아 있는지 공통 레이아웃 정리 후 다시 검수해야 한다.

---

## 이번 대화에서 완료한 글 2

### `articles/basic-pension-application-guide.html`

주제: 기초연금 신청 방법·준비서류·소득인정액·지급 확인

최초 전면 재작성 커밋:

`ec43bd41d725938e434280419b74429b573e0ffa`

최초 재작성 blob:

`3d904409d5fa640a9ec7f2f7fc2c2a70bf3b8edc`

적용 내용:

- 기존 짧은 글 전면 폐기 후 새 글 작성
- 최신 Savingio 본문 DNA
- SEO title 및 meta description
- canonical
- OG metadata
- Article schema
- FAQ schema
- Hero
- 작성·검수 영역
- 5초 결론
- 30초 질문
- 신청 대상과 신청 시기
- 국민연금과 기초연금 차이
- 소득인정액 구성
- 본인·배우자 소득과 재산 확인
- 준비서류 비교표
- 주민센터·국민연금공단·복지로 신청 경로
- 단계별 신청 절차
- 심사·보완 요청·결정 통지·첫 지급 확인
- 감액·탈락·재신청 대응
- 체크리스트
- FAQ
- 관련글
- 본문 상단 썸네일 없음
- 확장형 Right Rail

---

## 이번 대화에서 발생한 중요한 오류 1

기초연금 글 전면 재작성 직후 왼쪽 `Savingio Explorer`가 빠졌다.

잘못된 완료 보고:

- Brain Navigation 유지라고 보고했으나 실제 HTML에는 좌측 Explorer markup이 없었다.
- 기존 구조는 중앙 본문과 Right Rail만 있는 2열이었다.

사용자가 화면을 통해 좌측 목록 누락을 직접 확인했다.

교정 원칙:

- HTML·CSS 문자열 존재만 보고 PASS하지 않는다.
- 실제 레이아웃 구조에 좌측 Explorer markup, 중앙 article column, 우측 Right Rail이 모두 존재해야 한다.
- 세 영역 중 하나라도 빠지면 PASS 금지다.

---

## 좌측 Explorer 복구 작업

기초연금 글에 다음 구조를 추가했다.

- 좌측 `Savingio Explorer`
- 중앙 본문
- 우측 Right Rail

Explorer 그룹:

- 정부지원
- 노후·연금
- 저소득 생활지원
- 계산 도구

현재 글인 `기초연금 신청`에 `active` 및 `aria-current="page"`를 적용했다.

Explorer 복구 커밋:

`89beed674d1aa44ac7d11287b865a656a971db55`

반영 blob:

`46e094723663ae799e2435270841a28a8ede56e0`

---

## 이번 대화에서 발생한 중요한 오류 2

좌측 Explorer를 추가했지만 실제 공개 화면에서 레이아웃이 다시 깨졌다.

사용자 스크린샷에서 확인된 현상:

- Explorer가 화면 왼쪽 대부분의 너비를 차지함
- 중앙 본문이 오른쪽 좁은 열로 밀림
- 제목이 지나치게 좁은 폭에서 여러 줄로 깨짐
- Right Rail이 정상 위치에 보이지 않음

원인:

공통 CSS `css/savingio-article-unified-v3036.css` 하단에 다음 2열 강제 규칙이 있었다.

```css
.page-shell{
  width:min(100%,1180px)!important;
  grid-template-columns:minmax(0,1fr) minmax(220px,250px)!important;
}
```

새 HTML 내부에서는 3열을 선언했지만 공통 CSS가 `!important`로 2열을 강제하여 다음 현상이 발생했다.

- 첫 번째 열에 Explorer가 배치됨
- 두 번째 열에 본문이 배치됨
- 세 번째 요소인 Right Rail은 암시적 grid 영역 또는 화면 밖으로 밀림

즉 Explorer markup만 추가하는 것으로는 해결되지 않으며 공통 CSS 충돌을 함께 처리해야 한다.

---

## 3열 응급 수정

공통 CSS에 `.page-shell:has(> .left-explorer)` 전용 규칙을 추가하여 좌측 Explorer가 있는 글에만 3열을 강제했다.

최종 데스크톱 열 구조:

```text
230px | minmax(0, 760px) | 250px
Explorer | 본문 | Right Rail
```

적용 규칙:

- 최대 전체 폭: 1480px
- 열 간격: 40px
- 좌측 Explorer: 230px
- 중앙 본문: 최대 760px
- 우측 Right Rail: 250px
- 각 직계 자식의 grid-column을 명시적으로 고정

반응형:

- 1200px 이하: 좌측 Explorer + 중앙 본문 2열, Right Rail 숨김
- 900px 이하: 1열 전환, Explorer를 본문 위로 이동, Right Rail을 본문 아래에 표시

수정 파일:

`css/savingio-article-unified-v3036.css`

커밋:

`0703b6c5483ff81f1517d93020a7eea7930d1c39`

CSS blob:

`8b52c67644f1c3d1bc09af8904915907b588e40a`

---

## 현재 레이아웃 LOCK

앞으로 모든 기본글은 데스크톱 기준 다음 3열을 유지한다.

```text
좌측 Brain Navigation / Savingio Explorer
중앙 Article Content
우측 Right Rail
```

필수 조건:

- 좌측 Explorer 표시
- 현재 문서 active 표시
- 중앙 본문 폭 정상
- 우측 Right Rail 표시
- 세 영역이 서로 겹치지 않음
- 본문 제목이 비정상적으로 좁은 폭에서 깨지지 않음
- 1200px 이하 반응형 정상
- 모바일 1열 전환 정상

새 글을 재작성할 때 좌측 목록을 임의로 삭제하거나 2열 구조로 되돌리지 않는다.

---

## 공통 글 DNA LOCK

모든 새 글과 재작성 글은 다음 순서를 유지한다.

1. Header
2. 3열 Page Shell 시작
3. 좌측 Savingio Explorer
4. 중앙 Breadcrumb
5. Hero
   - 카테고리 배지
   - H1
   - Lead
   - 작성·검수 / 최종 업데이트 / 예상 읽기 시간
6. 작성·검수 및 주의문구
7. 5초 결론
8. 30초 질문
9. 목차
10. 핵심 본문
11. 비교표 또는 판단표
12. 단계별 실행 순서
13. 체크리스트
14. FAQ
15. 관련 글
16. 중앙 본문 종료
17. 우측 Right Rail
18. 3열 Page Shell 종료
19. Footer

본문 상단 `figure.thumb` 썸네일은 사용하지 않는다.

---

## 새 PASS 기준

아래 항목을 모두 확인해야 PASS다.

- URL과 slug 유지
- canonical 정상
- title 및 description 정상
- Article schema 정상
- FAQ schema 정상
- Breadcrumb
- Hero
- 작성·검수
- 5초 결론
- 30초 질문
- 목차
- 충분한 문제 해결형 본문
- 표
- 단계별 실행 순서
- 체크리스트
- FAQ
- 관련글
- 본문 썸네일 없음
- 좌측 Explorer 존재
- 현재 글 active 표시
- 중앙 본문 정상 폭
- 우측 Right Rail 존재
- 3열 배치 정상
- 모바일 반응형
- 내부링크 정상
- 카테고리 정상
- GitHub 수정 후 파일 재조회
- 가능하면 실제 공개 페이지 화면 확인

HTML 문자열만 확인하고 화면 검증 없이 `3열 정상`, `Explorer 정상`, `PASS`라고 단정하지 않는다.

---

## 다음 작업 최우선 순서

1. Cloudflare 배포 후 `basic-pension-application-guide` 실제 공개 화면에서 3열이 정상인지 다시 확인한다.
2. 좌측 230px, 중앙 760px, 우측 250px이 실제 브라우저에서 정상 배치되는지 확인한다.
3. 제목 폭, Explorer 폭, Right Rail 노출 여부, 화면 가로 스크롤 여부를 확인한다.
4. 문제가 남아 있으면 글 내부 style을 추가하는 방식이 아니라 공통 Layout CSS 충돌을 정리한다.
5. `basic-livelihood-discounts.html`도 동일한 좌측 Explorer·중앙 본문·우측 Right Rail 3열 구조인지 재검수한다.
6. 이미 재작성한 정부지원 글 전체에서 좌측 Explorer 누락 여부를 검사한다.
7. 그 뒤 다음 콘텐츠 재작성으로 이동한다.

다음 후보 글:

`articles/basic-pension-eligibility.html`

단, 3열 공통 레이아웃 검증이 끝나기 전에는 다음 글로 넘어가지 않는다.

---

## 금지사항

- 기존 MASTER LOG 덮어쓰기 금지
- 이 이어쓰기 문서 삭제 금지
- Explorer 없는 글을 PASS 처리 금지
- 공통 CSS 충돌을 글마다 임시 style로만 덮는 방식 반복 금지
- 실제 공개 화면 미확인 상태에서 레이아웃 완료 단정 금지
- 기존 URL 변경 금지
- 본문 썸네일 재삽입 금지
- 사용자가 요청하지 않은 Factory 기능 확장 금지

---

## 다음 대화 시작 문구

`Savingio 작업 이어서 시작. MASTER_LOG_CURRENT → MASTER_LOG_CURRENT_CONTINUATION_2026-07-20 → MASTER_LOG_CURRENT_CONTINUATION_2026-07-20_PART2 순서로 확인하고 GitHub main 실제 상태와 비교해. 현재 최우선은 기초연금 글 3열 레이아웃 실제 화면 재검증과 공통 Layout CSS 충돌 정리야.`

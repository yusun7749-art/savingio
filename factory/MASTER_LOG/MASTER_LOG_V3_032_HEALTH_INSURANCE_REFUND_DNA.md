# V3.032 — 건강보험 환급금 글 Canonical DNA 적용

## KST 시각

- 2026-07-20

## 사용자 명령

- `진행`
- `articles/car-aircon-fuel-saving.html`을 Savingio 공식 DNA로 사용한다.
- 배경 3등분, 좌측 Brain Explorer, 중앙 본문, 우측 다음 행동·관련 글까지 동일하게 적용한다.

## 실제 대상 선정

- 완료 처리된 기존 10개 글과 직전 정렬 완료 글을 제외했다.
- sitemap의 실제 공개 글 순서를 확인했다.
- 다음 구형 글로 `articles/health-insurance-refund-guide.html`을 선택했다.

## 수정 전 확인

- 파란색 카드형 구형 레이아웃이 남아 있었다.
- Hero와 본문 폭이 공식 DNA와 달랐다.
- 좌측 Brain Explorer·우측 Rail을 포함한 3등분 구조가 공식 기준과 달랐다.
- 목차가 중복 삽입돼 있었다.
- `3초 요약` 중심의 구형 정보 나열 구조였다.

## 실제 수행 작업

- 기존 URL과 canonical을 유지한 채 전면 재작성했다.
- 기준 파일 `articles/car-aircon-fuel-saving.html`의 HTML·CSS·레이아웃 구조를 그대로 적용했다.
- 적용 범위:
  - Savingio 영문 로고와 동일 헤더
  - 크림톤 공통 배경
  - 좌측 Brain Explorer
  - 중앙 760px 본문
  - 우측 Sticky Rail
  - Breadcrumb
  - Hero 배지·H1·Lead·작성검수·수정일·예상 읽기 시간
  - 작성·검수 주의문구
  - 5초 결론
  - 30초 질문
  - 5분 자세히 보기 목차
  - 환급 종류 비교표
  - 공식 조회 실행 순서
  - 보험료 과오납 확인
  - 본인부담상한액 확인
  - 계좌·대리 신청
  - 지급 지연 원인표
  - 환급 사기 예방
  - 체크리스트
  - FAQ 및 FAQ schema
  - 관련 글과 우측 다음 행동 Rail
  - Footer
- 본문 대표 이미지·figure·figcaption은 사용하지 않았다.

## 실제 수정 파일

- `articles/health-insurance-refund-guide.html`

## 보존 항목

- URL: `/articles/health-insurance-refund-guide.html`
- canonical: `https://savingio.com/articles/health-insurance-refund-guide.html`

## 검증 결과

- GitHub 실제 파일 교체: PASS
- Canonical 3등분 DNA 적용: PASS
- 좌측 Brain Explorer 스크립트 연결: PASS
- 우측 관련 글·공식 조회 Rail 적용: PASS
- 구형 중복 목차 제거: PASS
- 본문 썸네일 없음: PASS
- Article schema 적용: PASS
- FAQ schema 적용: PASS
- Cloudflare 공개 화면 육안 검수: PENDING
- 전체 저장소 링크 감사는 기존 전역 FAIL 항목과 분리해 후속 처리한다.

## 관련 커밋

- 글 수정: `f16494b9ebec9de3b3099050f0bb0bc85717499c`

## 다음 즉시 실행 작업

1. Cloudflare 반영 후 `health-insurance-refund-guide.html`을 기준 글과 나란히 육안 검수한다.
2. 헤더·3등분 배경·좌측 Explorer·중앙 본문·우측 Rail이 동일한지 확인한다.
3. 다음 미완성 공개 글을 sitemap과 완료 제외 목록으로 확정한다.
4. 다음 글도 `car-aircon-fuel-saving.html`을 복제하고 내용만 주제에 맞게 교체한다.
5. 수행하지 않은 글은 완료 수량에 포함하지 않는다.

# MASTER LOG CURRENT CONTINUATION — 2026-07-21

## 프로젝트

- 프로젝트: Savingio 콘텐츠 DNA 전면 재작성
- 저장소: `yusun7749-art/savingio`
- 기준 브랜치: `main`
- 공식 Publisher ID: `pub-7605193583747751` — 절대 변경 금지
- 공식 작업 기준은 ZIP이 아니라 GitHub `main`

## 이번 대화에서 확인된 GitHub 연결 상태

- ChatGPT GitHub Connector 연결 정상 확인
- 저장소 읽기 권한 정상
- 저장소 수정·푸시 권한 정상
- `yusun7749-art/savingio`에 대해 `admin`, `maintain`, `pull`, `push`, `triage` 권한 확인
- 새 대화에서 근거 없이 “GitHub 연결이 안 된다”, “쓰기 권한이 없다”고 판단하지 않는다.
- 작업 가능 여부는 반드시 GitHub 실제 확인 후 판단한다.

## 콘텐츠 전면 재작성 LOCK

- 기준 템플릿: `articles/car-aircon-fuel-saving.html`
- 기존 글에서 유지하는 항목:
  - URL
  - H1/제목
  - Meta description
  - 기존 카테고리
- 기존 본문은 보강하지 않는다.
- 기존 본문은 100% 폐기하고 Savingio DNA 기준으로 처음부터 새로 작성한다.
- CSS, 공통 레이아웃, 좌우 사이드바는 임의 변경하지 않는다.
- 본문 상단 figure 썸네일 삭제 원칙을 유지한다.
- 기본 3열 구조를 절대 유지한다.
  - 왼쪽: Brain Navigation / Site Explorer
  - 가운데: 본문
  - 오른쪽: 관련 글·도구·카테고리 사이드바

## 확정 글 DNA

1. Breadcrumb
2. H1
3. Lead
4. 작성·검수 정보
5. 5초 결론
6. 30초 질문
7. 목차
8. 문제 상황
9. 책임 또는 판단 기준
10. 보험 — 해당 주제에만 적용
11. 비용과 돈
12. 신청·처리 절차
13. 준비 서류
14. 계산기 연결
15. 이용 가능한 서비스
16. 표
17. 체크리스트
18. FAQ
19. 관련 글
20. Footer

## 작성 기준

- 2026년 기준 한국 사용자가 실제로 겪는 문제를 해결하는 생활정보 글
- 40~60대도 쉽게 이해할 수 있는 단순하고 명확한 한국어
- 전문용어는 등장 즉시 쉬운 말로 설명
- 약 5,000자 이상을 기본 목표로 한다.
- “오늘은 … 알아보겠습니다” 같은 서론은 사용하지 않는다.
- 검색 키워드 나열보다 사용자가 실제로 해야 할 행동 순서를 먼저 보여준다.

## 글별 작업 전 필수 검사

각 글을 수정하기 전에 반드시 아래 순서로 검사한다.

1. 제목 중복 검사
2. URL 중복 검사
3. 본문·주제 중복 검사
4. 내부 링크 검사
5. 검색 의도(Search Intent) 검사
6. Google SEO 기준 판단
   - 검색 의도가 같으면 신규 글을 만들지 않는다.
   - 검색 의도가 다르면 별도 글로 유지한다.
7. Savingio DNA 적용 판단
   - 중복이 없으면 해당 글 본문을 전면 재작성한다.
   - 중복 의도가 확인되면 기존 대표 글을 강화하고 중복 문서는 통합 또는 정리 대상으로 분류한다.

## 1턴 1글 원칙

- 한 번에 글 하나만 작업한다.
- 완료한 글은 다시 작업 목록에 넣지 않는다.
- 미완료 글만 다음 대상으로 선택한다.
- 사용자가 `진행`이라고 입력하면 설명을 반복하지 않고 즉시 다음 글을 작업한다.

## `진행` 명령 처리 순서

1. GitHub `main`에서 최신 파일과 최근 커밋 확인
2. 완료 글 제외
3. 다음 미완료 글 1개 선정
4. 제목·URL·본문·검색 의도 중복 검사
5. 기존 본문 100% 폐기
6. Savingio DNA로 전면 재작성
7. 내부 링크·계산기·관련 글 연결
8. HTML 구조·Publisher ID·링크 QA
9. GitHub `main`에 실제 커밋
10. 결과만 간단히 보고

## 결과 보고 형식

```text
000X 진행 완료

수정 글
- articles/파일명.html

완료
- 본문 전면 재작성
- Savingio DNA 적용
- 내부 링크·계산기·FAQ·관련 글 연결
- QA 완료

Commit
- 커밋 SHA

다음
- 다음 대상 글
```

## 이번 연속 작업에서 확인된 완료 글

다음 글은 완료 글로 분류하고 이후 작업에서 제외한다.

- `articles/electricity-bill-easy-calculator-guide.html`
- `articles/summer-electricity-tier-check-2026.html`
- `articles/building-land-property-tax.html`
- `articles/energy-voucher-balance-check-2026.html`
  - 확인 커밋: `7f77653f17b2178d7866f250c8d9d3839e4abb35`
- `articles/energy-voucher-documents.html`
  - 확인 커밋: `113989f154190e33509cbcceff9399fb35285473`
- `articles/energy-voucher-online-application.html`
  - 확인 커밋: `c7ae1fc745c30c9c1744623659ce55874e8f4e60`
- `articles/energy-voucher-eligibility-2026.html`
  - 확인 커밋: `525c1a2c2c43e115334ce7a57919b535f3e04bf2`
- `articles/energy-voucher-2026-application.html`
  - Brain Navigation 누락 스크립트 수정 포함
  - 확인 커밋: `af74b32c8fc0d5b06cd52fd278c06e65cd9ca975`
- `articles/car-insurance-overpayment-refund.html`
  - 제목·URL·검색 의도·본문 중복 검사 완료
  - `car-insurance-mileage-refund.html`, `car-insurance-child-discount.html`, `car-insurance-saving.html`과 검색 의도가 다름을 확인
  - 기존 본문 전면 재작성
  - 공식 보험개발원 과납보험료 통합조회 경로와 손해보험협회 자동차보험 종합포털 연결
  - 표·체크리스트·FAQ·관련 글·공식 확인처 적용
  - 상단 `<figure class="thumb">` 없음 확인
  - 기본 3열 구조용 Brain Navigation·가운데 본문·오른쪽 rail 유지
  - H1 1개, canonical 1개, Article/FAQ 스키마 유지
  - 확인 커밋: `0c0b6c72014a6633aad8e741f88cd1e55905010e`

## 관련 확인 커밋

- Brain Navigation: `c8e33eda22d47cca5e211459c336fa0338d494c6`
- Electricity calculator: `5dbdd52a0bec68aa2acdb0322ef6b81b0f80f7a4`
- Summer electricity: `89c3b9596320e06d748d6752ebe38cbadbb402d0`
- Building/Land tax: `6fbc0ff69fe16c5b5a47e5e4e3deed65651b11d2`
- Shared search JS: `0250a46e9e5790a6c7936e4e01c36bc24a8f7078`

## 다음 작업 위치

- 완료 글과 기준 글 `car-aircon-fuel-saving`은 제외한다.
- GitHub `main`에서 다음 미완료 글을 실제 확인해 1개만 선정한다.
- 다음 후보는 `articles/car-tax-annual-payment.html` 이후 순서의 미완료 글이며, 작업 전에 중복·검색 의도 검사를 다시 수행한다.
- 중복이 없으면 URL/H1/Meta/카테고리와 기본 3열 구조를 유지하고 본문만 100% 새로 작성한다.

## 재발 방지 기록

- 이번 대화 중 GitHub 연결이 실제로 활성화되어 있었는데도 연결이 없다고 잘못 판단한 응답이 있었다.
- 앞으로는 도구 목록만 보고 단정하지 않고 GitHub Connector를 직접 호출해 저장소와 권한을 확인한다.
- 실제 확인 전에는 “불가능”을 먼저 말하지 않는다.
- 실행하지 않은 수정이나 테스트를 완료했다고 보고하지 않는다.
- 사용자 명령 `진행`을 설명 반복으로 소비하지 않고 실제 조회·중복검사·수정·QA·커밋으로 처리한다.

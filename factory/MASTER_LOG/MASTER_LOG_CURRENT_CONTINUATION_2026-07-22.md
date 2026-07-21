# MASTER LOG CURRENT CONTINUATION — 2026-07-22

## 사용자 명령

- 다음 글 진행

## 중복 검사

대상:

- `articles/car-tax-annual-payment.html`

비교 대상:

- `articles/car-tax-check-payment-guide.html`
- 재산세·지방세 환급 관련 기존 글

판정:

- 제목 중복 없음
- URL 중복 없음
- 검색 의도 중복 없음
- `car-tax-annual-payment.html`은 자동차세 연납 공제·신청·환급이 핵심
- `car-tax-check-payment-guide.html`은 정기분·연납·체납·납부 상태 조회가 핵심
- 두 글은 관련되지만 사용자의 첫 행동과 검색 목적이 달라 별도 유지

## 실제 수행 작업

- 기존 BODY를 Savingio DNA 기준으로 전면 재작성
- URL, H1, 기존 Meta description, 카테고리 유지
- 2026년 공식 자동차세 연납 기준 반영
  - 공제율 5%
  - 1월·3월·6월·9월 신청 구조
  - 신청 다음 달부터 연말까지 남은 세액의 5% 공제
  - 서울 ETAX·STAX와 그 외 지역 위택스 구분
- 단순 공제율 안내를 실제 행동 순서 중심으로 확대
- 연납의 의미, 공제 계산 구조, 신청 시기별 차이, 예상 절감액, 신청·납부 단계, 차량 매매·폐차 환급, 준비 정보, 실수 방지, 공식 확인처를 추가
- 표·체크리스트·FAQ·관련 글·오른쪽 rail 연결
- 본문 상단 `<figure class="thumb">` 없음 유지
- Brain Navigation 스크립트와 오른쪽 사이드바를 유지해 기본 3열 구조 보존

## QA

- H1 1개: PASS
- canonical 1개: PASS
- Article JSON-LD: PASS
- FAQPage JSON-LD: PASS
- Breadcrumb: PASS
- Lead·작성검수·5초 결론·30초 질문·목차: PASS
- 표·절차·체크리스트·FAQ·관련 글: PASS
- Brain Navigation 스크립트: PASS
- 오른쪽 rail: PASS
- Publisher ID 변경 없음: PASS
- 중복 검색 의도 분리: PASS

## 관련 커밋

- 글 수정: `433ba97a3ed387b059438d1b911606d5287d663b`

## 다음 즉시 실행 작업

- 다음 미완료 글 1개를 GitHub `main`에서 선정
- 제목·URL·본문·검색 의도 중복 검사부터 수행
- 중복이 없을 때만 기존 BODY를 100% 폐기하고 Savingio DNA로 재작성
- 기본 3열 구조와 공식 Publisher ID LOCK 유지

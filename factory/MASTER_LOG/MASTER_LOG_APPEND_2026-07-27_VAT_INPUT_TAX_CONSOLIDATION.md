# MASTER LOG APPEND — 2026-07-27

## 작업명

부가가치세 매입세액 공제 중복 글 통합 및 대표 URL 단일화

## 사용자 명령

- 전체 중복글·유사글·내용이 같은 글을 하나에서 해결되는 글로 통합한다.
- 대표글은 최소 5,000자 이상이며 필요한 경우 10,000자 이상도 허용한다.
- 애드센스 재승인을 최우선으로 한다.

## 실제 수행

1. 대표 URL `articles/vat-input-tax-deduction-2026.html`을 전면 재작성했다.
2. 기존 두 글의 검색 의도를 하나로 통합했다.
3. 사업 관련성, 적격증빙, 불공제 항목, 비영업용 소형승용차, 접대비, 면세사업, 공통매입세액 안분, 상황별 사례, 신고 전 절차, 체크리스트, FAQ, 공식 확인처를 한 페이지에 구성했다.
4. Savingio 데스크톱 3열 구조를 적용했다.
5. 왼쪽 세금 탐색, 중앙 본문, 오른쪽 목적별 카드 5개를 유지했다.
6. 대표글 canonical을 `https://savingio.com/articles/vat-input-tax-deduction-2026.html`로 고정했다.
7. 중복 파일 `articles/vat-input-tax-deduction-items.html`을 삭제했다.
8. `_redirects`에 중복 URL에서 대표 URL로 301 규칙을 추가했다.
9. sitemap에서 중복 URL을 제거했다.
10. 저장소 내부의 중복 URL 참조를 대표 URL로 교체했다.
11. 일회성 통합 Workflow를 실행 후 제거했다.

## 검증

- 대표글 가시 본문 5,000자 이상 Gate: PASS
- H1 1개: PASS
- canonical 대표 URL 일치: PASS
- 오른쪽 목적 카드 정확히 5개: PASS
- 중복 파일 조회: 404 / 삭제 확인
- 301 규칙 존재: PASS
- sitemap 중복 URL 제거: PASS
- 저장소 검색에서 구 URL 참조 없음: PASS

## 관련 커밋

- `a568588718f41f94b730561d6e7232eb5dbcb7ec` 대표글 통합 재작성
- `f31b671eb1ba6ce9c6cc706d0c4cab2873d50f7a` 일회성 통합 자동화
- `d18b45d35301eedd3fdfb02de3c1b188387f2d34` 중복 파일·사이트맵·내부 참조 정리
- `be85ad2a99ad656b10a4b3f9fedab575c8056e3f` 완료된 Workflow 제거

## 현재 상태

FIRST CONSOLIDATION GROUP COMPLETE / REPOSITORY VERIFIED / PRODUCTION DEPLOYMENT AND LIVE URL VERIFICATION PENDING

## 다음 즉시 실행 작업

다음 확정 중복쌍을 처리한다.

- 대표 후보: `articles/small-business-policy-fund.html`
- 흡수·삭제 후보: `articles/small-business-policy-fund-search.html`

동일하게 대표글 전면 통합 → 최소 5,000자 이상 정보 완결 → 중복 파일 삭제 → 301 → sitemap → 내부링크 → Explorer → QA 순서로 진행한다.

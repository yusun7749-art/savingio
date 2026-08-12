# Savingio 2.0 — Clean Rebuild Master Plan

## Status
PRIVATE BUILD. Do not merge to main until full QA is complete.

## Mission
Savingio is a Korean public-money information service that answers current, concrete questions about government benefits, taxes/refunds, social insurance/pensions, and application/payment deadlines.

## Category LOCK
1. 정부지원금·보조금
2. 세금·환급
3. 4대보험·연금
4. 복지 캘린더

## Excluded
- 대출
- 민간보험 상품 추천/비교
- 투자/주식/코인
- 신용상품
- 고위험 금융상품 콘텐츠

## Housing/Tax Cluster
주택은 별도 대분류로 늘리지 않는다. 세금·환급과 정부지원금·보조금 안에서 실제 질문 중심으로 다룬다.
Examples: 종합부동산세, 재산세, 주택 관련 세금, 공동명의 특례, 합산배제, 주택 수 산정, 주거지원.

## Content Constitution
- 기존 Savingio 본문 재사용 금지.
- 기존 글 수를 유지하기 위한 콘텐츠 생산 금지.
- 카테고리별 글 개수 맞추기 금지.
- 관련글 자동 5개/무조건 연결 금지.
- 뉴스/제도변경/신청기간/실제 사용자 질문에서 콘텐츠를 시작한다.
- 하나의 질문에 기존 문서가 충분히 답하면 새 URL을 만들지 않고 기존 문서를 업데이트한다.
- 새 URL은 독립적인 검색의도와 충분한 독자 가치가 있을 때만 만든다.
- 관련 링크는 다음 행동에 실제 필요할 때만 0~3개 연결한다.
- 공식기관 1차 자료 우선.
- 적용 기준일, 대상, 제외대상, 예외조건, 신청경로, 출처, 검수일을 명확히 한다.
- 자동 생성 콘텐츠의 무검수 공개 금지.

## Page Types
1. Answer — 하나의 실제 질문을 해결
2. Guide — 복잡한 제도를 단계별로 설명
3. Update — 제도/세법/지원정책 변경을 기존 핵심 문서와 연결
4. Calendar — 신청·신고·납부·마감 일정과 지금 해야 할 행동
5. Hub — 단순 링크 목록 금지. 해당 주제의 핵심 설명과 현재 상태를 제공할 때만 존재

## Navigation Principle
Navigation is not content. Category and search screens must not exist merely to expose more links. No forced content graph. No automatic related-post chains.

## Architecture Principle
- Header one source of truth.
- Footer one source of truth.
- Article shell one source of truth.
- No runtime JS replacement of header/layout.
- No legacy CSS imports.
- No page-specific duplicate navigation systems.
- First HTML paint must already be the final layout.
- Progressive enhancement only; JS must not be required to repair the page structure.

## AdSense Safety
- No ad code during private rebuild.
- No ads on search, navigation-only, error, empty, under-construction, or utility-only screens.
- Ads are considered only after content and QA are complete.
- Review request is prohibited until production replacement and post-deploy audit are complete.

## Release Gate
Before merge to main:
- content QA
- source/date QA
- duplicate-intent QA
- internal-link QA
- 404/redirect QA
- canonical/sitemap/robots QA
- desktop/mobile layout QA
- first-paint/layout-shift QA
- no legacy header/navigation dependency
- no accidental AdSense code on non-content pages

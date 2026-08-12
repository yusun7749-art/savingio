# Savingio 2.0 — Question-First Content Engine

## Input
A real trigger, not a keyword inventory:
- 정부/공공기관 발표
- 법령·시행령·고시·지침 변경
- 신청 시작/마감
- 세금 신고·납부·고지 시점
- 반복적으로 발생하는 실제 질문
- 검색자가 조건에 따라 답이 달라지는 문제

## Decision Flow
1. What changed or what is the user trying to decide?
2. Identify the exact question.
3. Check primary official sources.
4. Does an existing Savingio 2.0 page already answer it completely?
   - YES: update that page; do not create a new URL.
   - NO: continue.
5. Is the question independently useful enough to deserve its own URL?
   - NO: add it as a section/FAQ to the appropriate canonical page.
   - YES: create one focused page.
6. Add only the links required for the reader's next action (0–3).
7. Human/editorial QA before publication.

## Required Evidence Block
Every factual policy page must maintain internally:
- 기준일
- primary source URL(s)
- announcement/effective date where relevant
- eligibility conditions
- exclusions/exceptions
- uncertainty or pending change
- last reviewed date

## Article Output
The visible article is not forced into a fixed long template. Use only sections needed to answer the question.

Minimum editorial requirements:
- Clear answer near the top
- Who this applies to
- What changed/current rule when relevant
- Concrete action steps
- Exceptions/edge cases when material
- Official source(s)
- Updated/reviewed date

## Prohibited Patterns
- 5,000 characters merely to hit length
- generic introductions
- repeated definitions across many URLs
- keyword permutations as separate articles
- auto-generated FAQ padding
- automatic related-post blocks
- fabricated examples, rates, thresholds or dates
- news rewrite without added explanation/action value

## Update Model
News is a trigger, not the product.
When news changes an existing topic, update the canonical guide and optionally publish a short Update page only when the change itself has independent user value. The Update must point to the canonical guide only when that is the reader's logical next step.

## Initial Topic Seeds — not a publication quota
### 정부지원금·보조금
- current application windows
- eligibility changes
- housing support
- energy/living support

### 세금·환급
- 종합부동산세
- 재산세
- 주택 세금
- 연말정산/환급
- 국세·지방세 환급

### 4대보험·연금
- 국민연금
- 건강보험
- 고용보험
- 산재보험
- 보험료 환급/감면

### 복지 캘린더
- this month applications
- deadlines this week/month
- tax filing/payment dates
- benefit/pension administrative dates

# SAVINGIO MASTER CONTENT DECISION — PROPERTY TAX V2

- 기준: `SAVINGIO_WRITING_CONSTITUTION_V2.md`
- 대상: 재산세 검색 의도 클러스터
- 이번 검토 URL: 8개
- 누적 V2 분석: 46 / 177

## 1. 검토 URL

1. `articles/building-land-property-tax.html`
2. `articles/missing-property-tax-bill.html`
3. `articles/property-tax-bill-checklist-2026.html`
4. `articles/property-tax-calculation-structure.html`
5. `articles/property-tax-deadline.html`
6. `articles/property-tax-electronic-bill-2026.html`
7. `articles/property-tax-installment-application.html`
8. `articles/property-tax-joint-ownership.html`

## 2. 최종 판정

### 대표글

- `articles/property-tax-bill-checklist-2026.html` — REPRESENTATIVE

재산세 고지서를 받은 사용자가 가장 먼저 확인해야 하는 과세기준일, 납세의무자, 과세대상, 과세표준, 7월·9월 납부 일정, 오류 확인을 한 페이지에서 해결하는 중심 글로 유지한다.

### 대표글에 통합 후 삭제·301

- `articles/property-tax-deadline.html` — MERGE / DELETE / 301
  - 납부기한, 7월·9월 일정, 20만원 이하 주택분 일괄부과, 감면 확인은 대표 고지서 체크리스트의 핵심 하위 질문과 직접 겹친다.
  - 301: `/articles/property-tax-deadline.html` → `/articles/property-tax-bill-checklist-2026.html`

### 독립 유지

- `articles/building-land-property-tax.html` — KEEP
  - 건축물분과 토지분이 따로 고지되는 이유와 7월·9월 과세대상 차이를 다루는 독립 검색 의도다.

- `articles/missing-property-tax-bill.html` — KEEP
  - 고지서 미수령 상태에서 위택스 조회, 주소·전자송달, 체납 여부를 확인하는 문제 해결 의도가 독립적이다.

- `articles/property-tax-calculation-structure.html` — KEEP
  - 공시가격, 과세표준, 세율, 도시지역분, 지방교육세의 계산 구조를 이해하려는 검색 의도가 독립적이다.

- `articles/property-tax-electronic-bill-2026.html` — KEEP
  - 전자고지 신청, 적용 시점, 세액공제, 종이고지 중단과 알림 누락 대응은 별도 행동 의도다.

- `articles/property-tax-installment-application.html` — KEEP
  - 분납 대상 금액, 신청기한, 신청 경로와 납부 순서를 찾는 직접 행동 의도다.

- `articles/property-tax-joint-ownership.html` — KEEP
  - 공동명의자의 지분별 납세의무와 고지서 오류를 확인하려는 독립 검색 의도다.

## 3. 대표글 흡수 항목

`property-tax-bill-checklist-2026.html` 재작성 시 아래 내용을 완전히 포함한다.

1. 6월 1일 과세기준일과 매매 시 납세의무자
2. 주택분 7월·9월 분할 고지 원칙
3. 건축물분 7월, 토지분 9월 일정
4. 주택 연세액 20만원 이하 일괄부과 가능성
5. 납부기한이 휴일과 겹칠 때 실제 마감일 확인
6. 감면 여부와 고지서 반영 여부 확인
7. 납기 전 관할 지자체 문의와 불복 절차
8. 위택스 조회·납부 및 납부 완료 확인

## 4. 집계

| 항목 | 개수 |
|---|---:|
| 분석 URL | 8 |
| 대표글 | 1 |
| 독립 유지 | 6 |
| 통합·삭제·301 | 1 |

## 5. LOCK

- 이번 문서는 검색 의도 판정 기록이며 HTML 삭제와 301 실행 완료 보고가 아니다.
- 삭제 전 대표글에 고유 정보, 사례, 표, FAQ를 먼저 흡수한다.
- sitemap, 카테고리, Explorer, 관련글, 계산기 링크를 함께 수정한 뒤 실제 URL을 검증한다.
- 검증 전에는 삭제·301 완료로 표시하지 않는다.

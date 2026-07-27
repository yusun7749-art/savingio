# SAVINGIO V2 CONTENT DECISION — BEGINNER MONEY MANAGEMENT CLUSTER

- 판정일: 2026-07-27
- 기준 브랜치: `main`
- 기준 헌법: `SAVINGIO_WRITING_CONSTITUTION_V2.md`
- 전체 비교 대상: 4개 URL

## 1. 비교 대상

1. `articles/beginner-money-management.html`
2. `articles/beginner-budget-plan.html`
3. `articles/bank-account-budgeting.html`
4. `articles/budget-app-guide.html`

## 2. 최종 판정

### 대표글 유지

- `articles/beginner-money-management.html` — REPRESENTATIVE

핵심 검색 의도:
- 월급이 들어온 뒤 수입·필수비·생활비·비상금·부채를 어떤 순서로 관리할지 처음부터 정리하려는 사용자
- 초보 돈 관리의 전체 실행 흐름

### 대표글로 통합 후 삭제·301 대상

- `articles/beginner-budget-plan.html` — MERGE / DELETE / 301

판정 근거:
- 두 글 모두 월급이 사라지는 문제를 출발점으로 삼는다.
- 고정비·생활비·비상금 분리, 변동소득 처리, 예산 초과 점검, 가계부를 매일 쓰지 않아도 되는 구조가 중복된다.
- `beginner-budget-plan.html`의 고유 요소인 첫 달 예산표, 예산 비율을 고정하지 않는 원칙, 초과 원인 분류는 대표글에 흡수한다.
- 최종 리디렉션: `/articles/beginner-budget-plan.html` → `/articles/beginner-money-management.html`

### 독립 유지

- `articles/bank-account-budgeting.html` — KEEP

판정 근거:
- 검색 의도가 일반 돈 관리가 아니라 통장 쪼개기의 구체적 구조와 자동이체 순서에 집중된다.
- 월급통장·고정비통장·생활비통장·비상금통장의 개수, 역할, 이동 순서라는 독립 실행 의도가 있다.
- 대표글에서는 통장 분리 원칙만 요약하고 상세 실행은 이 글로 연결한다.

- `articles/budget-app-guide.html` — KEEP

판정 근거:
- 앱 선택·자동연동·개인정보·자동분류 수정·데이터 내보내기·탈퇴 절차라는 도구 선택 의도가 명확하다.
- 돈 관리 방법과 달리 제품·기능 비교 및 설정 목적이 강해 별도 대표글로 유지한다.

## 3. 대표글 흡수 항목

`beginner-money-management.html` 재작성 시 다음 내용을 포함한다.

1. 최근 실수령액과 필수비 확인
2. 고정비·생활비·비상금의 첫 달 예산표
3. 50·30·20 같은 비율을 절대 기준으로 쓰지 않는 이유
4. 변동소득자는 최근 낮은 수입을 기준으로 잡는 방법
5. 예산 초과 원인을 고정비·예상 밖 지출·습관성 지출로 나누는 방법
6. 통장 분리는 선택 사항이며 목적부터 나누는 원칙
7. 통장 쪼개기 상세글과 가계부 앱 선택글로 이어지는 내부링크

## 4. 실행 상태

| 항목 | 결과 |
|---|---:|
| 전체 비교 | 4개 |
| 대표글 | 1개 |
| 통합·삭제·301 확정 | 1개 |
| 독립 유지 | 2개 |
| 실제 삭제 | 0개 |
| 실제 301 | 0개 |

> 삭제와 301은 대표글에 고유 정보가 실제 흡수되고 sitemap·내부링크·카테고리 연결을 확인한 뒤 실행한다.

## 5. 누적 현황

- V2 검색 의도 분석 완료: 34 / 177
- V2 미분석: 143
- 이번 클러스터에서 삭제·301 확정: 1

# SAVINGIO MASTER CONTENT DECISION — GOVERNMENT BENEFITS V2

- 기준: `SAVINGIO_WRITING_CONSTITUTION_V2.md`
- 분석 대상: 정부지원금 사기 예방·정부24 혜택알리미 관련 4개 URL
- 판정일: 2026-07-27

## 1. 지원금 문자 사기 예방 클러스터

### 대표글

- `articles/benefit-scam-warning-2026.html` — REPRESENTATIVE

### 통합·삭제·301 확정

- `articles/government-benefits-warning.html` — MERGE / DELETE / 301
- 최종 목적지: `/articles/benefit-scam-warning-2026.html`

### 판정 근거

두 글 모두 지원금·환급금 사칭 문자와 링크의 진위 확인, 개인정보 입력, 악성 앱 설치, 송금 이후 대응을 같은 순서로 다룬다. 핵심 검색 의도와 행동 흐름이 사실상 동일하다.

`benefit-scam-warning-2026.html`은 다음 요소가 더 구체적이어서 대표글로 유지한다.

- 제목이 지원금 문자 사기 구별이라는 직접 검색 의도와 일치
- 링크 클릭 전 위험 신호 7가지
- 공식 경로 재확인
- 클릭·개인정보 입력·앱 설치·송금 단계별 대응
- 사기 위험도 점검 도구 연결

`government-benefits-warning.html`의 고유 정보는 대표글에 흡수한 뒤 URL을 제거하고 301 처리한다.

## 2. 정부24 혜택알리미 클러스터

### 대표글

- `articles/government-benefit-alert-2026.html` — REPRESENTATIVE

### 통합·삭제·301 확정

- `articles/government-benefit-alert-setup.html` — MERGE / DELETE / 301
- 최종 목적지: `/articles/government-benefit-alert-2026.html`

### 판정 근거

두 글 모두 정부24 혜택알리미의 나의 혜택·관심·발견·간편찾기·전체 혜택과 이용동의·알림 수신 설정을 다룬다. 설정 글의 검색 의도는 혜택알리미 전체 이용 과정의 하위 단계다.

`government-benefit-alert-2026.html`은 다음 내용을 이미 포함하거나 자연스럽게 흡수할 수 있어 최종 대표글로 유지한다.

- 받을 수 있는 지원금 찾기
- 나의 혜택·관심·발견 메뉴 사용
- 신청 조건·기간·접수기관 확인
- 가족 혜택 확인
- 문자 링크 안전 확인
- 혜택알리미와 보조금24 관계
- 이용동의·알림 수신동의·관심 서비스 설정

`government-benefit-alert-setup.html`의 설정 순서와 알림 미수신 점검 항목을 대표글에 흡수한 뒤 삭제·301 처리한다.

## 3. 최종 처리표

| URL | 최종 판정 | 처리 |
|---|---|---|
| `benefit-scam-warning-2026.html` | REPRESENTATIVE | 유지·재창조 |
| `government-benefits-warning.html` | MERGE | 정보 흡수 후 삭제·301 |
| `government-benefit-alert-2026.html` | REPRESENTATIVE | 유지·재창조 |
| `government-benefit-alert-setup.html` | MERGE | 설정 정보 흡수 후 삭제·301 |

## 4. 집계

| 항목 | 개수 |
|---|---:|
| 분석 URL | 4 |
| 대표글 | 2 |
| 통합·삭제·301 확정 | 2 |
| 독립 유지 | 0 |

## 5. 실행 LOCK

- 대표글에 고유 질문·사례·표·FAQ·공식 경로를 먼저 흡수한다.
- 흡수 완료 전 원본 URL을 삭제하지 않는다.
- 삭제 시 sitemap, 카테고리 목록, Explorer, 관련글, 본문 내부링크를 함께 교체한다.
- 기존 문장을 복사하지 않고 대표글을 처음부터 재작성한다.
- 301 목적지는 위 표의 대표글 URL로 고정한다.

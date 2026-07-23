# Savingio 공통 플랫폼 Framework 구현 기록

최종 갱신: 2026-07-23 KST

## 목적

남은 생활정보 글 약 60개를 계속 재작성하기 전에 생활정보·계산기·Lab·관련 글이 같은 데이터 원본과 연결 규칙을 사용하도록 공통 기반을 먼저 고정한다.

## 이번에 실제 구현한 파일

### 1. `js/savingio-platform-registry.js`

Savingio 전체 기능의 단일 Registry 기반이다.

관리 대상:

- articles
- calculators
- labs
- related articles
- official links

주요 기능:

- 단일 레코드 등록
- 일괄 등록
- slug 및 URL 기반 조회
- 글별 계산기·Lab·관련 글 자동 해석
- 누락된 연결 검사

### 2. `js/savingio-calculator-framework.js`

계산기를 HTML마다 새로 코딩하지 않고 입력 스키마와 공식 데이터로 생성하기 위한 공통 계산기 Core다.

기본 Formula Handler:

- sum
- difference
- multiply
- percentage
- annualize
- savings

추가 계산 공식은 기존 Core를 수정하지 않고 `registerHandler()`로 모듈을 끼워 넣는다.

### 3. `js/savingio-connection-framework.js`

현재 글의 slug를 기준으로 Registry를 조회하고 다음 슬롯에 자동 연결하는 Adapter다.

- `data-savingio-slot="calculators"`
- `data-savingio-slot="lab"`
- `data-savingio-slot="related-articles"`
- `data-savingio-slot="official-links"`

페이지별 연결 로직을 다시 작성하지 않고 공통 슬롯과 Registry 데이터만 사용한다.

### 4. `js/savingio-platform-data.js`

현재 확인된 기존 계산기를 공통 Registry에 등록하는 첫 데이터 파일이다.

등록된 계산기:

- 전기요금 계산기
- 월급 실수령액 계산기
- 시급 월급 환산 계산기
- 퇴직금 계산기
- 대출 상환액 계산기

## 고정 구조

```text
Article Data
   ↓
Platform Registry
   ↓
Connection Framework
   ├─ Calculator
   ├─ Lab
   ├─ Related Article
   └─ Official Link
```

계산기 생성 구조:

```text
Calculator Definition
   ├─ inputs
   ├─ formula.type
   ├─ formula parameters
   ├─ result format
   └─ explanation
          ↓
Calculator Framework
          ↓
공통 계산기 UI 및 결과
```

## 다음 실제 연결 작업

1. 승인된 생활정보 공통 Article DNA에 공통 스크립트 로드 위치를 한 번만 삽입한다.
2. 오른쪽 두 번째 카드와 본문 계산기 영역을 `data-savingio-slot="calculators"` 슬롯으로 고정한다.
3. 관련 글·공식기관·Lab 영역도 같은 방식으로 슬롯을 고정한다.
4. 기존 글 데이터를 Registry 레코드로 변환한다.
5. 남은 약 60개 글은 재작성과 동시에 Registry 데이터 1개만 추가한다.
6. 글의 검색 의도에 맞는 계산기가 없으면 Calculator Framework 정의를 추가한다.
7. GitHub main·Cloudflare·실제 화면 확인 전에는 PASS를 선언하지 않는다.

## 현재 상태

- 공통 Registry Core: 구현
- 공통 Calculator Core: 구현
- 공통 Connection Adapter: 구현
- 초기 Calculator Registry Data: 구현
- 기존 생활정보 공통 템플릿 연결: 미적용
- 기존 전체 글 Registry 변환: 미적용
- 운영 화면 검증: 미확인

따라서 이번 단계는 Framework 기반 구현 완료이며 운영 페이지 교체 완료 상태는 아니다.

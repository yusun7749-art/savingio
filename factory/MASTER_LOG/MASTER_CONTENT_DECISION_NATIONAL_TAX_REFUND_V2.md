# MASTER CONTENT DECISION — NATIONAL TAX REFUND V2

## 작업 기준
- 저장소: `yusun7749-art/savingio`
- 기준 브랜치: `main`
- 분석 목적: AdSense 재승인 전 콘텐츠 중복·검색의도 충돌 점검
- 직전 누적 분석: 57 / 177

## 분석 대상
1. `articles/national-tax-refund.html`
2. `articles/national-tax-refund-account.html`

## 검색 의도 분리

### 1. 국세 환급금 조회 허브
- URL: `national-tax-refund.html`
- 핵심 의도: 국세 환급금 존재 여부, 미수령 환급금, 지급 상태, 충당 여부를 한 번에 확인
- 역할: 국세 환급금 클러스터의 대표 허브
- 결정: **유지**

### 2. 국세환급금 지급계좌 등록
- URL: `national-tax-refund-account.html`
- 핵심 의도: 환급계좌 등록·변경·해지, 계좌 우선순위, 계좌 오류와 지급 지연 해결
- 역할: 허브에서 계좌 문제를 해결하는 세부 실행 글
- 결정: **독립 유지**

## 중복 판단
- 두 글 모두 국세 환급금을 다루지만 검색 단계가 다르다.
- `national-tax-refund.html`은 환급금 조회와 미지급 원인 파악이 중심이다.
- `national-tax-refund-account.html`은 지급계좌 등록·변경이라는 후속 행동이 중심이다.
- 제목과 본문 일부에 계좌 내용이 겹치지만, 사용자의 문제 해결 단계가 분리돼 있어 통합 시 검색 의도가 약해진다.

## 최종 결정
- 대표 허브: `national-tax-refund.html`
- 독립 유지: `national-tax-refund-account.html`
- 통합: 없음
- 삭제: 없음

## 내부 링크 구조
`national-tax-refund.html`
→ 환급금 존재·지급 상태 확인
→ 계좌 문제 발견 시 `national-tax-refund-account.html`
→ 계좌 등록·변경 후 다시 환급금 상세조회에서 지급 상태 확인

## 다음 QA 항목
- 두 글의 관련글 영역에서 상호 링크 유지
- 대표 허브에서 지급계좌 글로 직접 연결
- 지급계좌 글에서 미수령 환급금 조회 글로 복귀 링크 유지
- 근로장려금 계좌 변경 글과 국세환급금 계좌 글을 혼동하지 않도록 문구 분리
- sitemap·Explorer에서 두 URL 모두 유지

## 진행률
- 이번 분석: 2개
- 누적 분석: **59 / 177**
- 남은 분석: **118**

# Savingio 콘텐츠 감사·애드센스 인수인계

최종 갱신: 2026-07-31 KST

## 프로젝트
- 저장소: `yusun7749-art/savingio`
- 브랜치: `main`
- 최우선 목표: 애드센스 재승인
- 공식 Publisher ID: `pub-7605193583747751` — 변경 금지
- 실제 구현 상태의 최종 기준은 GitHub `main`
- 완료는 실제 수정, 커밋, 재조회 확인 후에만 판정

## 최신 감사 결과
- 전체 글: 171개
- 4,200자 이상: 155개
- 4,200자 미만 재점검 대상: 16개

재점검 대상:
1. `articles/spending-habits-change.html`
2. `articles/card-points-cashback-guide.html`
3. `articles/impulse-buying-control.html`
4. `articles/cash-advance-vs-card-loan.html`
5. `articles/unemployment-benefit-checklist.html`
6. `articles/severance-pay-calculation-guide.html`
7. `articles/telecom-unclaimed-refund.html`
8. `articles/money-saving-habits.html`
9. `articles/weekly-holiday-pay-guide.html`
10. `articles/business-phone-expense-deduction.html`
11. `articles/government24-benefit-check.html`
12. `articles/hometax-refund-status.html`
13. `articles/government-benefit-alert-setup.html`
14. `articles/student-loan-repayment-guide.html`
15. `articles/salary-slip-check-guide.html`
16. `articles/government-support-calendar.html`

중요: 과거 수정 커밋이 있더라도 최신 파일을 다시 검사하기 전에는 완료 수를 임의로 줄이지 않는다. 이전의 `4개 완료, 12개 남음` 보고는 재검증 없는 수치였으므로 폐기한다.

## 중복 감사
- 중복 의심 글: 26개
- 비교 쌍: 90개
- 클러스터: 6개
- 자동 병합 후보: 0개
- 둘 다 유지 판정: 90개

원칙:
- 자동 삭제·자동 통합 금지
- 26개만 검색 의도 기준으로 검토
- 검색 의도가 다르면 유지
- 겹치면 제목·도입부·내부 링크 역할을 분리
- 동일 의도와 내용이 확인될 때만 통합 검토

## 실제 완료된 GitHub 작업

### `articles/cash-advance-vs-card-loan.html`
- 실제 수정 커밋: `bf886349d4a4fa3c9deec15447c5f59aac007dca`
- 수정 파일 재조회 확인 완료

### `articles/unemployment-benefit-checklist.html`
- 실제 수정 커밋: `4e0b22762c314eecb60cbb5674eafb248b8d144b`
- 수정 후 blob SHA: `110f2c590ed330221fcd88321125691b6098481e`
- 수정 파일 재조회 확인 완료
- 깨진 자동 요약과 중복 목차 정리
- 고용보험 이력, 이직 사유, 이직확인서, 신청·실업인정 흐름 재구성
- 자진퇴사 예외, 소득 신고, FAQ, 체크리스트, 공식 확인처 보강
- URL과 H1 유지

### `articles/severance-pay-calculation-guide.html`
- 실제 수정 커밋: `b122877f013e2595485b5c2a24e9da97c602c400`
- 수정 후 blob SHA: `2f49627984cf3f8bf91f32127be685baf6cc629b`
- 수정 파일 재조회 확인 완료
- 기존 잘린 자동 요약과 중복 목차 제거
- URL, 파일명, H1, 정부지원 카테고리 유지
- 평균임금과 통상임금 차이, 계속근로기간, 1년·주 15시간 기본조건 보강
- 퇴직금 공식과 실제 계산 사례, 상여금·연차수당, 휴직·중간정산, 14일 지급기한 보강
- 고용노동부 노동포털 계산기와 국가법령정보센터 공식 확인처 연결
- 비교표, 체크리스트, FAQ, 문제 해결 사슬형 관련 글 구성
- Brain Navigation 자산 유지: `/data/savingio-brain-data.js?v=17`, `/js/savingio-brain-navigation.js?v=17`
- 오른쪽 카드 5개 목적과 순서 유지
- 다음 대상: `articles/telecom-unclaimed-refund.html`

## 이번 대화의 오류와 교정
- GitHub 쓰기 기능이 활성화되어 있는데도 수정할 수 없다고 답한 것은 잘못이었다.
- 앞으로 먼저 GitHub 도구를 조회하고 실제 실행을 시도한다.
- 커밋 없이 완료라고 보고하지 않는다.
- 진행률은 최신 파일 재검사 후에만 갱신한다.

## 작업 범위
전체 171개를 다시 처음부터 감사하지 않는다.

1. 4,200자 미만 16개를 한 글씩 재점검·보강
2. 중복 의심 26개 검색 의도 검토
3. 내부 링크·Navigation·카테고리 QA
4. Search Console 확인
5. 애드센스 재심사

## 글 1개 처리 절차
1. GitHub `main`에서 파일 조회
2. 현재 본문 길이와 DNA 구조 확인
3. URL·파일명·H1·slug·카테고리 유지
4. 짧거나 자동 생성 티가 나면 검색 의도에 맞게 재작성
5. 반복 문장 대신 실제 문제 해결 정보 보강
6. 내부 링크·계산기·공식기관·카테고리 링크 확인
7. 왼쪽 Navigation·중앙 본문·오른쪽 5개 카드 유지
8. 실제 파일 수정 및 커밋
9. 수정 파일 재조회 및 blob SHA 확인
10. 확인된 작업만 PASS 보고

## 공식 콘텐츠 DNA
Breadcrumb → H1 → Lead → 작성·검수 → 핵심 요약 → 내 상황 확인 → 지금 해야 할 행동 → 목차 → 상세 본문 → 비교표 → 체크리스트 → 사례 → 제도·예외 → 계산기·공식기관 → FAQ → 문제 해결 사슬형 관련 글 → Footer

오른쪽 카드는 정확히 5개 목적과 순서를 유지한다.
1. 지금 해야 할 행동
2. 계산기/점검도구
3. 같은 카테고리 글
4. 함께 볼 관련 글
5. 다음 단계/주의사항

본문 상단의 불필요한 `<figure class="thumb">`는 제거 유지한다.

## 현재 즉시 대상
`articles/telecom-unclaimed-refund.html`

확인 항목:
- 현재 실제 본문 길이
- 미환급금 발생 원인과 통신사별 조회 경로
- 공식 조회·신청처와 개인정보 주의
- 환급 대상·소멸 관련 단정 금지
- FAQ·표·체크리스트
- 내부 링크·Navigation·오른쪽 카드 5개

완료 조건:
- 실제 파일 수정
- 커밋 SHA 생성
- 수정 파일 재조회
- blob SHA 확인

그다음 순서:
1. `money-saving-habits.html`
2. `weekly-holiday-pay-guide.html`
3. `business-phone-expense-deduction.html`
4. `government24-benefit-check.html`
5. `hometax-refund-status.html`
6. `government-benefit-alert-setup.html`
7. `student-loan-repayment-guide.html`
8. `salary-slip-check-guide.html`
9. `government-support-calendar.html`

## 보고 형식
- PASS ✅: 수정·커밋·재조회 완료
- FAIL ❌: 실제 검사에서 오류 확인
- FIX 🔧: 수정 또는 추가 보강 필요
- PENDING: 배포·운영 화면·Search Console 미확인

반드시 수정 파일, 커밋 SHA, blob SHA, 보강 내용, 링크·Navigation·카테고리 검증, 남은 문제, 다음 대상을 기록한다.

## 새 대화 재시작 문구
`Savingio 애드센스 재승인 작업 이어서 시작. GitHub yusun7749-art/savingio main 기준으로 factory/MASTER_LOG/MASTER_LOG_HANDOVER_2026-07-31_CONTENT_AUDIT.md와 MASTER_LOG_CURRENT.md를 먼저 읽고 최신 main과 비교해. 전체 171개를 다시 보지 말고 4,200자 미만 감사 대상 16개를 한 글씩 실제 수정·커밋·재조회해. 현재 대상은 articles/telecom-unclaimed-refund.html이다. 이후 중복 의심 26개 검색 의도 검토 → 내부 링크·Navigation·카테고리 QA → Search Console → 애드센스 재심사 순서로 진행해. 커밋과 재조회가 있을 때만 PASS라고 보고해.`
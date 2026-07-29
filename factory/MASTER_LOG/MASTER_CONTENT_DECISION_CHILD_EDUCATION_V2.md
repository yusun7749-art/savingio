# MASTER CONTENT DECISION — CHILD & EDUCATION SUPPORT V2

작성일: 2026-07-29
저장소: yusun7749-art/savingio
대상 범위: 출산·아동·돌봄·교육비·장학·학자금 관련 운영 글 9개

## 1. 검토 대상

1. `articles/parental-benefit-guide.html`
2. `articles/child-allowance-application-guide.html`
3. `articles/child-care-service-government-support.html`
4. `articles/first-meeting-voucher-guide.html`
5. `articles/education-benefit-application.html`
6. `articles/education-expense-support-difference.html`
7. `articles/national-scholarship-application.html`
8. `articles/lifelong-education-voucher-guide.html`
9. `articles/student-loan-repayment-guide.html`

## 2. 최종 결정

### A. 상위 허브 역할

- 별도 신규 허브를 즉시 만들지 않는다.
- 현재 9개 글은 생애주기와 신청 사건이 뚜렷하게 갈리므로 각 글을 독립 유지하되, 내부 링크를 `출생·영유아 → 초중고 → 대학·성인교육` 순서로 재배치한다.

### B. 독립 유지

#### 출생·영유아

- `parental-benefit-guide.html`
  - 부모급여 신청, 신청기한, 어린이집 이용 시 지급 방식 확인
- `child-allowance-application-guide.html`
  - 아동수당 대상, 신청, 계좌·지급 누락 확인
- `child-care-service-government-support.html`
  - 아이돌봄서비스 정부지원 등급, 이용시간, 본인부담과 신청 절차
- `first-meeting-voucher-guide.html`
  - 첫만남이용권 신청, 지급수단, 사용처와 사용기한 확인

#### 초중고 교육지원

- `education-benefit-application.html`
  - 교육급여 신청, 소득기준 확인, 교육활동지원비 지급 흐름
- `education-expense-support-difference.html`
  - 교육급여와 교육비 지원의 차이, 중복 가능성과 신청 창구 구분

#### 대학·성인교육

- `national-scholarship-application.html`
  - 국가장학금 신청, 가구원 동의, 서류 제출, 심사·지급 확인
- `student-loan-repayment-guide.html`
  - 학자금대출 상환 유형, 자동이체, 중도상환, 연체 예방
- `lifelong-education-voucher-guide.html`
  - 평생교육바우처 신청, 선정, 사용기관·사용기간 확인

## 3. 통합·삭제 결정

- 즉시 통합 대상: 없음
- 즉시 삭제 대상: 없음
- URL 삭제 대상: 없음

겉으로는 모두 아동·교육 지원이지만 실제 검색 의도는 서로 다르다.

- 출생 직후 현금·바우처 확인 → 부모급여·아동수당·첫만남이용권
- 맞벌이·돌봄 공백 해결 → 아이돌봄서비스
- 초중고 교육비 부담 해결 → 교육급여·교육비 지원
- 대학 등록금·대출 부담 해결 → 국가장학금·학자금대출
- 성인 재교육 지원 → 평생교육바우처

따라서 하나로 합치면 대상 연령, 신청 기관, 지급 방식, 준비서류가 섞여 오히려 사용자 행동 경로가 흐려진다.

## 4. 중복 위험 및 품질 조치

### A. 부모급여·아동수당·첫만남이용권

세 글 모두 출생 후 신청이라는 공통점이 있으므로 초반에 차이를 명확히 분리한다.

- 부모급여: 연령별 월 지급 및 어린이집 이용 시 지급 방식
- 아동수당: 정기 지급 대상과 계좌·지급 누락 확인
- 첫만남이용권: 출생아 대상 일회성 바우처와 사용처·기한

각 글에서 다른 제도의 지급액을 길게 반복하지 않고 비교표와 내부 링크만 배치한다.

### B. 교육급여·교육비 지원

두 글은 검색어와 본문 중복 가능성이 가장 높다.

- `education-benefit-application.html`은 교육급여의 신청과 지급 과정 중심
- `education-expense-support-difference.html`은 교육급여와 교육비 지원의 제도 비교·내 상황 판단 중심

같은 대상 기준과 신청기간을 양쪽에 반복하지 않고, 비교 글에서 상세 신청 글로 이동하도록 구성한다.

### C. 국가장학금·학자금대출

- 국가장학금 글은 무상지원 신청과 심사 흐름에 집중
- 학자금대출 글은 대출 실행 이후 상환·연체·중도상환 관리에 집중
- 등록금 마련이라는 공통 주제만으로 두 글을 섞지 않는다.

## 5. 파일별 수정 기준

### `parental-benefit-guide.html`

- 현재의 5초 결론, 신청기한, 어린이집 이용 분기 구조 유지
- 출생신고만으로 자동 지급된다고 오해할 수 있는 표현 금지
- 연도별 지급액과 신청기한은 공식 정책 확인일을 명시
- 첫만남이용권·아동수당과 차이를 짧은 비교표로 연결

### `child-allowance-application-guide.html`

- 대상 연령과 지급 종료 시점을 명확히 표시
- 신청자, 계좌, 해외체류·거주상태 등 지급 중단 가능 사유를 확인 순서로 배치
- 부모급여와 중복 가능 여부를 단정형 문구가 아닌 공식 확인 기준으로 안내

### `child-care-service-government-support.html`

- 정부지원 등급과 본인부담은 가구소득·서비스 유형에 따라 달라짐을 강조
- 시간제·영아종일제 등 서비스 유형을 실제 이용 상황 중심으로 비교
- 대기, 취소수수료, 이용시간 부족 같은 실제 문제 해결 섹션 강화

### `first-meeting-voucher-guide.html`

- 신청 완료와 지급카드 등록을 별개 단계로 구분
- 사용 가능 업종·제한 업종을 최신 공식 기준으로 검증
- 사용기한과 잔액 소멸 주의문구를 상단 행동 카드에 배치

### `education-benefit-application.html`

- 교육급여 수급자 선정과 교육활동지원비 지급을 분리 설명
- 학교 제출과 복지로·주민센터 신청 절차를 혼동하지 않도록 정리
- 교육비 지원 비교 글로 직접 연결

### `education-expense-support-difference.html`

- 대표 비교 글로 유지
- 교육급여, 방과후학교 자유수강권, 급식비, 고교학비, 인터넷통신비 등 지역·학교별 차이를 구분
- 표의 목적은 신청 가능성 판단으로 제한하고 상세 신청 절차는 개별 글로 이동

### `national-scholarship-application.html`

- 신청, 가구원 동의, 서류 제출, 학사·소득 심사, 대학 지급 순서 강화
- 유형별 지원액을 고정값처럼 반복하지 않고 한국장학재단 조회 중심으로 안내
- 학자금대출과 중복·우선순위 확인 링크 배치

### `student-loan-repayment-guide.html`

- 일반상환과 취업후상환의 차이를 상단에서 분리
- 상환계좌, 의무상환, 자발적상환, 중도상환, 연체 예방 순서로 구성
- 국가장학금 신청 글과 등록금 마련 흐름으로 연결

### `lifelong-education-voucher-guide.html`

- 아동·청소년 지원과 분리된 성인 재교육 제도임을 명확히 표시
- 선정 후 카드 발급, 사용기관 검색, 결제, 사용기한 확인 순서 유지
- 지역별·연도별 사업명 변경 가능성을 공식 공고 기준으로 안내

## 6. 내부 링크 설계

### 출생·영유아 사슬

`parental-benefit-guide.html`
→ 정기 아동 지원 확인: `child-allowance-application-guide.html`
→ 출생 일회성 바우처 확인: `first-meeting-voucher-guide.html`
→ 돌봄 공백 해결: `child-care-service-government-support.html`

`child-allowance-application-guide.html`
→ 영아기 부모급여 확인: `parental-benefit-guide.html`
→ 출생 바우처 확인: `first-meeting-voucher-guide.html`

`first-meeting-voucher-guide.html`
→ 매월 지급 지원 확인: `parental-benefit-guide.html`
→ 아동수당 확인: `child-allowance-application-guide.html`

### 초중고 교육지원 사슬

`education-expense-support-difference.html`
→ 교육급여 신청: `education-benefit-application.html`

`education-benefit-application.html`
→ 교육비 지원과 차이 확인: `education-expense-support-difference.html`

### 대학·성인교육 사슬

`national-scholarship-application.html`
→ 부족한 등록금 대출과 상환 확인: `student-loan-repayment-guide.html`

`student-loan-repayment-guide.html`
→ 장학금 신청 가능성 확인: `national-scholarship-application.html`

`lifelong-education-voucher-guide.html`
→ 대학 학비 지원과 혼동하지 않도록 국가장학금 글은 비교 링크로만 연결

## 7. 최종 판정

- 상위 신규 허브: 보류
- 독립 유지: 9개
- 통합: 0개
- 삭제: 0개
- 분석 완료 글: 9개

누적 분석 진행률: 78 / 177
남은 분석 대상: 99

## 8. 다음 분석 후보

다음 클러스터는 주거·임대차 지원 묶음으로 진행한다.

우선 검토 후보:

- 전세보증금 반환보증
- 임대차계약 갱신·해지
- 월세 세액공제
- 전입신고·확정일자
- 보증금 반환·분쟁 대응
- 주거급여·청년 주거지원

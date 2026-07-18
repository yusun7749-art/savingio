# REGRESSION

수정 후 다시 발생하면 안 되는 항목과 회귀 검사 결과를 기록합니다.

## V3.030 기존 글 전면 재생성 LOCK

- 기존 제목과 URL은 유지한다.
- 기존 HTML 본문을 부분 덧씌우기하지 않는다.
- 새 작업 문서에서 승인된 Savingio 기준틀로 전체 글을 다시 만든 뒤 기존 파일을 전면 교체한다.
- 긴 링크가 한 줄로 이어지는 문제 해결 경로를 생성하지 않는다.
- 카드 크기, 내부 여백, 카드 간격, 제목 줄 수와 모바일 1열 전환을 공통 기준으로 검사한다.
- 대표 이미지 파일과 OG/Twitter 이미지가 실제 같은 자산을 가리켜야 한다.
- 카테고리, 관련 글, 계산기, Brain, 검색 데이터 연결을 누락하지 않는다.
- canonical, robots, meta description, Article schema, FAQ schema를 검사한다.
- Publisher ID는 공식 단일 설정값 `pub-7605193583747751`을 유지한다.
- Production 화면을 확인하지 않은 글은 최종 PASS로 기록하지 않는다.

## 이번 회차 결과

- `car-aircon-fuel-saving.html`: 전면 교체 IMPLEMENTED, Production PENDING.
- `car-insurance-overpayment-refund.html`: 전면 교체 IMPLEMENTED, Production PENDING.
- `traffic-fines-difference-guide.html`: 오래된 중복 FAIL 기록 정정. 현재 main 파일의 요약 제목 1회 확인.
- 상세 근거: `factory/QA_V3_030.json`

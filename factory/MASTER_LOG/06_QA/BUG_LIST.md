# BUG LIST

현재 열려 있는 버그만 기록합니다.

## V3.030 전체 기존 글 재생성 QA

- 상태: OPEN / 순차 처리 중
- 범위: 공개 기존 글 전체
- 원칙: 기존 HTML 덧씌우기 금지. 제목·URL·핵심 주제만 추출한 뒤 승인된 Savingio 기준틀로 새 문서를 작성하고, QA 통과 후 기존 파일 내용을 같은 주소에서 전면 교체한다.
- 필수 검사: 약 5천자 수준의 충분한 정보, 목차, 표, 체크리스트, FAQ, 실제 이미지, 카테고리, 관련 글, 계산기, 내부링크, canonical·메타·Article/FAQ 구조화 데이터, Brain·검색 인덱스 연결, 카드 크기·여백·모바일 레이아웃.
- 금지: 긴 링크 일렬 나열, CSS·JS 덧씌우기만으로 완료 처리, 기존 부실 본문 유지.
- 현재 완료: `car-aircon-fuel-saving.html`, `car-insurance-overpayment-refund.html` 전면 재생성.
- Production 확인: Cloudflare 배포 후 PENDING.
- 근거: `factory/QA_V3_030.json`

## 정정된 기록

- `articles/traffic-fines-difference-guide.html`의 과거 MASTER LOG `3초 요약 4회 중복 FAIL`은 현재 main 실제 파일과 불일치한 오래된 기록이었다.
- 현재 파일 검사에서 `quick-summary-title` 블록이 1회인 상태를 확인했다.
- 판정: STALE FAIL 제거. 이후 전체 재생성 배치에서는 다른 글과 동일한 품질 기준으로 다시 처리한다.

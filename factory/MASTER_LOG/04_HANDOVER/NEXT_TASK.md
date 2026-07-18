# NEXT TASK

다음 대화에서 검증 없이 추측하지 않고 바로 이어갈 작업만 기록합니다.

## 현재 Savingio 시작점

1. Cloudflare Production에서 `car-aircon-fuel-saving.html`과 `car-insurance-overpayment-refund.html`의 새 완성본 반영 여부를 확인한다.
2. 제목·URL·대표 이미지·카테고리·관련 글·계산기·Brain·검색·SEO 구조와 카드 크기·여백·모바일 레이아웃을 육안 검증한다.
3. 검증 결과를 `factory/QA_V3_030.json`과 MASTER LOG에 기록한다.
4. 전체 공개 글을 우선순위 없이 현재 분류 순서대로 계속 처리한다.
5. 다음 회차에서 실제로 검수·작성·교체·QA할 수 있는 최대 수량을 한 배치로 진행한다.

## 고정 재생성 방식

- 기존 글에서 제목·URL·핵심 주제만 추출한다.
- 기존 HTML과 분리된 새 작업 문서에서 승인된 Savingio 기준틀로 본문 전체를 재생성한다.
- 약 5천자 수준의 충분한 정보, 목차, 표, 체크리스트, FAQ, 실제 이미지, 관련 글, 계산기, 내부링크, SEO를 적용한다.
- 긴 링크 일렬 나열은 금지하며 필요한 연결은 읽기 쉬운 카드로 직접 작성한다.
- 연결 프로그램·카테고리·Brain·검색 인덱스를 적용한다.
- QA 통과 후 기존 HTML 내용을 삭제하고 같은 파일명·같은 URL에 새 완성본을 저장한다.
- Production 화면을 직접 확인한 뒤 다음 글로 넘어간다.
- CSS·JS 덧씌우기만으로는 완료 처리하지 않는다.

## V3.030 실제 반영

- `articles/car-aircon-fuel-saving.html` 전면 재생성: commit `3ce42464cb22dad8d7bcbc7b187e2cc7edee5661`
- `articles/car-insurance-overpayment-refund.html` 전면 재생성: commit `de5963dff26f24988e293c1397b441e138a1d90b`
- 교통벌금 중복 FAIL 기록을 현재 main과 대조해 오래된 기록으로 정정했다.
- QA 근거: `factory/QA_V3_030.json`
- Production 검증은 아직 PENDING이며 확인 전 최종 PASS를 주장하지 않는다.

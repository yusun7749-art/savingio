# NEXT TASK

다음 대화에서 검증 없이 추측하지 않고 바로 이어갈 작업만 기록합니다.

## 현재 Savingio 시작점

1. Cloudflare Production에서 V3.030의 두 글과 V3.031 `car-insurance-child-discount.html` 반영 여부를 확인한다.
2. 제목·URL·대표 이미지·카테고리·관련 글·계산기·Brain·검색·SEO 구조와 카드 크기·여백·모바일 레이아웃을 육안 검증한다.
3. 현재 분류 순서를 유지해 다음 글을 전면 재생성한다.
4. 다음 대상은 `articles/car-insurance-mileage-refund.html`, `articles/car-tax-annual-payment.html`이다.
5. 각 글은 기존 제목·URL·핵심 주제만 추출하고 새 문서에서 기준틀로 재작성한 뒤 같은 주소에 전체 교체한다.

## 고정 재생성 방식

- CSS·JS 덧씌우기만으로 완료 처리하지 않는다.
- 약 5천자 수준 정보, 목차, 표, 체크리스트, FAQ, 실제 이미지, 관련 글, 계산기, 내부링크, SEO를 적용한다.
- 긴 링크 일렬 나열은 금지하고 연결은 읽기 쉬운 카드로 작성한다.
- 카테고리·Brain·검색 인덱스를 연결한다.
- QA 후 기존 HTML 전체를 같은 파일명과 URL의 새 완성본으로 교체한다.
- Production 확인 전 최종 PASS를 주장하지 않는다.

## V3.031 실제 반영

- `articles/car-insurance-child-discount.html` 전면 재생성
- 기존 URL과 canonical 유지
- 대표 이미지 `/images/articles/car-insurance-child-discount.svg` 유지
- 목차·비교표·단계·체크리스트·FAQ·관련 글·할인율 계산기 연결 적용
- 긴 문제 해결 링크 나열 제거
- 구현 커밋: `60834175545f1517ccba730a8600fac31112d476`
- QA 문서: `factory/QA_V3_031.json`
- Production 검증: PENDING

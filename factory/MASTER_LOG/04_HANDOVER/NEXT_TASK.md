# NEXT TASK

다음 대화에서 검증 없이 추측하지 않고 바로 이어갈 작업만 기록합니다.

## 현재 선택된 작업선 — Savingio Admin OS

1. `factory/MASTER_LOG/MASTER_LOG_ADMIN_OS_CURRENT.md`를 먼저 읽는다.
2. GitHub `main`의 `admin/os/workflow-engine.js`, `workflow-board.js`, `workflow-board.css`와 관리자 로딩 연결을 확인한다.
3. Cloudflare Production의 `/admin/`에서 자동화센터 → 워크플로 관리 화면을 실제 확인한다.
4. 샘플 프로젝트 표시, 진행률, 현재 단계 완료·인계, 승인 후 다음 단계, 일시 중지·재시작을 클릭 검증한다.
5. 새 프로젝트 생성 후 공통 워크플로 자동 생성 여부를 검증한다.
6. 실제 화면·버튼 검증 전에는 Workflow Engine을 최종 PASS 처리하지 않는다.
7. 검증 후 Phase 2-02: 산출물 ID, 담당 본부, 승인 이력, 실행 로그, 실패 원인, 재실행 지점을 공통 규격으로 연결한다.
8. 다음 Phase는 Project Engine이며 글·이미지·쇼츠·상품·SNS를 하나의 프로젝트 ID 아래 묶는다.

## 기존 콘텐츠 작업선 — 보류 유지

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

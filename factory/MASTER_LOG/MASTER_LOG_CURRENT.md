# MASTER LOG CURRENT

최종 갱신: 2026-07-17 22:40 KST

- 프로젝트: Savingio Factory
- 저장소: `yusun7749-art/savingio`
- 작업 브랜치: `main`
- 기준 코드 Git HEAD: `1069ddf V3.021 누수 3개 콘텐츠 완성본 교체`
- 현재 상태: V3.021 MERGED / PRODUCTION BROWSER VERIFICATION PENDING / NEXT BATCH BLOCKED
- PR: `#19 V3.021 누수 3개 콘텐츠 완성본 교체` squash merge 완료
- 누수 긴급 대응, 일배책 누수 보험, 수도 누수 자가진단 3개를 기존 짧은 글에 덧씌우지 않고 새 완성본으로 작성한 뒤 기존 URL 파일을 교체했다.
- 수정 파일:
  - `articles/apartment-leak-emergency-response.html`
  - `articles/daily-liability-leak-insurance.html`
  - `articles/home-water-leak-self-check.html`
- 로컬 가시 텍스트 검사:
  - 누수 긴급 대응: 약 5,121자
  - 일배책 누수 보험: 약 4,857자
  - 수도 누수 자가진단: 약 4,941자
- 세 글 모두 H1 1개, 실제 `<img>` 1개, `alt`, `og:image`, 검색 별칭, 사례, 체크리스트, FAQ, 공식 확인처, 관련 글 연결을 포함한다.
- 기존 CSS/이모지 제목 카드는 제거하고 실제 PNG 응답 URL을 사용하는 대표 이미지 태그로 교체했다.
- `home-water-leak-self-check.html`의 전기요금 계산기 오연결을 제거했다.
- 변경 범위 비교: main 대비 누수 3개 HTML만 변경, 다른 파일 변경 없음.
- 공식 Publisher ID: `pub-7605193583747751` (LOCK 유지)

## 현재 판정
- 콘텐츠 분량·구조·HTML 계약: PASS
- GitHub PR·main 병합: PASS
- `<img>`·`alt`·`og:image` 존재: PASS
- 전기요금 계산기 오연결 제거: PASS
- 저장소 내부 소유 WebP/PNG 바이너리 자산: 아직 미완료. 현재 대표 이미지는 외부 PNG 응답 URL이다.
- Cloudflare Production 실제 브라우저 확인: 미완료. 현재 실행 환경에서 `savingio.com` DNS 해석이 실패하여 직접 접속 검증하지 못했다.
- 다음 5개 배치: BLOCKED. 저장소 내부 이미지 자산 교체와 Production 육안 검증 완료 전에는 진행하지 않는다.

## 다음 대화 확인 순서
1. 이 파일을 먼저 읽는다.
2. 오늘 요약은 `MASTER_LOG_PART1.md`에서 확인한다.
3. 시간대별 상세는 `MASTER_LOG_PART1-1.md`에서 확인한다.
4. 실제 수정 파일은 `MASTER_LOG_PART2.md`에서 확인한다.
5. 테스트 결과는 `MASTER_LOG_PART3.md`에서 확인한다.

## 다음 시작 위치 — 반드시 이 순서로 진행
1. main `1069ddf`와 PR #19 병합 상태를 확인한다.
2. 누수 3개 Production URL에서 새 약 5,000자 본문, 왼쪽 카테고리, 검색, 실제 이미지 표시, 모바일/가로 넘침을 브라우저로 확인한다.
3. 외부 PNG 응답 URL을 저장소 내부의 실제 WebP/PNG 자산으로 교체하고 `<img>`, `og:image`, Twitter 이미지가 같은 내부 절대 URL을 사용하게 한다.
4. 세 글의 공식 링크와 관련 글 링크를 Production에서 클릭 검증한다.
5. 세 글이 전부 PASS한 뒤에만 다음 5개로 진행한다. 안정화 후 20개→50개로 확대한다.

# V3.016 — 전체 글 리모델링 1차(20개) 적용

- 실제 공개 글 208개를 20개 단위로 검수하며 리모델링하기로 확정했다.
- 1차 20개는 관리비 → 장기수선충당금 → 누수 → 일배책 → 수도·공과금 → 전월세·주택세금 흐름으로 묶었다.
- 20개 전부에 공통 리모델링 CSS, 제목 기반 주제 썸네일, 사람이 다음에 찾는 연관 행동 경로를 적용했다.
- `장기충당금`, `아랫집에서 누수 연락`, `일배책으로 누수 보험 처리`처럼 실제 사용자 표현을 연결 제목에 포함했다.
- 리디렉션 호환 문서 14개는 공개 글/리모델링 대상에서 제외한다.
- 1차 전용 계약 검사와 기존 검색·레이아웃·Factory 검사를 통과한 뒤 배포한다.

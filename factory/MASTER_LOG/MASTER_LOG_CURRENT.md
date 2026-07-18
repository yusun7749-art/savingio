# MASTER LOG CURRENT

최종 갱신: 2026-07-18 11:12 KST

- 프로젝트: Savingio Factory
- 저장소: `yusun7749-art/savingio`
- 작업 브랜치: `main`
- 기준 코드 Git HEAD: `d4e76c4 V3.022 누수 글 2개 재작성 및 레이아웃 DNA 복구`
- 현재 상태: V3.022 MAIN UPDATED / REPOSITORY QA PASS / PRODUCTION BROWSER VERIFICATION PENDING / NEXT BATCH BLOCKED
- 이전 PR: `#19 V3.021 누수 3개 콘텐츠 완성본 교체` squash merge 완료
- 이후 main 직접 보정:
  - 누수 3개 대표 SVG를 저장소 내부 주제별 일러스트로 교체
  - `daily-liability-leak-insurance.html` 전면 재작성 및 Article DNA 복구
  - `home-water-leak-self-check.html` 전면 재작성 및 Article DNA 복구
  - OG/Twitter 이미지와 본문 `<img>`를 같은 저장소 내부 SVG 절대 URL로 통일
  - 누수 2개 글에 `article-layout-dna.css`, `savingio-article-dna`, Article JSON-LD 적용
- 수정 파일:
  - `articles/apartment-leak-emergency-response.html`
  - `articles/daily-liability-leak-insurance.html`
  - `articles/home-water-leak-self-check.html`
  - `images/articles/apartment-leak-emergency-response.svg`
  - `images/articles/daily-liability-leak-insurance.svg`
  - `images/articles/home-water-leak-self-check.svg`
- 확인된 GitHub 커밋:
  - `2f7f705` 누수 긴급 대응 SVG 교체
  - `131a467` 일배책 누수 SVG 교체
  - `99e12ad` 누수 자가진단 SVG 교체
  - `5cefdcf` 일배책 글 전면 재작성
  - `d4e76c4` 누수 자가진단 글 전면 재작성
- 공식 Publisher ID: `pub-7605193583747751` (LOCK 유지)

## 현재 판정
- GitHub main 반영: PASS
- 저장소 내부 대표 이미지 자산 3개 존재: PASS
- 대표 이미지 `<img>`·`alt`·`og:image`·Twitter 이미지 연결: PASS
- 일배책/자가진단 Article DNA·고정 본문 폭 복구: PASS
- 누수 자가진단 전기요금 계산기 오연결 제거: PASS
- Production 브라우저 육안 확인: PENDING
- Production 검색·왼쪽 카테고리·실제 이미지 렌더링·모바일 가로 넘침·공식/관련 링크 클릭 검증: PENDING
- 다음 5개 배치: BLOCKED. 위 Production 검증 전에는 시작하지 않는다.

## 다음 대화 확인 순서
1. 이 파일을 먼저 읽는다.
2. 오늘 요약은 `MASTER_LOG_PART1.md`에서 확인한다.
3. 시간대별 상세는 `MASTER_LOG_PART1-1.md`에서 확인한다.
4. 실제 수정 파일은 `MASTER_LOG_PART2.md`에서 확인한다.
5. 테스트 결과는 `MASTER_LOG_PART3.md`에서 확인한다.

## 다음 시작 위치 — 반드시 이 순서로 진행
1. main 최신 HEAD와 위 5개 직접 보정 커밋 반영 상태를 확인한다.
2. 누수 3개 Production URL에서 약 5,000자 본문, 왼쪽 카테고리, 검색, 실제 이미지 표시, 모바일/가로 넘침을 브라우저로 확인한다.
3. `<img>`, `og:image`, Twitter 이미지가 동일한 저장소 내부 SVG URL을 실제 Production에서 로드하는지 확인한다.
4. 세 글의 공식 링크와 관련 글 링크를 Production에서 클릭 검증한다.
5. 세 글이 전부 PASS한 뒤에만 다음 5개로 진행한다.

# V3.016 — 전체 글 리모델링 1차(20개) 적용

- 실제 공개 글 208개를 20개 단위로 검수하며 리모델링하기로 확정했다.
- 1차 20개는 관리비 → 장기수선충당금 → 누수 → 일배책 → 수도·공과금 → 전월세·주택세금 흐름으로 묶었다.
- 20개 전부에 공통 리모델링 CSS, 제목 기반 주제 썸네일, 사람이 다음에 찾는 연관 행동 경로를 적용했다.
- `장기충당금`, `아랫집에서 누수 연락`, `일배책으로 누수 보험 처리`처럼 실제 사용자 표현을 연결 제목에 포함했다.
- 리디렉션 호환 문서 14개는 공개 글/리모델링 대상에서 제외한다.
- 1차 전용 계약 검사와 기존 검색·레이아웃·Factory 검사를 통과한 뒤 배포한다.
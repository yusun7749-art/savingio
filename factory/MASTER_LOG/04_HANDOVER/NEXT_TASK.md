# NEXT TASK

다음 대화에서 검증 없이 추측하지 않고 바로 이어갈 작업만 기록합니다.

## 고정 작업표

- 관리자 OS 작업 시작 전 `factory/MASTER_LOG/SAVINGIO_OS_WORKBOARD.md`를 반드시 읽는다.
- 완료 항목은 삭제하지 않고 `[x]`로 유지한다.
- 진행 중 항목은 `[~]`, 보류는 `[-]`, 수정 필요는 `[!]`로 표시한다.
- 새 요청은 기존 진행선을 지우지 않고 작업표 아래에 추가한다.
- 다른 요청을 마친 뒤 마지막 `[~]` 항목으로 복귀한다.

## 현재 최우선 작업선 — AdSense 저가치 콘텐츠 해결

1. [x] 공식 글쓰기 헌법을 Ultimate Page 기준으로 개정한다.
2. [x] Admin HQ 화면에 전체 글·수정·통합·삭제·현재 글·301·진행률을 표시한다.
3. [~] 전체 공개 글을 검색 의도 기준으로 전수 분석한다.
4. [ ] 중복 클러스터와 얇은 콘텐츠를 분류한다.
5. [ ] 첫 Ultimate 대표글 주제와 흡수·삭제 후보를 확정한다.
6. [ ] 기존 문장 재사용 없이 대표글을 빈 문서에서 완전 재작성한다.
7. [ ] QA 후 흡수 페이지 삭제·301·sitemap·canonical·내부 링크를 정리한다.
8. [ ] 작업 결과마다 `admin/content-recovery-progress.json` 수치를 실제 완료 기준으로 갱신한다.
9. [ ] Cloudflare Production의 `/admin/`에서 카드와 모바일 표시를 실제 확인한다.

## V3.038 실제 반영

- `admin/content-recovery-dashboard.js` 생성
- `admin/content-recovery-dashboard.css` 생성
- `admin/content-recovery-progress.json` 생성
- `admin/admin-data.js`에서 대시보드 자산 자동 로드
- 전체 글 수는 `/data/savingio-search-index.json`의 현재 `count`를 읽어 자동 표시
- 초기 상태는 전체 207개, 수정 0개, 통합 0개, 삭제 0개, 현재 207개, 301 0개로 계산
- 진행 수치는 계획이 아니라 실제 완료 작업만 기록한다.

## 기존 관리자 OS 작업선 — 보류 유지

1. `factory/MASTER_LOG/MASTER_LOG_ADMIN_OS_CURRENT.md`를 읽는다.
2. `factory/MASTER_LOG/SAVINGIO_OS_WORKBOARD.md`에서 현재 위치를 확인한다.
3. 기존 진행 위치는 `Phase 2-03 Workflow 실제 관리자 화면 검증`이다.
4. AdSense 콘텐츠 복구 우선 작업이 끝나기 전 임의 확장하지 않는다.

## 고정 재생성 방식

- CSS·JS 덧씌우기만으로 글 완료 처리하지 않는다.
- 글자 수가 아니라 동일 검색 의도를 한 페이지에서 완전히 해결하는지를 기준으로 한다.
- 기존 대표글을 부분 수정하거나 기존 문장을 이어 붙이지 않는다.
- 관련 글 정보를 조사한 뒤 빈 문서에서 Ultimate Page를 새로 작성한다.
- 긴 링크 일렬 나열은 금지하고 연결은 읽기 쉬운 카드로 작성한다.
- 카테고리·Brain·검색 인덱스를 연결한다.
- QA 후 기존 HTML 전체를 같은 파일명과 URL의 새 완성본으로 교체한다.
- Production 확인 전 최종 PASS를 주장하지 않는다.

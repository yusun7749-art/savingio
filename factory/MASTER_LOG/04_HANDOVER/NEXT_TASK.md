# NEXT TASK

다음 대화에서 검증 없이 추측하지 않고 바로 이어갈 작업만 기록합니다.

## 고정 작업표

- 작업 시작 전 `factory/MASTER_LOG/SAVINGIO_WRITING_CONSTITUTION.md`를 반드시 읽는다.
- 관리자 OS 작업 시작 전 `factory/MASTER_LOG/SAVINGIO_OS_WORKBOARD.md`를 반드시 읽는다.
- 완료 항목은 삭제하지 않고 `[x]`로 유지한다.
- 진행 중 항목은 `[~]`, 보류는 `[-]`, 수정 필요는 `[!]`로 표시한다.
- 새 요청은 기존 진행선을 지우지 않고 작업표 아래에 추가한다.
- 다른 요청을 마친 뒤 마지막 `[~]` 항목으로 복귀한다.

## 현재 최우선 작업선 — AdSense 저가치 콘텐츠 해결

1. `[x]` 공식 Ultimate Page 글쓰기 헌법 생성 및 부팅 순서 연결
2. `[~]` Savingio 전체 공개 글의 검색 의도·중복·얇은 콘텐츠 전수 분석
3. `[ ]` 첫 검색 의도 클러스터 선정
4. `[ ]` 클러스터 내부 관련 글을 제목이 아니라 본문과 사용자 목적 기준으로 전수 조사
5. `[ ]` 유지할 대표 URL과 흡수·삭제·301 후보 확정
6. `[ ]` 기존 문장을 재사용하지 않고 대표글을 빈 문서에서 완전 재작성
7. `[ ]` 3분할·Explorer·오른쪽 5카드·표·체크리스트·사례·FAQ·공식기관·계산기·SEO QA
8. `[ ]` 대표글 배포 검증 후 흡수 대상 URL 삭제와 301 적용
9. `[ ]` sitemap·canonical·내부 링크·Search Console 제출 대상 정리
10. `[ ]` 다음 검색 의도 클러스터로 이동

## 공식 판단 기준

- 글 개수는 목표가 아니다.
- 대표글이 단 1개만 남더라도 그 한 페이지에서 필요한 정보가 모두 해결되어야 한다.
- 같은 검색 의도는 하나의 Ultimate Page로 끝낸다.
- 대표글을 부분 수정하거나 문단을 이어 붙이지 않는다.
- 관련 글의 정보만 추출하고 최종 본문은 처음부터 새로 작성한다.
- 새로운 검색 의도가 실제로 필요할 때만 새 글을 만든다.
- 5,000자 달성만으로 완료 처리하지 않는다.
- 같은 주제로 다시 검색할 질문이 남아 있으면 미완성이다.
- Production 확인 전 최종 PASS를 주장하지 않는다.

## 기존 Admin OS 작업선 — 보류 유지

1. `factory/MASTER_LOG/MASTER_LOG_ADMIN_OS_CURRENT.md`를 읽는다.
2. `factory/MASTER_LOG/SAVINGIO_OS_WORKBOARD.md`에서 현재 위치를 확인한다.
3. 마지막 기록 위치는 `Phase 2-03 Workflow 실제 관리자 화면 검증`이다.
4. 애드센스 저가치 콘텐츠 해결의 우선 작업이 끝나거나 사용자가 명시적으로 복귀를 지시하면 재개한다.

## 기존 개별 글 작업선 — 통합 감사에 포함

- `articles/car-insurance-mileage-refund.html`
- `articles/car-tax-annual-payment.html`

위 파일을 단독으로 바로 재작성하지 않는다.

먼저 같은 검색 의도에 속한 모든 관련 글을 수집하고 대표 URL·흡수·삭제·301 계획을 확정한 뒤 Ultimate Page 방식으로 진행한다.

## V3.032 실제 반영

- `factory/MASTER_LOG/SAVINGIO_WRITING_CONSTITUTION.md` 신규 생성
- 글 수가 아니라 한 페이지의 완결성을 최상위 품질 기준으로 LOCK
- 제목이 아닌 검색 의도 기반 통합 원칙 LOCK
- 대표글 부분 수정 금지 및 완전 신규 작성 원칙 LOCK
- 대표글 완성 후 삭제·301·sitemap·canonical·Search Console 정리 순서 LOCK
- 구현 커밋: `008421827dd2d54b37513b068b6995a365a019ec`
- README 부팅 순서 반영 커밋: `9d755c04605da50963293d285b62bccad50ce40b`
- Production 영향: 문서·운영 규칙 변경만 수행되어 공개 사이트 콘텐츠 변경 없음

# Savingio Factory V2.025

## 운영본부 명령

```bash
python factory/run.py full-run "전기요금 절약"
python factory/run.py operation-board
python factory/run.py message-bus
python factory/run.py department-tasks
```

## V2.025

- 부서 간 Message Bus
- Task Dispatcher
- QA 실패 자동 재작업 배정
- Department Event Log
- Workflow State Manager
- Central Operation Board
- Final Approval Checklist
- Full Automation 통합

UI / Navigation / Explorer / Layout / Home은 LOCK 상태입니다.


## V2.026 조사본부

```bash
python factory/run.py research-run "전기요금 절약"
python factory/run.py research-run "전기요금 절약" --evidence factory/input/evidence.json
python factory/run.py full-run "전기요금 절약" --evidence factory/input/evidence.json
```

추가 기능:
- 공식 출처 레지스트리와 주제별 자동 매칭
- 공식기관 검색 쿼리 계획
- 다중 evidence JSON 입력
- 근거 정규화·중복 제거·신뢰도·최신성 검사
- 조사 QA
- 작가본부 전달용 조사보고서


## V2.028 실제 커넥터

```bash
python factory/run.py web-research "전기요금 절약" https://home.kepco.co.kr/
python factory/run.py image-queue
python factory/run.py deployment-gate
```

- 허용된 공식 도메인만 HTTP 요청합니다.
- 응답 크기, 타임아웃, 캐시를 적용합니다.
- OpenAPI는 정확한 서비스 URL과 API 키 환경변수가 있을 때만 호출합니다.
- 이미지 큐는 실제 상태 전이를 수행하지만, 이미지 자체 생성은 외부 생성 도구/API 연결 전까지 완료로 표시하지 않습니다.
- 배포 게이트는 QA, 조사, 이미지, 사용자 승인 조건을 모두 확인합니다.


## V2.029 실행

```bash
python factory/run.py search-to-evidence factory/input/search_results.json
python factory/run.py merge-evidence factory/input/evidence1.json factory/input/evidence2.json
python factory/run.py register-images article-slug hero.webp infographic.webp --roles hero infographic
python factory/run.py publish-execute articles/example.html --message "Factory publish" --push
```

`publish-execute`는 기본적으로 dry-run입니다. 실제 실행은 `--execute`를 명시해야 하며, 배포 게이트를 통과하지 못하면 차단됩니다.


## V2.031 승인 후 배포

```bash
python factory/run.py write-env-template
python factory/run.py release-coordinate articles/example.html --message "Factory release"
python factory/run.py release-coordinate articles/example.html --message "Factory release" --execute
```

기본은 dry-run입니다. 실제 Git commit/push와 Cloudflare 검증은 `--execute`가 있어야 실행됩니다.
`main` 브랜치와 `origin` 원격 저장소를 확인하며 `git add .`는 사용하지 않습니다.


## V2.032 실행

```bash
python factory/run.py wordpress-release --category 생활정보 --tag 절약
python factory/run.py wordpress-release --category 생활정보 --tag 절약 --execute
python factory/run.py site-health https://savingio.com
python factory/run.py openapi-services
python factory/run.py openapi-run data-go-kr-generic --params "{"pageNo":1}"
python factory/run.py image-provider-result <JOB_ID> <SLUG> hero.webp infographic.webp --roles hero infographic
```


## V2.033 분석본부

```bash
python factory/run.py analytics-readiness
python factory/run.py search-console-import factory/input/search-console.json
python factory/run.py ga4-import factory/input/ga4.json
python factory/run.py analytics-dashboard
python factory/run.py analytics-optimize
```


## V2.034 실제 분석 API 단계

```bash
python factory/run.py google-auth-readiness
python factory/run.py search-console-api
python factory/run.py search-console-api --execute
python factory/run.py ga4-api
python factory/run.py ga4-api --execute
python factory/run.py analytics-daily
python factory/run.py keyword-rankings
python factory/run.py analytics-dispatch
```

기본은 dry-run 또는 로컬 데이터 처리입니다. 실제 API 호출은 `--execute`와 환경변수가 필요합니다.


## V2.035 자동 토큰·자동 수정·스케줄

```bash
python factory/run.py google-token "https://www.googleapis.com/auth/webmasters.readonly"
python factory/run.py analytics-apply
python factory/run.py analytics-apply --execute
python factory/run.py scheduler-files
```


## V2.037-A Revenue AI Core

```bash
python factory/run.py revenue-import factory/input/revenue.csv
python factory/run.py revenue-dashboard
python factory/run.py revenue-analyze
python factory/run.py revenue-route
python factory/run.py revenue-core --input factory/input/revenue.csv --route-tasks
```


## V2.037-B Revenue Rework

```bash
python factory/run.py revenue-rework
python factory/run.py revenue-rework --execute
```

기본은 Dry-run입니다. `--execute`에서만 백업 후 HTML을 수정하고 QA를 다시 실행합니다. QA 실패 시 원본으로 자동 복구합니다.


## V2.037-C 승인 후 재배포

```bash
python factory/run.py approved-release-gate articles/example.html
python factory/run.py approved-republish articles/example.html --message "Revenue rework release"
python factory/run.py approved-republish articles/example.html --message "Revenue rework release" --execute
python factory/run.py release-journal-verify
```

기본은 Dry-run입니다. 실제 실행은 사용자 승인, 재작업 QA 통과, 배포 게이트 통과 후 `--execute`에서만 진행됩니다.


## V2.038 외부 연동 통제센터

```bash
python factory/run.py integration-preflight
python factory/run.py live-verification-plan
python factory/run.py adsense-report-import factory/input/adsense.csv
python factory/run.py adsense-revenue-bridge
python factory/run.py production-readiness
```

환경변수 값은 출력하지 않으며 설정 여부·길이·식별용 지문만 기록합니다.


## V2.039 운영 모니터링 센터

```bash
python factory/run.py operations-center
python factory/run.py operations-snapshot
python factory/run.py incident-detect
python factory/run.py recovery-plan
python factory/run.py retry-policy timeout 1
```


## V2.040 외부 연동 검증센터

```bash
python factory/run.py credential-checklist
python factory/run.py write-production-env-template
python factory/run.py connector-verification
python factory/run.py connector-verification --execute
python factory/run.py connector-history-verify
python factory/run.py production-activation-gate
python factory/run.py external-verification-center
```

실제 외부 호출은 `--execute`에서만 진행됩니다. 자격증명 원문은 보고서에 저장하지 않습니다.


## V2.041 Calculator HQ

```bash
python factory/run.py calculator-intent "연봉 실수령액"
python factory/run.py calculator-registry
python factory/run.py calculator-qa
python factory/run.py calculator-hq "전기요금 계산" electricity-guide
python factory/run.py calculator-hq "전기요금 계산" electricity-guide --html articles/electricity-guide.html --execute
python factory/run.py calculator-analytics
```

계산기는 독립 도구가 아니라 글을 완성하는 해결 패키지로만 생성·연결됩니다.

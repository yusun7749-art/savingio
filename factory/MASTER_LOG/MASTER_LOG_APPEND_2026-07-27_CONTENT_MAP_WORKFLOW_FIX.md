# MASTER LOG APPEND — 2026-07-27 CONTENT MAP WORKFLOW FIX

## 사용자 명령
- GitHub 권한을 추측하지 말고 실제로 꼼꼼히 확인한다.
- MASTER LOG 전체를 확인한 뒤 Savingio MASTER CONTENT MAP 작업을 계속 진행한다.
- 애드센스 재승인을 최우선으로 한다.

## 실제 권한 확인
- 인증 사용자: `yusun7749-art`
- 저장소: `yusun7749-art/savingio`
- 기본 브랜치: `main`
- 확인 권한: `admin=true`, `maintain=true`, `pull=true`, `push=true`, `triage=true`
- 판정: GitHub 관리자 수준 읽기·쓰기·푸시 가능

## 실제 확인 문서
- `factory/MASTER_LOG/MASTER_LOG_CURRENT.md`
- `factory/MASTER_LOG/MASTER_LOG_PART1.md`
- `factory/MASTER_LOG/MASTER_LOG_PART1-1.md`
- `factory/MASTER_LOG/MASTER_LOG_PART2.md`
- `factory/MASTER_LOG/MASTER_LOG_PART3.md`
- `factory/MASTER_LOG/MASTER_LOG_APPEND_2026-07-27_CONTENT_MAP.md`

## 현재 콘텐츠 맵 상태
- 운영 글 180개 및 sitemap 180개 일치 기록 확인
- body-first 유사도 분석은 공통 템플릿 때문에 서로 다른 주제를 거대한 그룹으로 묶는 오탐 발생
- topic-first 방식으로 전환한 엔진 `factory/audit/content_cluster_audit.py`가 main에 반영되어 있음
- 그러나 `factory/reports/content-cluster-audit.md`는 여전히 구형 결과(180개, 353 pair, 2 groups)를 표시

## 발견한 실제 원인
- topic-first 엔진 결과 키: `topic_group_count`
- Workflow가 이전 키 `cluster_count`를 참조
- 이 키 불일치로 새 보고서 생성 단계가 실패하여 구형 보고서가 남아 있었음

## 실제 수정
- 수정 파일: `.github/workflows/content-cluster-audit.yml`
- 변경 내용:
  - `cluster_count` → `topic_group_count`
  - topic-first 작업명과 출력값으로 정리
  - standalone article 수 출력 추가
  - 생성 커밋 메시지를 topic-first MASTER CONTENT MAP 기준으로 변경
- 수정 커밋: `8c21c90539766af6c2c656bc5183a5af5e6ac0ee`

## 검증 상태
- GitHub 파일 수정 및 main 커밋 생성: PASS
- 수정 직후 Workflow 실행 조회: 아직 run 미표시
- topic-first 새 보고서 자동 생성: PENDING
- 180개 대주제→중주제→소주제 완성: PENDING
- 대표글/흡수글/유지글/삭제글 판정: PENDING

## 다음 즉시 실행 작업
1. 커밋 `8c21c905`에 연결된 GitHub Actions 실행을 확인한다.
2. 새 `factory/reports/content-cluster-audit.md/json`이 생성됐는지 확인한다.
3. 새 보고서의 180개 글 분류 누락 및 `기타 독립 주제` 과다 여부를 검사한다.
4. Domain Dictionary를 보강해 대주제→중주제→소주제 MASTER CONTENT MAP을 완성한다.
5. 전체 MAP 검증 후 대표글/흡수글/독립 유지/삭제 및 redirect 후보를 작성한다.
6. 애드센스 재승인에 필요한 중복 콘텐츠 정리, sitemap, 내부 링크, Explorer, canonical 정비로 이어간다.

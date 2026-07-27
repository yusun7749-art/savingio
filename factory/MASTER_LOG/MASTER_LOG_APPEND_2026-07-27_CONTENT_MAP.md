# MASTER LOG APPEND — 2026-07-27

## 작업명

Savingio 전체 콘텐츠 군집화 실패 분석 및 MASTER CONTENT MAP 방식 전환

## KST 시각

- 2026-07-27

## 사용자 명령

- Savingio 전체 글을 하나씩 처리하지 말고 사이트 전체를 먼저 스캔한다.
- 전체 글의 유사 주제를 그룹화한다.
- 각 그룹별로 통합, 삭제, 유지 대상을 결정한다.
- 사용자는 최종 승인만 하고 실제 분석·분류·통합 작업은 리나가 수행한다.
- 말로만 계획하지 말고 실제 GitHub 작업을 진행한다.

## 이번 회차 이전에 실제 확인된 상태

- 운영 글 수: 180개
- sitemap 글 URL 수: 180개
- 누락 URL: 0개
- 기존 중복 통합 사례 일부는 이미 검증 완료했다.
- 신용점수 중복 글 `credit-score-management.html`은 제거되고 redirect 및 sitemap 수정이 반영된 상태로 확인된 이력이 있다.

## 실제 구현 및 확인된 커밋

### 1. 기존 유사도 감사 엔진 추가

- 파일: `factory/audit/content_cluster_audit.py`
- 커밋: `8e4a2d40152d952996438aa6a8a4d9ab9597849a`
- 기능:
  - 전체 HTML 수집
  - title, H1, body 추출
  - 콘텐츠 유사도 계산
  - JSON 및 Markdown 보고서 생성

생성 대상 보고서:

- `factory/reports/content-cluster-audit.json`
- `factory/reports/content-cluster-audit.md`

### 2. GitHub Actions 감사 Workflow 추가

- 파일: `.github/workflows/content-cluster-audit.yml`
- 커밋: `52a1e88164a7d7d6c830ec1791dd3afdea7a98a2`
- 기능:
  - 콘텐츠 감사 실행
  - 보고서 존재 검증
  - 결과 보고서 자동 커밋

### 3. Workflow 수정 및 재실행

- 커밋: `f493fb8f2077d8859f51e2a0d71b8c85733daf39`
- 메시지: `Fix and rerun full content clustering audit`

이후 Actions 자동 생성 커밋:

- 커밋: `f115099932eb453f0b18354f9f46811993fe5831`
- 메시지: `Generate full content similarity clusters [skip ci]`

## 실제 보고서 결과

`factory/reports/content-cluster-audit.md`에서 다음을 확인했다.

- 전체 글: 180개
- 후보 pair: 353개
- 생성 그룹: 2개

하지만 하나의 거대한 그룹에 서로 다른 주제의 글 28개가 묶였다.

예:

- 전기요금
- 청년지원
- 부가세
- 소상공인 정책자금
- 기타 서로 다른 생활정보 글

즉, 기존 엔진은 공통 HTML 구조, 템플릿 문구, 공통 본문 요소의 영향을 크게 받아 실제 주제가 다른 글까지 유사하다고 판단했다.

## 실패 원인

기존 방식:

```text
180개 글
→ 본문 전체 유사도 계산
→ 연결된 글을 하나의 그룹으로 생성
```

문제:

- 공통 Header, Footer, Navigation, FAQ, 관련 글, 공통 문구가 본문 유사도를 높였다.
- 서로 다른 분야라도 Savingio 공통 템플릿이 같으면 동일 그룹에 연결됐다.
- 연결형 군집 방식 때문에 약한 오탐 하나가 여러 글을 연쇄적으로 하나의 큰 그룹으로 합쳤다.
- 이 상태로 통합 작업을 진행하면 서로 다른 검색 의도의 글을 잘못 삭제하거나 합칠 위험이 있다.

## 확정 결정

본문 유사도를 전체 글에 바로 적용하는 방식은 폐기한다.

신규 방식:

```text
180개 전체 글
→ 대주제 Domain 분류
→ 중주제 분류
→ 소주제 분류
→ 동일 소주제 안에서만 유사도 비교
→ 대표글 / 통합 / 유지 / 삭제 결정
```

## MASTER CONTENT MAP 목표

Savingio 전체 글이 반드시 하나의 명확한 위치를 갖도록 한다.

예시 구조:

```text
자동차
 ├─ 자동차보험
 │   ├─ 보험료 절약
 │   ├─ 마일리지
 │   ├─ 자녀 할인
 │   ├─ 과납 환급
 │   └─ 사고 처리
 ├─ 자동차세
 ├─ 연료비
 └─ 정비

보험
 ├─ 실손보험
 ├─ 건강보험
 ├─ 생명보험
 ├─ 보험료
 └─ 보험금·환급

세금
 ├─ 재산세
 ├─ 지방세
 ├─ 부가세
 ├─ 종합소득세
 └─ 사업자 세금

금융
 ├─ 신용
 │   ├─ 신용점수
 │   ├─ 신용조회
 │   ├─ 연체
 │   └─ 신용회복
 ├─ 카드
 ├─ 대출
 ├─ 예금
 └─ 적금

정부지원
 ├─ 청년
 ├─ 소상공인
 ├─ 사업자
 ├─ 복지
 └─ 지원금

생활비 절약
 ├─ 전기요금
 ├─ 수도요금
 ├─ 가스요금
 ├─ 관리비
 ├─ 통신비
 └─ 구독료

건강
 ├─ 건강보험
 ├─ 병원비
 ├─ 환급
 └─ 검진

부동산
 ├─ 임대차
 ├─ 관리비
 ├─ 주택세금
 └─ 계약

사업자
 ├─ 비용처리
 ├─ 부가세
 ├─ 정책자금
 └─ 운영비
```

## 그룹별 최종 판정 형식

각 소주제 그룹은 아래 형식으로 확정한다.

```text
GROUP 001
대주제: 금융
중주제: 신용
소주제: 신용점수

대표글:
- 유지 및 확장할 URL

통합 대상:
- 대표글로 내용을 흡수할 URL

독립 유지:
- 검색 의도가 달라 별도 유지할 URL

삭제 및 Redirect:
- 삭제할 URL
- 연결할 대표 URL
```

## 실제 통합 시 필수 작업

1. 대표글 본문 확장 및 내용 흡수
2. 중복 URL 파일 삭제
3. 301 redirect 등록
4. sitemap 수정
5. 내부 링크 전체 교체
6. Explorer 및 카테고리 연결 수정
7. canonical 확인
8. 실제 운영 URL 확인
9. 데스크톱 및 좁은 화면 확인
10. 완료 후 MASTER LOG 즉시 기록

## 절대 운영 원칙

- 사용자가 직접 180개 글을 분류하지 않는다.
- 실제 분석, 분류, 대표글 선정, 통합안 작성은 리나가 수행한다.
- 사용자는 최종 승인만 한다.
- 전체 MAP이 완성되기 전에는 임의로 개별 글을 대량 삭제하거나 통합하지 않는다.
- 서로 다른 검색 의도의 글은 제목이나 일부 단어가 비슷하다는 이유만으로 합치지 않는다.
- 실제 GitHub 파일 및 보고서를 확인하지 않은 상태에서 PASS를 선언하지 않는다.
- 실행하지 않은 작업을 완료했다고 기록하지 않는다.
- GitHub Connector 사용 가능 여부를 추측하지 않고 실제 도구 조회와 실행을 먼저 한다.

## topic-first 엔진 전환

기존 `factory/audit/content_cluster_audit.py`를 topic-first 방식으로 재설계했다.

- 커밋: `2f4acc8906586a44ff59ed634b0601114a808719`
- 메시지: `Rebuild content audit as topic-first grouping`

변경 방향:

- title, H1, slug를 우선 사용해 주제 후보를 만든다.
- body 비교는 동일 주제 후보 그룹 안에서만 수행한다.
- 공통 템플릿으로 인한 전체 사이트 오탐을 줄인다.

이후 저장소 활동에서 다음 커밋이 확인됐다.

- 커밋: `f066e9139d56b05475a4f5e75490091508888681`
- 메시지: `Audit: refresh reports and Explorer exclusions [skip ci]`

단, 이 커밋의 보고서가 새 topic-first 알고리즘 결과인지 아직 실제 파일 내용으로 재검증하지 않았다.

## 현재 정확한 상태

- 기존 body-first 감사 엔진 실패 원인 확인: 완료
- MASTER CONTENT MAP 방식 전환 결정: 완료
- topic-first 엔진 코드 변경: GitHub 반영 확인
- 새 보고서 실제 결과 검증: 미완료
- 180개 전체 대·중·소주제 MAP 완성: 미완료
- 대표글 / 통합 / 유지 / 삭제 최종안: 미완료
- 실제 URL 통합 작업: 시작 전

## 다음 즉시 실행 작업

1. `factory/reports/content-cluster-audit.md`를 GitHub `main`에서 다시 조회한다.
2. 새 보고서가 topic-first 엔진으로 생성됐는지 확인한다.
3. 여전히 `2 groups` 또는 거대한 혼합 그룹이 나오면 성공으로 처리하지 않는다.
4. title, H1, slug 기반 Domain Dictionary를 보강한다.
5. 180개 전체 글을 대주제 → 중주제 → 소주제로 배치한 MASTER CONTENT MAP 보고서를 생성한다.
6. 각 그룹별 대표글 / 통합 / 독립 유지 / 삭제 후보를 작성한다.
7. 전체 MAP 검증이 끝난 후 그룹 단위 실제 통합을 시작한다.

## 재시작 문구

`Savingio 작업 이어서 시작. MASTER_LOG_APPEND_2026-07-27_CONTENT_MAP 확인 후 factory/reports/content-cluster-audit.md의 topic-first 결과부터 실제 검증해.`

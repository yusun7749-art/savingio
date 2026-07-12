# Savingio Article DNA V2.2 — 승인 전 최종 성형틀

## 범위
이 단계에서는 기존 글 전체를 수정하지 않는다. 공통 틀·입력 계약·생성기·QA만 완성한다.

## 고정 레이어
1. Hero: 사용자가 들어온 이유와 현재 상태
2. Quick Answer: 3초 답과 핵심 카드 4개
3. Calculator/Check Tool: 사실만 입력하고 결과 확인
4. Result Interpretation: 결과가 나온 이유와 읽는 순서
5. Deep Information: 사례·비교·표·주의·공식 기준
6. Situation: 독자 상황별 분기
7. Action: 지금부터 할 일을 순서대로 제시
8. Official: 공식기관 확인 경로
9. FAQ: 검색 후 남는 질문 해결
10. Related: 관련 계산기와 관련 글
11. Next: 다음 질문과 다음 행동

## 화면 레이어
- 상단: Hero + 3초 답
- 본문 상단: 가로 스크롤 목차
- 데스크톱 왼쪽: 대분류 → 중분류 → 소분류 Explorer
- 데스크톱 오른쪽: 현재 글에서 바로 이어지는 계산기·글
- 모바일: `주제 탐색` 버튼으로 Explorer 호출

## 분리 원칙
- HTML 구조: `templates/article-v2.html`
- 콘텐츠: `data/article-configs-v2.json`
- 유형 규칙: `data/article-type-rules.json`
- 사이트 탐색: `data/site-navigation.json`
- 생성: `tools/build-articles-v2.py`
- QA: `tools/test-article-dna-v2.py`

## 승인 기준
- 공백 제외 3,000~5,500자
- 고정 섹션 6개
- 요약 카드 4개
- 사례 3~4개 이상(유형별 기준)
- 비교표 최소 3행
- 체크리스트 7개
- FAQ 5개
- 다음 질문 5개
- 관련 계산기·관련 글 각각 2개 이상
- 깨진 내부 링크 0개
- 템플릿 미치환 토큰 0개
- 도입·FAQ·다음 질문 중복 없음

승인 전에는 기존 전체 글에 적용하지 않는다.

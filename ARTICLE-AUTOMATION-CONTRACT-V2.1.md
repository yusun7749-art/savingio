# Article Automation Contract V2.1

## 입력
- slug, category, article_type
- title, description
- search_intent, reader_state
- calculator/check tool
- summary, quick, sections, cases, table
- checklist, faq, actions
- next_questions, decision_points
- related_calcs, related_articles, official, notice

## 처리
1. 유형 규칙 로드
2. 필수 데이터 검증
3. 공통 DNA 렌더링
4. 유형별 흐름 반영
5. Curiosity 질문 삽입
6. Site Explorer 연결
7. SEO·FAQ·Breadcrumb schema 생성
8. QA 검사

## QA 실패 시 배포 중단
- 3,000자 미만 또는 5,500자 초과
- 검색 의도·독자 상태 누락
- 유형 미등록
- 사례·행동·결정기준 부족
- FAQ·도입·다음 질문 과도한 중복
- 공식기관 또는 관련 링크 부족
- 내부 링크 대상 파일 부재
- 가로 목차·왼쪽 탐색기 누락

## 출력
- articles/<slug>.html
- ARTICLE-ENGINE-V2-QA.json
- ARTICLE-ENGINE-V2-QA-SUMMARY.md

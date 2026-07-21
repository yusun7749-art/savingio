# Savingio MASTER LOG APPEND — 2026-07-21

## 사용자 명령

- `articles/fan-aircon-combination-saving.html`의 좌측 검색창 부분을 기준 글과 같은 형태로 수정.

## 실제 수행

- 대상 파일의 독립 `left-search-rail` 검색 폼을 제거했다.
- 본문과 오른쪽 사이드바의 기존 구조와 콘텐츠는 유지했다.
- 페이지 셸을 기준 글과 같은 본문+오른쪽 rail 구조로 되돌렸다.
- 공통 `savingio-brain-navigation.js?v=12`를 추가해 왼쪽 Brain Navigation / Site Explorer가 공통 방식으로 생성되도록 수정했다.
- 데스크톱 기본 3열 구조는 왼쪽 공통 Explorer + 가운데 본문 + 오른쪽 rail로 유지한다.
- 모바일·태블릿 반응형 구조와 기존 H1, Meta, canonical, Article 스키마, 내부 링크는 유지했다.

## 수정 파일

- `articles/fan-aircon-combination-saving.html`

## 검증

- 커스텀 단순 검색 폼 제거: PASS
- 공통 Brain Navigation 스크립트 연결: PASS
- 가운데 본문 유지: PASS
- 오른쪽 관련 글·계산기·카테고리·최신 글 유지: PASS
- H1 1개 및 canonical 유지: PASS
- 공식 Publisher ID 변경 없음: PASS

## 커밋

- `a200e9e3d6356f92cd242de2d608c7a280c30bb2`

## 다음 즉시 작업

- Cloudflare 반영 후 운영 URL에서 왼쪽 Explorer 검색창·카테고리·인기 글 표시를 확인한다.
- 다음 콘텐츠 작업은 미완료 글 1개를 선정하고 중복 검사부터 수행한다.

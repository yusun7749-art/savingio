# Savingio 작업 기록 — grocery-saving-tips 전면 재작성

- KST 날짜: 2026-07-22
- 사용자 명령: 글쓰기 헌법을 임의 변경하지 않고 `https://savingio.com/articles/grocery-saving-tips.html` 전체 교체
- 저장소: `yusun7749-art/savingio`
- 브랜치: `main`

## 권한 확인

GitHub Connector로 저장소 권한을 실제 조회했다.

- admin: true
- maintain: true
- push: true
- pull: true
- triage: true

## 실제 수행 작업

- 기준 DNA 파일 `articles/car-aircon-fuel-saving.html`의 구조를 확인했다.
- 기존 `articles/grocery-saving-tips.html`의 주제와 맞지 않는 일반 안내형 본문 및 잘못된 FAQ를 확인했다.
- URL과 파일명은 유지하고 기존 본문을 부분 덧씌우지 않고 전체 재작성했다.
- 기준 DNA의 Header, Breadcrumb, 본문, 오른쪽 Rail, Footer, Navigation 스크립트 구조를 유지했다.
- 본문 상단 `<figure class="thumb">`는 추가하지 않았다.
- 오른쪽 Rail은 5개 섹션으로 구성했다.

## 적용한 콘텐츠 DNA

- Breadcrumb
- H1
- Lead
- 작성·검수
- 5초 결론
- 30초 질문
- 5분 목차
- 문제 해결형 본문
- 비교표 2개
- 단계별 실행 순서
- 상황 선택형 행동 안내
- 체크리스트
- FAQ 5개 및 FAQ 구조화 데이터
- 관련 글
- Footer

## 콘텐츠 범위

- 식비가 줄지 않는 원인
- 최근 4주 지출을 기준으로 한 예산 확인
- 냉장고·냉동실 재고 점검
- 주간 실제 식사 수 계산
- 용도·수량 중심 장보기 목록
- 1+1·대용량·마감 할인 판단
- 온라인 장보기와 오프라인 마트 비교
- 소분·냉동·먼저 먹기 보관 순서
- 자주 하는 실패와 실행 체크리스트

## 실제 수정 파일

- `articles/grocery-saving-tips.html`

## 검증 결과

- 기존 URL 유지: PASS
- canonical 유지: PASS
- H1 1개: PASS
- 5초 결론: PASS
- 30초 질문: PASS
- 목차: PASS
- 표: PASS
- 체크리스트: PASS
- FAQ 5개: PASS
- FAQ JSON-LD: PASS
- 오른쪽 Rail 5개 섹션: PASS
- Savingio Brain Navigation JS 유지: PASS
- 본문 상단 썸네일 미삽입: PASS
- 재작성 본문 가시 텍스트: 약 7,680자
- GitHub 재조회: PASS

## 관련 커밋

- 콘텐츠 교체 커밋: `50865dcae4558179fe91e964d336c27cfb1192a2`
- 교체 후 blob SHA: `10b8b8140fdf7b10b9834397f04f4a369c46efd2`

## 남은 검증

- Cloudflare Pages 배포 후 실제 운영 화면 육안 확인
- 왼쪽 Site Explorer 렌더링 확인
- 모바일 폭 및 오른쪽 Rail 반응형 확인
- 내부 링크 실제 클릭 확인

## 다음 즉시 실행 작업

Cloudflare 반영 후 `https://savingio.com/articles/grocery-saving-tips.html` 실제 화면을 확인하고, 구조 이탈이나 링크 오류가 있을 경우 해당 글만 수정한다.

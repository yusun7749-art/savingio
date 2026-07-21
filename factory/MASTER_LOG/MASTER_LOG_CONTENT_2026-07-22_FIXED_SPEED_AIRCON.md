# Savingio 콘텐츠 작업 기록 — 2026-07-22

## 사용자 명령

- 기존 완료 글 목록과 이후 완료 글을 모두 제외한다.
- 다음 미수정 글은 매번 제목·URL·본문·검색 의도 중복 여부를 꼼꼼히 확인한 뒤 한 글씩 진행한다.
- 기본 3열 구조를 유지한다.

## 이번 대상

- `articles/fixed-speed-aircon-saving.html`

## 중복 검사

- `articles/inverter-aircon-saving-guide.html`: 인버터형의 출력 조절과 유지 운전이 핵심이므로 검색 의도가 다름.
- `articles/air-conditioner-electricity-saving.html`: 에어컨 전기요금 절약 전반을 다루는 대표 종합 글이므로 범위가 다름.
- `articles/aircon-optimal-temperature-savings.html`: 적정 설정온도 판단이 중심이므로 검색 의도가 다름.
- `articles/fan-aircon-combination-saving.html`: 선풍기와 에어컨의 공기 순환 방법이 중심이므로 검색 의도가 다름.
- 판정: 중복 아님. 정속형 전용 운전법 글로 별도 유지.

## 실제 수행

- 기존 자동 생성형·범용 본문 100% 폐기.
- URL, H1, canonical 유지.
- 정속형 확인법, 인버터형과 차이, 냉방 운전 순서, 외출 판단, 온도·풍량, 필터·실외기, 잘못된 절약법, 사용량 비교를 새로 작성.
- 5초 결론, 30초 질문, 목차, 표 2개, 단계, 체크리스트, FAQ, 관련 글, 계산기 연결 적용.
- 상단 본문 썸네일 미사용 원칙 유지.
- Brain Navigation 스크립트와 오른쪽 관련 정보 rail을 유지해 기본 3열 구조 보존.

## QA

- H1 1개
- canonical 1개
- Article 스키마 1개
- FAQ 스키마 1개
- 제목·URL·검색 의도 중복 검사 완료
- 내부 링크: 인버터형, 종합 절약, 선풍기 조합, 필터, 적정온도, 전기요금 계산기 연결
- 공식 Publisher ID 관련 코드 변경 없음
- 수정 후 GitHub `main` 파일 재조회 완료

## 커밋

- `6b53c3dd79bce4fbc7bee5d6780d3f18a38234cc`

## 다음

- 사용자 완료 목록과 이번 완료 글을 제외하고 다음 미수정 글 1개를 선정한다.
- 선정 전 동일하게 제목·URL·본문·검색 의도 중복 검사를 수행한다.

# Savingio Article Rebuild 200

최종 갱신: 2026-07-19 KST

## 목표

- 공개 글 약 200개를 10개씩 20개 배치로 전면 재정비한다.
- 404, 중복 제목, 짧은 본문, 잘못된 링크, 누락 이미지, 잘못된 카테고리, 반복 삽입 문구를 함께 수정한다.
- 모든 글의 배경과 UI는 메인 Hero의 크림·네이비·골드 시각 체계로 통일한다.
- 기존 파란색 중심 배경과 버튼은 제거한다.

## 고정 글 DNA

1. 실제 사용자가 겪는 문제를 제목과 도입부에서 바로 제시
2. 약 3,500~5,000자 이상의 정보성 본문
3. 3초 요약 1회
4. 목차 1회
5. 원인·확인 순서·해결 순서
6. 비용·보험·지원·계산기 연결이 필요한 경우 실제 링크 제공
7. 표·체크리스트·주의사항
8. FAQ
9. 다음 행동 기준의 관련 글 3~5개
10. canonical, meta description, schema, 대표 이미지, ALT 확인

## 연결 원칙

- 제목이 비슷한 글을 무작정 연결하지 않는다.
- 사용자의 다음 행동 순서로 연결한다.
- 예: 전기요금 원인 확인 → 사용량 계산기 → 에어컨 운전법 → 할인제도 → 고지서 확인
- 존재하지 않는 주소는 연결하지 않는다.
- 모든 내부 링크는 실제 파일 존재 여부를 검사한다.
- 404 링크가 하나라도 남으면 해당 배치는 PASS 처리하지 않는다.

## 배치 운영

- 총 20개 배치
- 배치당 10개
- 각 배치 순서: 제목·주소 감사 → 본문 재작성 → 이미지·메타 → 내부링크 → 404 검사 → UI 검사 → Production 확인
- PASS는 실제 파일 검사와 링크 검사 후에만 기록한다.

## Batch 01 — 전기요금·냉방비 흐름

1. traffic-fines-difference-guide.html — 교통벌금·범칙금·과태료 차이
2. ai-side-hustles-beginner.html — 초보자를 위한 AI 부업 시작 방법
3. air-conditioner-electricity-saving.html — 에어컨 전기요금 줄이는 실전 방법
4. aircon-dry-mode-electricity.html — 에어컨 제습모드 전기세 차이
5. aircon-filter-cleaning-savings.html — 에어컨 필터 청소로 전기세 줄이기
6. aircon-optimal-temperature-savings.html — 에어컨 적정온도와 전기세
7. inverter-aircon-saving.html — 인버터 에어컨 절약 운전법
8. fixed-speed-aircon-saving.html — 정속형 에어컨 절약 방법
9. fan-aircon-together.html — 선풍기와 에어컨 함께 쓰는 방법
10. dehumidifier-electricity-cost.html — 제습기 전기요금 계산과 절약법

상태: STARTED

## 현재 구현 상태

- V3.035: 글 목록 Warning 문구 제거 및 목록형 UI 적용
- V3.036: 전체 articles HTML에 메인과 동일한 크림·네이비·골드 공통 CSS 적용 자동화 추가
- 다음 작업: Batch 01의 실제 파일 존재 여부와 404 링크 검사 후 10개 본문을 순서대로 재작성

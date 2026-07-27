# SAVINGIO V2 검색 의도 최종 판정 — 자동이체·구독

- 기준 헌법: `SAVINGIO_WRITING_CONSTITUTION_V2.md`
- 판정일: 2026-07-27
- 비교 대상
  - `articles/automatic-payment-saving.html`
  - `articles/cancel-unused-subscriptions.html`

## 1. 전체 본문 비교 결과

### automatic-payment-saving.html

사용자의 핵심 목적은 **가계 전체에서 반복적으로 빠져나가는 고정비를 발견하고 안전하게 정리하는 것**이다.

포함 범위:

- 계좌 자동이체
- 카드 정기결제
- 휴대폰 합산 결제
- 앱스토어 구독
- 보험료
- 통신비
- 렌탈료
- 학습지·교육비
- 가족 명의 결제
- 미납·연체 방지
- 위약금과 결합 할인 변화
- 해지 후 다음 달 명세서 재확인

이 글은 특정 구독 해지 글이 아니라 **가계 고정비 전체 점검 대표글**이다.

### cancel-unused-subscriptions.html

사용자의 핵심 목적은 **사용하지 않는 디지털·온라인 구독을 실제 결제 플랫폼에서 취소하고 재결제를 막는 것**이다.

고유 범위:

- 앱 삭제와 구독 취소의 차이
- Apple 구독 관리
- Google Play 정기결제 관리
- 서비스 웹사이트 직접 결제
- 통신사·휴대폰 결제
- 무료체험의 유료 자동전환
- 다음 갱신일 확인
- 취소 후 남은 이용기간
- 이미 결제된 금액의 환불 문의
- 해지 완료 화면·이메일 증빙
- 가족 계정과 중복 구독
- 해지 뒤 재청구 대응

이 글은 넓은 고정비 점검보다 **구독 취소라는 명확한 실행 검색 의도**가 강하다.

## 2. V2 헌법 판정

두 글은 서로 관련되어 있지만 최종 목적이 다르다.

| URL | 핵심 검색 의도 | 최종 판정 |
|---|---|---|
| `automatic-payment-saving.html` | 가계 전체 자동이체·정기결제·고정비 감사 및 정리 | `REPRESENTATIVE / KEEP` |
| `cancel-unused-subscriptions.html` | 사용하지 않는 구독의 결제처 확인·취소·환불·재결제 방지 | `REPRESENTATIVE / KEEP` |

### 삭제·301 판정

- `cancel-unused-subscriptions.html` 삭제: **취소**
- `cancel-unused-subscriptions.html` → `automatic-payment-saving.html` 301: **적용하지 않음**

이유:

1. 자동이체 대표글만으로 구독 플랫폼별 취소 행동을 모두 해결하려면 글의 목적이 지나치게 넓어진다.
2. “자동이체 정리”와 “구독 해지”는 검색 후 사용자가 즉시 기대하는 행동이 다르다.
3. 구독 글에는 Apple·Google Play·무료체험·환불·재청구처럼 별도 페이지로 유지할 가치가 있는 고유 질문이 충분하다.
4. V2 제11조의 예외인 **검색 의도가 명확히 다른 경우**에 해당한다.

## 3. 상호 역할 확정

### automatic-payment-saving.html

- 가계 전체 반복지출을 발견하는 시작점
- 필수·선택 결제 분류
- 계약 해지와 출금 중단 구분
- 위약금·결합 할인·연체 위험 점검
- 구독 항목 발견 시 구독 해지 대표글로 연결

### cancel-unused-subscriptions.html

- 구독 결제처를 찾는 전문 실행 가이드
- 플랫폼별 취소
- 무료체험·갱신일·환불
- 증빙 보관과 재청구 대응
- 전체 고정비까지 점검할 사용자는 자동이체 대표글로 연결

## 4. 최종 상태

| 항목 | 결과 |
|---|---:|
| 비교 완료 URL | 2 |
| 대표글 유지 | 2 |
| 통합 확정 | 0 |
| 삭제 확정 | 0 |
| 301 추가 | 0 |
| 잘못된 통합 후보 판정 해제 | 1 |

## 5. 다음 실행 대상

에어컨 전기요금 클러스터 7개를 전체 비교한다.

- `air-conditioner-electricity-saving.html`
- `aircon-dry-mode-electricity.html`
- `aircon-filter-cleaning-savings.html`
- `aircon-optimal-temperature-savings.html`
- `fan-aircon-combination-saving.html`
- `fixed-speed-aircon-saving.html`
- `inverter-aircon-saving-guide.html`

판정 순서:

1. 검색 의도 비교
2. 대표글과 독립글 구분
3. 고유 질문·공식자료·사례 추출
4. 흡수 대상 확정
5. 대표글 재창조
6. 삭제·301·sitemap·내부링크 정리

## LOCK

- 관련 주제라는 이유만으로 강제 통합하지 않는다.
- 사용자가 검색 후 기대하는 최종 행동이 다르면 별도 대표글로 유지한다.
- 삭제와 301은 고유 검색 의도가 남지 않을 때만 실행한다.
- 계획이 아니라 실제 본문 비교 결과를 기준으로 판정한다.

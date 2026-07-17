# MASTER LOG CURRENT

최종 갱신: 2026-07-17 16:58 KST

- 프로젝트: Savingio Factory
- 저장소: `yusun7749-art/savingio`
- 작업 브랜치: `agent/long-term-repair-reserve-e2e`
- 기준 코드 Git HEAD: `8a2ee3f V3.006 실제 콘텐츠 이미지 승인 자동 연결`
- 현재 상태: V3.006 MERGED / PRODUCTION LIVE VERIFIED
- 마지막 완료: 장기수선충당금 공식 근거 3건 기반 실제 E2E, Writer 반복 제거, 이미지→QA→CMS 자동 연결
- 진행 중: Savingio 인생 지도형 글 연결 리모델 4차까지 누적 200개 적용·검증 완료. 전체 220개 대상은 50개 단위 5개 배치로 고정했다.
- 다음 실행 위치: `python -m factory.article_connection_batch --project-root . --batch 5 --batch-size 50 --apply`
- 보류 노드: `윗집 누수 책임·증거·수리 순서`, `일상생활배상책임보험(일배책) 누수 보상`은 공식 근거 조사 후 신규 글로 생성하고 현재 임시/가짜 URL은 만들지 않는다.
- 현재 작업: V3.006 실제 콘텐츠 자동화 완료
- 다음 시작 위치: 다음 Factory 기능 또는 다음 공식 evidence 콘텐츠 실행
- Blocker: 없음
- 마지막 검증: main `8a2ee3f`, 전체 pytest 297 PASS, Production article 제목/H1·hero·infographic·공식 출처 3건 라이브 확인
- 공식 Publisher ID: `pub-7605193583747751` (LOCK)

## 다음 대화 확인 순서
1. 이 파일을 먼저 읽는다.
2. 오늘 요약은 `MASTER_LOG_PART1.md`에서 확인한다.
3. 시간대별 상세는 `MASTER_LOG_PART1-1.md`에서 확인한다.
4. 실제 수정 파일은 `MASTER_LOG_PART2.md`에서 확인한다.
5. 테스트 결과는 `MASTER_LOG_PART3.md`에서 확인한다.

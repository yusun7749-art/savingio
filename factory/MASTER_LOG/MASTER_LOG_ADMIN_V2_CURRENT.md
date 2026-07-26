# Savingio Admin V2 Current

최종 갱신: 2026-07-26 KST
저장소: `yusun7749-art/savingio`
브랜치: `main`

## 현재 구현 상태

- 공통 설정형 `Center Renderer` 구현
- 공통 `Center Store Factory` 구현
- 개발 진행 보드 구현
- Cloudflare Center 구현
- SEO Doctor 구현
- Content Doctor 구현
- 상태 저장 직후 활성 화면 재렌더링 연결
- 런타임 검증 센터 및 Production Auto Verify 구현
- Release Marker 기반 최신 배포본 식별 구현
- 오래된 진행률 localStorage 자동 마이그레이션 구현
- 런타임 검증 전체 PASS 기반 100% 완료 게이트 구현
- 콘텐츠 인벤토리 센터 구현
- SEO 운영 센터 구현
- QA 검수 센터 구현
- 배포 승인 센터 구현
- 이미지 인벤토리 센터 구현
- 좌측 메뉴 및 script 로딩 연결

## 구현 원칙 LOCK

- Store와 독립 모듈을 분리한다.
- 실제 외부 API가 연결되지 않은 상태에서 PASS·승인·배포 성공을 만들지 않는다.
- Search Console, GitHub, Cloudflare, 실제 URL 상태는 확인된 값만 기록한다.
- 실제 URL 확인 전에는 배포 검증 완료로 판정하지 않는다.
- 이미지 경로·ALT·규격·최적화·브랜드 검수는 확인된 값만 기록한다.
- 실제 구현과 검증이 끝나지 않으면 100% 또는 완료로 기록하지 않는다.
- 진행 보드의 `complete + 100%`는 런타임 검증 결과 `pass=true`가 저장된 경우에만 허용한다.
- Production Auto Verify는 `savingio.com`, `www.savingio.com`, `savingio.pages.dev`에서만 자동 실행한다.

## 운영 센터

### 콘텐츠 인벤토리

- 제목, slug, URL, 카테고리, 상태, 품질점수, 메모 등록·수정·삭제
- 검색 및 상태·카테고리 필터
- 페이지 열기
- 콘텐츠 수정 워크플로 생성
- Store 무결성 검사

### SEO 운영 센터

- URL별 색인 상태 관리
- Meta title, Meta description, Canonical, 구조화 데이터 상태 관리
- 내부링크 수와 SEO 점수 계산
- 우선순위와 운영 메모 관리
- 검색 및 색인 상태·우선순위 필터
- SEO 재검사 워크플로 생성
- Store 무결성 검사

### QA 검수 센터

- 콘텐츠·SEO·이미지·내부링크·반응형·실제 URL 항목별 검사
- 전체 항목 통과 시 PASS 자동 판정
- 일부 항목 미통과 시 FAIL 자동 판정
- 강제 중지 상태 관리
- 검색 및 판정 필터
- 긴급 수정 워크플로 생성
- 항목별 통과율과 Store 무결성 검사

### 배포 승인 센터

- 배포 기록 등록·수정·삭제
- 운영/미리보기 환경 분리
- 작성 중·승인 완료·배포 대기·배포 중·검증 중·검증 완료·실패·롤백 상태 관리
- 승인, GitHub 반영, Cloudflare 배포, 실제 URL, 롤백 준비 항목별 확인
- Commit SHA와 Deployment ID는 확인된 값만 기록
- 검색 및 상태·환경 필터
- 실제 페이지 열기
- 배포 검증 워크플로 생성
- 배포 성공 진실성 LOCK 및 Store 무결성 검사

### 이미지 인벤토리

- 대표 이미지·본문 이미지·인포그래픽·쇼츠·로고·워터마크·기타 자산 분류
- 이미지 경로, 사용 페이지, ALT, 가로·세로 규격 관리
- 제작 중·검수 중·사용 준비·사용 중·중지 상태 관리
- 최적화, 브랜드 검수, 워터마크 적용 여부 관리
- 경로·ALT·규격·최적화·브랜드 검수 기반 품질점수 계산
- 제목·경로·ALT·메모 검색 및 유형·상태 필터
- 이미지와 사용 페이지 바로 열기
- 이미지 보완 워크플로 생성
- Store 무결성 검사

## 실제 생성·수정 파일

- `admin-v2/core/content-inventory-store.js`
- `admin-v2/core/seo-inventory-store.js`
- `admin-v2/core/qa-inventory-store.js`
- `admin-v2/core/deploy-inventory-store.js`
- `admin-v2/core/image-inventory-store.js`
- `admin-v2/modules/content.js`
- `admin-v2/modules/seo.js`
- `admin-v2/modules/image.js`
- `admin-v2/modules/qa.js`
- `admin-v2/modules/deploy.js`
- `admin-v2/modules/runtime-audit.js`
- `admin-v2/production-auto-verify.js`
- `admin-v2/index.html`

## 런타임 검증 범위

- Release Marker ID와 버전
- Production Auto Verify 전역 객체와 script
- 공통 Renderer·Store Factory
- 개발 진행 Store와 완료 진실성 LOCK
- Content Inventory Store와 모듈
- SEO Inventory Store와 모듈
- Image Inventory Store와 모듈
- QA Inventory Store와 모듈
- Deploy Inventory Store와 모듈
- Cloudflare, SEO Doctor, Content Doctor Store
- Search Console / AdSense / GitHub Release 모듈
- 각 메뉴 버튼과 핵심 script 실제 로딩 여부
- Admin V2 Shell 구조 검사

파일이 GitHub에 존재하는 것만으로 PASS 처리하지 않고 실제 브라우저 전역 객체, Registry 등록 상태, 메뉴와 script 로딩 상태를 검사한다.

## 현재 판정

- GitHub main 파일 구현: PASS
- 콘텐츠 인벤토리 Store·모듈: REPOSITORY PASS
- SEO 운영 Store·모듈: REPOSITORY PASS
- 이미지 인벤토리 Store·모듈: REPOSITORY PASS
- QA 검수 Store·모듈: REPOSITORY PASS
- 배포 승인 Store·모듈: REPOSITORY PASS
- 콘텐츠·SEO·이미지·QA·배포 메뉴 및 script 연결: PASS
- 콘텐츠·SEO·이미지·QA·배포 Runtime Audit 연결: PASS
- Production Auto Verify index 로딩 연결: PASS
- Production 브라우저 자동 런타임 결과: PENDING

## 현재 진행률

Admin V2 전체 프로젝트 진행률은 기능 단위로 다시 산정한다. 기존 99%는 초기 공통 엔진 범위이며 전체 운영본부 완성도를 뜻하지 않는다.

## 다음 작업

1. 분석 센터 실개발
2. 수익 센터 실개발
3. 운영 대시보드에서 각 센터 데이터 통합
4. Production 브라우저 E2E 검증
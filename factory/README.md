# Savingio Factory V1

기존 사이트를 건드리지 않고 `factory-output/`에 조사 패키지, 구조 초안, QA 보고서와 리뉴얼 백로그를 만듭니다.

## 실행

Windows 명령 프롬프트에서 프로젝트 폴더 기준:

```bat
python factory\run.py create "전기요금 절약"
python factory\run.py audit articles\electricity-bill-saving.html
python factory\run.py audit
python factory\run.py backlog
```

## 안전 원칙

- 기본 실행은 기존 HTML을 덮어쓰지 않습니다.
- 구조 초안에는 `noindex,nofollow`가 적용됩니다.
- 공식 조사가 채워지지 않은 초안은 발행 불가입니다.
- Git 엔진은 `git add .`를 사용하지 않고 명시된 파일만 스테이징합니다.
- 자동 push는 기본 비활성입니다.

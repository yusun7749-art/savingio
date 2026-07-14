# Savingio Factory V1.1

```bat
run_factory.bat doctor
run_factory.bat audit articles\electricity-bill-saving.html
run_factory.bat audit
run_factory.bat backlog
run_factory.bat create "전기요금 절약"
```

`create`는 조사자료가 없으면 `factory-output/drafts/`에 **noindex 초안**만 만듭니다. 기존 발행 글은 자동 덮어쓰기하지 않습니다.

Factory는 `git add .`와 자동 push를 하지 않습니다. 선택 파일 커밋 명령만 미리 확인합니다.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $root "articles"
$dest = Join-Path $root "articles"

if (-not (Test-Path (Join-Path $root ".git"))) {
  Write-Host "이 파일을 savingio-live 폴더 안에 넣고 실행하세요." -ForegroundColor Red
  Pause
  exit 1
}

# Files are already copied into the repo by the user. Just verify.
$count = (Get-ChildItem $src -Filter *.html).Count
Write-Host ""
Write-Host "신규 공식자료 기반 글 $count개 확인 완료" -ForegroundColor Green
Write-Host ""
Write-Host "이제 기존 '1-최종목록복구-실행.bat'를 실행한 뒤 git add/commit/push 하세요."
Write-Host ""
Pause

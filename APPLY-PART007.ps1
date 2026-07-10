$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$articles = Join-Path $root "articles"
$calculators = Join-Path $root "calculators"

if (-not (Test-Path (Join-Path $root ".git"))) {
  Write-Host "이 파일을 savingio-live 폴더 안에 넣고 실행하세요." -ForegroundColor Red
  Pause
  exit 1
}

function Add-Asset([string]$path) {
  $text = Get-Content $path -Raw -Encoding UTF8

  if ($text -notmatch 'savingio-content-platform\.css') {
    $text = $text -replace '</head>', '<link rel="stylesheet" href="/css/savingio-content-platform.css?v=7">' + "`r`n</head>"
  }

  if ($text -notmatch 'savingio-content-platform\.js') {
    $text = $text -replace '</body>', '<script src="/js/savingio-content-platform.js?v=7"></script>' + "`r`n</body>"
  }

  Set-Content $path $text -Encoding UTF8
}

$countArticles = 0
if (Test-Path $articles) {
  Get-ChildItem $articles -Filter *.html | Where-Object { $_.Name -ne "index.html" } | ForEach-Object {
    Add-Asset $_.FullName
    $countArticles++
  }
}

$countCalculators = 0
if (Test-Path $calculators) {
  Get-ChildItem $calculators -Filter *.html | Where-Object { $_.Name -ne "index.html" } | ForEach-Object {
    Add-Asset $_.FullName
    $countCalculators++
  }
}

Write-Host ""
Write-Host "완료: 콘텐츠 중심 메인 + 글 고정 계산기 + 계산기 관련글 연결" -ForegroundColor Green
Write-Host "글 페이지 적용: $countArticles개"
Write-Host "계산기 페이지 적용: $countCalculators개"
Write-Host ""
Write-Host "이제 git add ., commit, push 하세요."
Pause

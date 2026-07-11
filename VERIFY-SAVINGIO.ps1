$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$htmlFiles = Get-ChildItem -Path $root -Recurse -Filter *.html
$missing = @()
foreach ($file in $htmlFiles) {
  $content = Get-Content $file.FullName -Raw -Encoding UTF8
  $matches = [regex]::Matches($content, 'href=["'']([^"'']+)["'']')
  foreach ($match in $matches) {
    $href = $match.Groups[1].Value.Split('#')[0].Split('?')[0]
    if ([string]::IsNullOrWhiteSpace($href) -or $href -match '^(https?:|mailto:|tel:|javascript:)') { continue }
    if ($href.StartsWith('/')) { $target = Join-Path $root $href.TrimStart('/') }
    else { $target = Join-Path $file.DirectoryName $href }
    if ($href.EndsWith('/')) { $target = Join-Path $target 'index.html' }
    if (-not (Test-Path $target)) { $missing += "$($file.FullName) -> $href" }
  }
}
if ($missing.Count -gt 0) {
  $missing | ForEach-Object { Write-Host $_ -ForegroundColor Red }
  throw "깨진 내부 링크 $($missing.Count)개"
}
$articleCount = (Get-ChildItem (Join-Path $root 'articles') -Filter *.html | Where-Object Name -ne 'index.html').Count
$cardCount = ([regex]::Matches((Get-Content (Join-Path $root 'articles/index.html') -Raw -Encoding UTF8), 'class="article-card"')).Count
Write-Host "내부 링크 정상 / 글 파일 $articleCount개 / 목록 카드 $cardCount개" -ForegroundColor Green

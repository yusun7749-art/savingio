
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$articles = Join-Path $root "articles"

if (-not (Test-Path (Join-Path $root ".git"))) {
  Write-Host ""
  Write-Host "오류: 이 파일들은 savingio-live 폴더 안에 넣고 실행해야 합니다." -ForegroundColor Red
  Write-Host ""
  Pause
  exit 1
}

function Get-MetaValue {
  param([string]$Text, [string]$Name)
  $pattern = '<meta\s+name=["'']' + [regex]::Escape($Name) + '["'']\s+content=["''](.*?)["'']'
  $m = [regex]::Match($Text, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($m.Success) { return $m.Groups[1].Value }
  return ""
}

$files = Get-ChildItem $articles -Filter *.html | Where-Object { $_.Name -ne "index.html" } | Sort-Object Name
$cards = @()

foreach ($f in $files) {
  $text = Get-Content $f.FullName -Raw -Encoding UTF8
  $tm = [regex]::Match($text, '<title>(.*?)</title>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  $title = if ($tm.Success) { $tm.Groups[1].Value -replace '\s*\|\s*Savingio\s*$', '' } else { $f.BaseName -replace '-', ' ' }
  $desc = Get-MetaValue -Text $text -Name "description"
  if ([string]::IsNullOrWhiteSpace($desc)) { $desc = "Savingio 생활비·세금·지원금 가이드" }

  $safeTitle = [System.Net.WebUtility]::HtmlEncode($title)
  $safeDesc = [System.Net.WebUtility]::HtmlEncode($desc)
  $cards += "<a class=""card"" href=""/articles/$($f.Name)""><h2>$safeTitle</h2><p>$safeDesc</p><span class=""more"">자세히 보기 →</span></a>"
}

$index = @"
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>생활비 절약·세금·지원금 정보 | Savingio</title>
<meta name="description" content="세금, 정부지원금, 환급금, 생활비 절약 정보를 확인하세요.">
<link rel="canonical" href="https://savingio.com/articles/">
<style>
*{box-sizing:border-box}
body{margin:0;font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f7f9fc;color:#172033}
a{text-decoration:none;color:inherit}
header{background:#fff;border-bottom:1px solid #e5e7eb}
.nav{max-width:1120px;margin:auto;padding:18px 24px;display:flex;justify-content:space-between}
.logo{font-size:25px;font-weight:800;color:#1463ff}
.hero{background:linear-gradient(135deg,#eef4ff,#fff)}
.hero div{max-width:1120px;margin:auto;padding:64px 24px}
.hero h1{font-size:clamp(34px,5vw,54px);margin:0 0 16px}
.hero p{font-size:18px;color:#667085}
main{max-width:1120px;margin:auto;padding:48px 24px 80px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.card{display:flex;flex-direction:column;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:24px;min-height:210px;box-shadow:0 8px 24px rgba(17,24,39,.04)}
.card:hover{transform:translateY(-3px);border-color:#9dbbff}
.card h2{font-size:19px;line-height:1.45;margin:0 0 12px}
.card p{font-size:14px;color:#667085;margin:0 0 18px}
.more{margin-top:auto;color:#1463ff;font-weight:800}
@media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:620px){.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<header><div class="nav"><a class="logo" href="/">Savingio</a><a href="/about.html">소개</a></div></header>
<section class="hero"><div><h1>돈이 되는 생활 정보</h1><p>세금·지원금·환급금·생활비 절약 가이드를 한곳에서 확인하세요.</p></div></section>
<main>
<h2>전체 글 $($files.Count)개</h2>
<div class="grid">
$($cards -join "`n")
</div>
</main>
</body>
</html>
"@

Set-Content -Path (Join-Path $articles "index.html") -Value $index -Encoding UTF8

$urls = @(
  "https://savingio.com/",
  "https://savingio.com/articles/",
  "https://savingio.com/about.html",
  "https://savingio.com/contact.html",
  "https://savingio.com/privacy.html"
)
$urls += $files | ForEach-Object { "https://savingio.com/articles/$($_.Name)" }

$xml = @('<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
$xml += $urls | ForEach-Object { "  <url><loc>$_</loc></url>" }
$xml += '</urlset>'
Set-Content -Path (Join-Path $root "sitemap.xml") -Value ($xml -join "`n") -Encoding UTF8

Set-Content -Path (Join-Path $root "robots.txt") -Value "User-agent: *`nAllow: /`nSitemap: https://savingio.com/sitemap.xml`n" -Encoding UTF8

Write-Host ""
Write-Host "완료: 전체 글 $($files.Count)개 / 목록·sitemap·robots 갱신" -ForegroundColor Green
Write-Host ""
Write-Host "이제 VS Code 터미널에서 아래 3줄만 실행하세요."
Write-Host "git add ."
Write-Host 'git commit -m "Add July 100 articles"'
Write-Host "git push"
Write-Host ""
Pause

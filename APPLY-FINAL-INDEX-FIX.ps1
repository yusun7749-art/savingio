$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$articles = Join-Path $root "articles"

if (-not (Test-Path (Join-Path $root ".git"))) {
  Write-Host ""
  Write-Host "오류: 이 파일을 savingio-live 폴더 안에 넣고 실행하세요." -ForegroundColor Red
  Write-Host ""
  Pause
  exit 1
}

function HtmlEncode([string]$value) {
  return [System.Net.WebUtility]::HtmlEncode($value)
}

function Get-Title([string]$text, [string]$fallback) {
  $m = [regex]::Match($text, '<title>(.*?)</title>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($m.Success) {
    return (($m.Groups[1].Value -replace '\s*\|\s*Savingio\s*$','').Trim())
  }
  return ($fallback -replace '-',' ')
}

function Get-Description([string]$text) {
  $m = [regex]::Match($text, '<meta\s+name=["'']description["'']\s+content=["''](.*?)["'']', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($m.Success) { return $m.Groups[1].Value.Trim() }
  return "Savingio 생활비·세금·지원금 가이드"
}

function Infer-Category([string]$name, [string]$title) {
  $s = ($name + " " + $title).ToLower()
  if ($s -match 'vat|tax|재산세|부가가치세|세금|환급|장려금') { return "세금·환급" }
  if ($s -match 'support|benefit|voucher|지원|급여|바우처|복지') { return "지원금" }
  if ($s -match 'electric|aircon|water|heating|bill|에어컨|전기|수도|난방|통신|관리비') { return "생활비 절약" }
  if ($s -match 'business|사업|소상공인|창업|폐업') { return "소상공인" }
  if ($s -match 'card|credit|loan|bank|budget|saving|insurance|금융|카드|대출|보험|예산|적금|통장') { return "금융" }
  return "생활정보"
}

$files = Get-ChildItem $articles -Filter *.html | Where-Object { $_.Name -ne "index.html" } | Sort-Object Name
$cards = New-Object System.Collections.Generic.List[string]
$categories = New-Object System.Collections.Generic.HashSet[string]

foreach ($file in $files) {
  $text = Get-Content $file.FullName -Raw -Encoding UTF8
  $title = Get-Title $text $file.BaseName
  $desc = Get-Description $text
  $category = Infer-Category $file.Name $title
  [void]$categories.Add($category)

  $searchText = "$title $desc $category"
  $card = @"
<a class="card"
   href="/articles/$($file.Name)"
   data-category="$(HtmlEncode $category)"
   data-search="$(HtmlEncode $searchText.ToLower())">
  <span class="badge">$(HtmlEncode $category)</span>
  <h2>$(HtmlEncode $title)</h2>
  <p>$(HtmlEncode $desc)</p>
  <span class="more">자세히 보기 →</span>
</a>
"@
  $cards.Add($card)
}

$filterButtons = New-Object System.Collections.Generic.List[string]
$filterButtons.Add('<button class="filter active" type="button" data-category="전체">전체</button>')
foreach ($cat in ($categories | Sort-Object)) {
  $filterButtons.Add("<button class=""filter"" type=""button"" data-category=""$(HtmlEncode $cat)"">$(HtmlEncode $cat)</button>")
}

$count = $files.Count
$cardsHtml = $cards -join "`n"
$filtersHtml = $filterButtons -join "`n"

$html = @"
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>생활비 절약·세금·지원금 정보 | Savingio</title>
<meta name="description" content="세금, 정부지원금, 환급금, 금융, 생활비 절약 정보를 검색하고 카테고리별로 확인하세요.">
<link rel="canonical" href="https://savingio.com/articles/">
<style>
*{box-sizing:border-box}
body{margin:0;font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f7f9fc;color:#172033}
a{text-decoration:none;color:inherit}
header{background:#fff;border-bottom:1px solid #e5e7eb}
.nav{max-width:1160px;margin:auto;padding:18px 24px;display:flex;justify-content:space-between;align-items:center}
.logo{font-size:26px;font-weight:900;color:#1463ff}
.hero{background:linear-gradient(135deg,#eef4ff,#fff);border-bottom:1px solid #e5e7eb}
.hero-in{max-width:1160px;margin:auto;padding:58px 24px 46px}
h1{font-size:clamp(34px,5vw,54px);margin:0 0 12px;letter-spacing:-1.5px}
.hero p{color:#667085;font-size:18px}
main{max-width:1160px;margin:auto;padding:34px 24px 80px}
.tools{background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:20px;margin-bottom:26px;box-shadow:0 8px 26px rgba(17,24,39,.05)}
.search{width:100%;padding:15px 18px;border:1px solid #d9e0ea;border-radius:13px;font-size:16px;outline:none}
.search:focus{border-color:#1769ff;box-shadow:0 0 0 4px rgba(23,105,255,.1)}
.filters{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.filter{border:1px solid #d9e0ea;background:#fff;border-radius:999px;padding:9px 14px;cursor:pointer;font-weight:700;color:#475467}
.filter.active{background:#1769ff;color:#fff;border-color:#1769ff}
.summary{display:flex;justify-content:space-between;align-items:center;margin:20px 0;color:#667085}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.card{display:flex;flex-direction:column;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:23px;min-height:225px;box-shadow:0 8px 24px rgba(17,24,39,.04);transition:.2s}
.card:hover{transform:translateY(-3px);border-color:#9dbbff}
.card.hidden{display:none}
.badge{align-self:flex-start;background:#edf3ff;color:#1457c9;padding:5px 10px;border-radius:999px;font-size:12px;font-weight:800;margin-bottom:12px}
.card h2{font-size:19px;line-height:1.45;margin:0 0 10px}
.card p{font-size:14px;color:#667085;margin:0 0 18px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.more{margin-top:auto;color:#1463ff;font-weight:800}
.pagination{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:34px}
.page{border:1px solid #d9e0ea;background:#fff;border-radius:10px;padding:9px 13px;cursor:pointer}
.page.active{background:#1769ff;color:#fff;border-color:#1769ff}
.empty{display:none;text-align:center;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:50px;color:#667085}
@media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:620px){.grid{grid-template-columns:1fr}.nav a:last-child{display:none}}
</style>
</head>
<body>
<header>
  <div class="nav">
    <a class="logo" href="/">Savingio</a>
    <a href="/about.html">Savingio 소개</a>
  </div>
</header>

<section class="hero">
  <div class="hero-in">
    <h1>돈이 되는 생활 정보</h1>
    <p>세금·지원금·환급금·금융·생활비 절약 정보를 빠르게 찾아보세요.</p>
  </div>
</section>

<main>
  <div class="tools">
    <input id="search" class="search" type="search" placeholder="검색어를 입력하세요. 예: 재산세, 에너지바우처, 환급금">
    <div id="filters" class="filters">
$filtersHtml
    </div>
  </div>

  <div class="summary">
    <strong id="resultCount">전체 글 $count개</strong>
    <span>한 페이지에 12개씩 표시</span>
  </div>

  <div id="grid" class="grid">
$cardsHtml
  </div>

  <div id="empty" class="empty">검색 결과가 없습니다.</div>
  <div id="pagination" class="pagination"></div>
</main>

<script>
(function () {
  const PAGE_SIZE = 12;
  const cards = Array.from(document.querySelectorAll('.card'));
  const search = document.getElementById('search');
  const resultCount = document.getElementById('resultCount');
  const pagination = document.getElementById('pagination');
  const empty = document.getElementById('empty');
  let activeCategory = '전체';
  let currentPage = 1;

  function getFilteredCards() {
    const q = search.value.trim().toLowerCase();
    return cards.filter(function(card) {
      const matchesCategory = activeCategory === '전체' || card.dataset.category === activeCategory;
      const matchesSearch = !q || card.dataset.search.includes(q);
      return matchesCategory && matchesSearch;
    });
  }

  function render() {
    const filtered = getFilteredCards();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    cards.forEach(function(card) {
      card.classList.add('hidden');
    });

    const start = (currentPage - 1) * PAGE_SIZE;
    filtered.slice(start, start + PAGE_SIZE).forEach(function(card) {
      card.classList.remove('hidden');
    });

    resultCount.textContent = '검색 결과 ' + filtered.length + '개';
    empty.style.display = filtered.length ? 'none' : 'block';

    pagination.innerHTML = '';
    if (filtered.length > PAGE_SIZE) {
      for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'page' + (i === currentPage ? ' active' : '');
        button.textContent = i;
        button.addEventListener('click', function() {
          currentPage = i;
          render();
          window.scrollTo({ top: 300, behavior: 'smooth' });
        });
        pagination.appendChild(button);
      }
    }
  }

  document.querySelectorAll('.filter').forEach(function(button) {
    button.addEventListener('click', function() {
      document.querySelectorAll('.filter').forEach(function(item) {
        item.classList.remove('active');
      });
      button.classList.add('active');
      activeCategory = button.dataset.category;
      currentPage = 1;
      render();
    });
  });

  search.addEventListener('input', function() {
    currentPage = 1;
    render();
  });

  render();
})();
</script>
</body>
</html>
"@

Set-Content -Path (Join-Path $articles "index.html") -Value $html -Encoding UTF8

Write-Host ""
Write-Host "완료: 검색창·카테고리·149개 카드·페이지 번호 복구" -ForegroundColor Green
Write-Host "전체 글: $count개"
Write-Host ""
Write-Host "이제 VS Code 터미널에서 아래 3줄을 실행하세요."
Write-Host "git add ."
Write-Host 'git commit -m "Fix final articles index"'
Write-Host "git push"
Write-Host ""
Pause

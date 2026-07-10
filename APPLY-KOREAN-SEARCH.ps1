$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$articles = Join-Path $root "articles"

if (-not (Test-Path (Join-Path $root ".git"))) {
  Write-Host "이 파일을 savingio-live 폴더 안에 넣은 뒤 실행하세요." -ForegroundColor Red
  Pause
  exit 1
}

$koMap = @{
  "ai-side-hustles-beginner.html" = @("초보자를 위한 AI 부업 시작 방법","부업")
  "beginner-ai-side-hustles.html" = @("초보자를 위한 AI 활용 부업 가이드","부업")
  "bank-fees-to-avoid.html" = @("은행 수수료 아끼는 방법 총정리","금융")
  "beginner-budget-plan.html" = @("초보자를 위한 월간 예산 계획","예산관리")
  "beginner-money-management.html" = @("처음 시작하는 돈 관리 방법","예산관리")
  "budget-app-guide.html" = @("가계부 앱 활용 가이드","예산관리")
  "automatic-payment-saving.html" = @("자동결제 내역으로 생활비 줄이기","고정비")
  "bank-account-budgeting.html" = @("통장 나누기로 예산 관리하기","예산관리")
  "cancel-unused-subscriptions.html" = @("사용하지 않는 구독서비스 정리하기","고정비")
  "card-points-cashback-guide.html" = @("카드 포인트와 캐시백 활용법","카드")
  "cash-out-card-points.html" = @("카드 포인트 현금화 방법","카드")
  "cashback-apps-guide.html" = @("캐시백 앱 활용 가이드","카드")
  "check-hidden-refunds.html" = @("미수령 환급금 조회 방법","환급금")
  "credit-score-habits.html" = @("신용점수를 지키는 생활 습관","신용관리")
  "credit-score-tips.html" = @("신용점수 관리 방법","신용관리")
  "debit-card-vs-credit-card.html" = @("체크카드와 신용카드 비교","카드")
  "earned-income-tax-credit-korea.html" = @("근로장려금 신청 가이드","지원금")
  "electricity-bill-saving.html" = @("전기요금 절약 방법","공공요금")
  "emergency-fund-guide.html" = @("비상금 마련 가이드","저축")
  "energy-voucher-application.html" = @("에너지바우처 신청 방법","지원금")
  "government-benefits-warning.html" = @("정부지원금 조회 시 주의할 점","지원금")
  "government24-benefit-check.html" = @("정부24에서 받을 수 있는 혜택 찾기","지원금")
  "grocery-bill-savings.html" = @("장보기 비용 절약 방법","식비")
  "grocery-saving-tips.html" = @("생활 속 식비 절약 습관","식비")
  "health-insurance-refund.html" = @("건강보험 환급금 확인 방법","환급금")
  "heating-bill-saving.html" = @("겨울철 난방비 절약 방법","공공요금")
  "hidden-refund-check.html" = @("숨은 환급금 확인하기","환급금")
  "how-to-check-hidden-refunds.html" = @("숨은 돈 찾기 단계별 가이드","환급금")
  "how-to-lower-phone-bill.html" = @("휴대전화 요금 낮추는 방법","통신비")
  "how-to-save-electricity-bill.html" = @("전기요금을 낮추는 생활 습관","공공요금")
  "impulse-buying-control.html" = @("충동구매를 줄이는 방법","소비습관")
  "internet-bill-discount.html" = @("인터넷 요금 할인받는 방법","통신비")
  "internet-bill-savings.html" = @("매달 인터넷 비용 줄이기","통신비")
  "irs-tax-refund-status.html" = @("세금 환급 진행상태 확인 방법","환급금")
  "local-tax-refund.html" = @("지방세 환급금 조회 방법","환급금")
  "money-saving-habits.html" = @("돈이 모이는 생활 습관","생활비")
  "monthly-budget-planner.html" = @("월간 예산표 작성 방법","예산관리")
  "national-tax-refund.html" = @("국세 환급금 조회 방법","환급금")
  "online-income-ideas-for-beginners.html" = @("초보자를 위한 온라인 부업 아이디어","부업")
  "phone-bill-saving.html" = @("휴대전화 요금 절약 방법","통신비")
  "phone-bill-savings.html" = @("통신비 줄이는 실천 방법","통신비")
  "salary-management-guide.html" = @("월급 관리 가이드","예산관리")
  "spending-habits-change.html" = @("소비 습관 바꾸는 방법","소비습관")
  "subscription-saving.html" = @("정기구독 비용 절약 방법","고정비")
  "water-bill-saving.html" = @("수도요금 절약 방법","공공요금")
  "air-conditioner-electricity-saving.html" = @("에어컨 전기요금 절약 방법","공공요금")
}

function Get-MetaDescription([string]$text) {
  $m = [regex]::Match($text, '<meta\s+name=["'']description["'']\s+content=["''](.*?)["'']', 'IgnoreCase')
  if ($m.Success) { return $m.Groups[1].Value }
  return "Savingio 생활비·세금·지원금 가이드"
}

function Infer-Category([string]$name,[string]$title) {
  $s = ($name + " " + $title).ToLower()
  if ($s -match 'vat|tax|재산세|부가가치세|세금|환급') { return "세금·환급" }
  if ($s -match 'support|benefit|voucher|지원|장려금|급여|바우처') { return "지원금" }
  if ($s -match 'electric|aircon|water|heating|bill|에어컨|전기|수도|난방|통신') { return "생활비 절약" }
  if ($s -match 'card|credit|loan|bank|budget|saving|insurance|금융|카드|대출|보험|예산') { return "금융" }
  if ($s -match 'business|사업|소상공인') { return "소상공인" }
  return "생활정보"
}

$items = @()
Get-ChildItem $articles -Filter *.html | Where-Object { $_.Name -ne "index.html" } | Sort-Object Name | ForEach-Object {
  $text = Get-Content $_.FullName -Raw -Encoding UTF8
  $tm = [regex]::Match($text, '<title>(.*?)</title>', 'IgnoreCase')
  $title = if ($tm.Success) { ($tm.Groups[1].Value -replace '\s*\|\s*Savingio\s*$','').Trim() } else { $_.BaseName -replace '-',' ' }
  $desc = Get-MetaDescription $text
  $cat = Infer-Category $_.Name $title

  if ($koMap.ContainsKey($_.Name)) {
    $title = $koMap[$_.Name][0]
    $cat = $koMap[$_.Name][1]
    $newTitle = "<title>$title | Savingio</title>"
    if ($tm.Success) {
      $text = [regex]::Replace($text, '<title>.*?</title>', $newTitle, 'IgnoreCase')
      Set-Content $_.FullName $text -Encoding UTF8
    }
  }

  $items += [pscustomobject]@{
    file=$_.Name
    title=$title
    desc=$desc
    category=$cat
  }
}

$json = $items | ConvertTo-Json -Depth 3 -Compress
$count = $items.Count

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
*{box-sizing:border-box}body{margin:0;font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f7f9fc;color:#172033}a{text-decoration:none;color:inherit}
header{background:#fff;border-bottom:1px solid #e5e7eb}.nav{max-width:1160px;margin:auto;padding:18px 24px;display:flex;justify-content:space-between;align-items:center}.logo{font-size:26px;font-weight:900;color:#1463ff}
.hero{background:linear-gradient(135deg,#eef4ff,#fff);border-bottom:1px solid #e5e7eb}.hero-in{max-width:1160px;margin:auto;padding:58px 24px 46px}h1{font-size:clamp(34px,5vw,54px);margin:0 0 12px;letter-spacing:-1.5px}.hero p{color:#667085;font-size:18px}
main{max-width:1160px;margin:auto;padding:34px 24px 80px}.tools{background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:20px;margin-bottom:26px;box-shadow:0 8px 26px rgba(17,24,39,.05)}
.search{width:100%;padding:15px 18px;border:1px solid #d9e0ea;border-radius:13px;font-size:16px;outline:none}.search:focus{border-color:#1769ff;box-shadow:0 0 0 4px rgba(23,105,255,.1)}
.filters{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.filter{border:1px solid #d9e0ea;background:#fff;border-radius:999px;padding:9px 14px;cursor:pointer;font-weight:700;color:#475467}.filter.active{background:#1769ff;color:#fff;border-color:#1769ff}
.summary{display:flex;justify-content:space-between;align-items:center;margin:20px 0;color:#667085}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.card{display:flex;flex-direction:column;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:23px;min-height:225px;box-shadow:0 8px 24px rgba(17,24,39,.04);transition:.2s}.card:hover{transform:translateY(-3px);border-color:#9dbbff}
.badge{align-self:flex-start;background:#edf3ff;color:#1457c9;padding:5px 10px;border-radius:999px;font-size:12px;font-weight:800;margin-bottom:12px}.card h2{font-size:19px;line-height:1.45;margin:0 0 10px}.card p{font-size:14px;color:#667085;margin:0 0 18px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.more{margin-top:auto;color:#1463ff;font-weight:800}
.pagination{display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:34px}.page{border:1px solid #d9e0ea;background:#fff;border-radius:10px;padding:9px 13px;cursor:pointer}.page.active{background:#1769ff;color:#fff;border-color:#1769ff}.empty{display:none;text-align:center;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:50px;color:#667085}
@media(max-width:900px){.grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.grid{grid-template-columns:1fr}.nav a:last-child{display:none}}
</style>
</head>
<body>
<header><div class="nav"><a class="logo" href="/">Savingio</a><a href="/about.html">Savingio 소개</a></div></header>
<section class="hero"><div class="hero-in"><h1>돈이 되는 생활 정보</h1><p>세금·지원금·환급금·금융·생활비 절약 정보를 빠르게 찾아보세요.</p></div></section>
<main>
<div class="tools">
<input id="search" class="search" type="search" placeholder="검색어를 입력하세요. 예: 재산세, 에너지바우처, 환급금">
<div id="filters" class="filters"></div>
</div>
<div class="summary"><strong id="resultCount">전체 글 $count개</strong><span>한 페이지에 12개씩 표시</span></div>
<div id="grid" class="grid"></div>
<div id="empty" class="empty">검색 결과가 없습니다.</div>
<div id="pagination" class="pagination"></div>
</main>
<script>
const allItems = $json;
const PAGE_SIZE = 12;
let currentCategory = "전체";
let currentPage = 1;
let query = "";
const categories = ["전체", ...new Set(allItems.map(x=>x.category))];

function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function filtered(){
  const q=query.trim().toLowerCase();
  return allItems.filter(x => (currentCategory==="전체" || x.category===currentCategory) && (!q || (x.title+" "+x.desc+" "+x.category).toLowerCase().includes(q)));
}
function renderFilters(){
  document.getElementById("filters").innerHTML = categories.map(c=>`<button class="filter ${c===currentCategory?'active':''}" data-c="${esc(c)}">${esc(c)}</button>`).join("");
  document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{currentCategory=b.dataset.c;currentPage=1;render();});
}
function render(){
  renderFilters();
  const list=filtered(), pages=Math.max(1,Math.ceil(list.length/PAGE_SIZE));
  if(currentPage>pages) currentPage=pages;
  const start=(currentPage-1)*PAGE_SIZE, slice=list.slice(start,start+PAGE_SIZE);
  document.getElementById("resultCount").textContent = `검색 결과 ${list.length}개`;
  document.getElementById("grid").innerHTML = slice.map(x=>`<a class="card" href="/articles/${encodeURIComponent(x.file)}"><span class="badge">${esc(x.category)}</span><h2>${esc(x.title)}</h2><p>${esc(x.desc)}</p><span class="more">자세히 보기 →</span></a>`).join("");
  document.getElementById("empty").style.display = list.length ? "none":"block";
  let p="";
  if(pages>1){
    for(let i=1;i<=pages;i++) p+=`<button class="page ${i===currentPage?'active':''}" data-p="${i}">${i}</button>`;
  }
  document.getElementById("pagination").innerHTML=p;
  document.querySelectorAll(".page").forEach(b=>b.onclick=()=>{currentPage=Number(b.dataset.p);render();window.scrollTo({top:300,behavior:"smooth"});});
}
document.getElementById("search").addEventListener("input",e=>{query=e.target.value;currentPage=1;render();});
render();
</script>
</body>
</html>
"@

Set-Content (Join-Path $articles "index.html") $html -Encoding UTF8
Write-Host ""
Write-Host "완료: 한국어 제목 정리 + 검색창 + 카테고리 + 페이지네이션 적용" -ForegroundColor Green
Write-Host "전체 글: $count개"
Write-Host ""
Write-Host "이제 VS Code 터미널에서 git add ., commit, push 하세요."
Pause

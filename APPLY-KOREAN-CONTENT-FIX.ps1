$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$articles = Join-Path $root "articles"

if (-not (Test-Path (Join-Path $root ".git"))) {
  Write-Host "이 파일을 savingio-live 폴더 안에 넣고 실행하세요." -ForegroundColor Red
  Pause
  exit 1
}

$map = @{
  "ai-side-hustles-beginner.html" = @("초보자를 위한 AI 부업 시작 방법","과장된 기대 없이 현실적으로 시작할 수 있는 AI 부업 방법과 준비 순서를 정리했습니다.")
  "beginner-ai-side-hustles.html" = @("초보자를 위한 AI 활용 부업 가이드","초기 비용을 낮추고 작은 작업부터 시작하는 현실적인 AI 부업 아이디어를 소개합니다.")
  "bank-fees-to-avoid.html" = @("은행 수수료 아끼는 방법 총정리","계좌 유지비, 이체 수수료, ATM 수수료 등 피할 수 있는 은행 비용을 줄이는 방법입니다.")
  "beginner-budget-plan.html" = @("초보자를 위한 월간 예산 계획","복잡한 가계부 없이 수입과 고정비를 기준으로 월간 예산을 세우는 방법입니다.")
  "beginner-money-management.html" = @("처음 시작하는 돈 관리 방법","통장 관리와 지출 기록부터 시작하는 초보자용 돈 관리 기본 가이드입니다.")
  "budget-app-guide.html" = @("가계부 앱 활용 가이드","가계부 앱을 고를 때 확인할 기능과 꾸준히 사용하는 방법을 정리했습니다.")
  "automatic-payment-saving.html" = @("자동결제 내역으로 생활비 줄이기","자동결제 내역을 정리해 불필요한 구독과 반복 지출을 줄이는 방법입니다.")
  "bank-account-budgeting.html" = @("통장 나누기로 예산 관리하기","생활비와 저축, 비상금을 목적별 통장으로 나눠 관리하는 방법입니다.")
  "cancel-unused-subscriptions.html" = @("사용하지 않는 구독서비스 정리하기","정기결제 내역을 점검하고 사용하지 않는 구독서비스를 해지하는 방법입니다.")
  "card-points-cashback-guide.html" = @("카드 포인트와 캐시백 활용법","놓치기 쉬운 카드 포인트와 캐시백을 확인하고 생활비에 활용하는 방법입니다.")
  "cash-out-card-points.html" = @("카드 포인트 현금화 방법","여러 카드사에 흩어진 포인트를 조회하고 현금으로 바꾸는 절차를 정리했습니다.")
  "cashback-apps-guide.html" = @("캐시백 앱 활용 가이드","캐시백 앱을 사용할 때 적립 조건과 출금 기준, 개인정보 주의사항을 확인합니다.")
  "check-hidden-refunds.html" = @("미수령 환급금 조회 방법","여러 기관에 남아 있을 수 있는 미수령 환급금을 조회하는 방법입니다.")
  "credit-score-habits.html" = @("신용점수를 지키는 생활 습관","연체와 카드 사용률 등 신용점수에 영향을 주는 생활 습관을 정리했습니다.")
  "credit-score-tips.html" = @("신용점수 관리 방법","신용점수를 안정적으로 관리하기 위해 확인해야 할 기본 원칙을 소개합니다.")
  "debit-card-vs-credit-card.html" = @("체크카드와 신용카드 비교","소비 성향과 혜택, 연말정산 기준을 중심으로 체크카드와 신용카드를 비교합니다.")
  "earned-income-tax-credit-korea.html" = @("근로장려금 신청 가이드","근로장려금 신청 대상과 확인 방법, 지급 진행상황 조회 절차를 정리했습니다.")
  "electricity-bill-saving.html" = @("전기요금 절약 방법","가전제품 사용 습관을 점검하고 월 전기요금을 줄이는 실천 방법입니다.")
  "emergency-fund-guide.html" = @("비상금 마련 가이드","예상하지 못한 지출에 대비해 현실적인 비상금 목표를 세우는 방법입니다.")
  "energy-voucher-application.html" = @("에너지바우처 신청 방법","에너지바우처 지원 대상과 신청 절차, 사용 방법을 한 번에 확인합니다.")
  "government-benefits-warning.html" = @("정부지원금 조회 시 주의할 점","지원금 사칭과 개인정보 요구를 피하고 공식 채널에서 안전하게 조회하는 방법입니다.")
  "government24-benefit-check.html" = @("정부24에서 받을 수 있는 혜택 찾기","정부24와 혜택알리미를 활용해 나에게 맞는 지원제도를 찾는 방법입니다.")
  "grocery-bill-savings.html" = @("장보기 비용 절약 방법","식단 계획과 구매 목록을 활용해 불필요한 장보기 비용을 줄이는 방법입니다.")
  "grocery-saving-tips.html" = @("생활 속 식비 절약 습관","냉장고 관리와 장보기 루틴을 바꿔 식비를 줄이는 현실적인 방법입니다.")
  "health-insurance-refund.html" = @("건강보험 환급금 확인 방법","건강보험료 과오납과 본인부담상한액 환급 대상 여부를 확인하는 방법입니다.")
  "heating-bill-saving.html" = @("겨울철 난방비 절약 방법","보일러 설정과 실내 보온 습관을 조정해 난방비 부담을 줄이는 방법입니다.")
  "hidden-refund-check.html" = @("숨은 환급금 확인하기","놓치고 있던 환급금과 미수령 금액을 공식 사이트에서 확인하는 방법입니다.")
  "how-to-check-hidden-refunds.html" = @("숨은 돈 찾기 단계별 가이드","국세와 지방세, 보험, 통신비 등 숨은 환급금을 순서대로 확인합니다.")
  "how-to-lower-phone-bill.html" = @("휴대전화 요금 낮추는 방법","데이터 사용량과 부가서비스를 점검해 휴대전화 요금을 낮추는 방법입니다.")
  "how-to-save-electricity-bill.html" = @("전기요금을 낮추는 생활 습관","가전제품별 소비전력과 사용시간을 점검해 전기요금을 줄이는 방법입니다.")
  "impulse-buying-control.html" = @("충동구매를 줄이는 방법","구매 전 대기시간과 소비 기준을 활용해 충동구매를 줄이는 실천법입니다.")
  "internet-bill-discount.html" = @("인터넷 요금 할인받는 방법","약정과 결합할인, 부가서비스를 점검해 인터넷 요금을 낮추는 방법입니다.")
  "internet-bill-savings.html" = @("매달 인터넷 비용 줄이기","현재 인터넷 요금제를 비교하고 불필요한 비용을 줄이는 방법입니다.")
  "irs-tax-refund-status.html" = @("세금 환급 진행상태 확인 방법","세금 환급 신청 후 진행상태와 지급 여부를 확인하는 방법을 정리했습니다.")
  "local-tax-refund.html" = @("지방세 환급금 조회 방법","위택스에서 지방세 환급금을 조회하고 계좌로 신청하는 절차입니다.")
  "money-saving-habits.html" = @("돈이 모이는 생활 습관","작은 지출을 점검하고 저축을 자동화해 돈이 모이는 습관을 만드는 방법입니다.")
  "monthly-budget-planner.html" = @("월간 예산표 작성 방법","월급과 고정비, 변동비를 기준으로 현실적인 월간 예산표를 작성합니다.")
  "national-tax-refund.html" = @("국세 환급금 조회 방법","홈택스에서 국세 환급금과 미수령 환급액을 확인하는 방법입니다.")
  "online-income-ideas-for-beginners.html" = @("초보자를 위한 온라인 부업 아이디어","초기 비용이 적고 작은 작업부터 시작할 수 있는 온라인 부업 아이디어를 소개합니다.")
  "phone-bill-saving.html" = @("휴대전화 요금 절약 방법","요금제와 데이터 사용량, 부가서비스를 점검해 통신비를 줄이는 방법입니다.")
  "phone-bill-savings.html" = @("통신비 줄이는 실천 방법","휴대전화와 인터넷 결합, 선택약정, 알뜰폰 등을 활용해 통신비를 줄입니다.")
  "salary-management-guide.html" = @("월급 관리 가이드","월급일을 기준으로 생활비와 저축, 비상금을 나누는 관리 방법입니다.")
  "spending-habits-change.html" = @("소비 습관 바꾸는 방법","지출 기록과 구매 기준을 활용해 소비 습관을 현실적으로 바꾸는 방법입니다.")
  "subscription-saving.html" = @("정기구독 비용 절약 방법","정기구독 결제일과 사용 빈도를 점검해 고정비를 줄이는 방법입니다.")
  "water-bill-saving.html" = @("수도요금 절약 방법","누수 점검과 생활 습관 개선으로 수도요금을 줄이는 방법입니다.")
  "air-conditioner-electricity-saving.html" = @("에어컨 전기요금 절약 방법","에어컨을 효율적으로 사용해 냉방비와 여름철 전기요금을 줄이는 방법입니다.")
}

$changed = 0

foreach ($name in $map.Keys) {
  $path = Join-Path $articles $name
  if (-not (Test-Path $path)) { continue }

  $title = $map[$name][0]
  $desc = $map[$name][1]
  $text = Get-Content $path -Raw -Encoding UTF8

  $text = [regex]::Replace(
    $text,
    '<title>.*?</title>',
    "<title>$title | Savingio</title>",
    [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
  )

  if ($text -match '<meta\s+name=["'']description["'']') {
    $text = [regex]::Replace(
      $text,
      '<meta\s+name=["'']description["'']\s+content=["''].*?["'']\s*/?>',
      "<meta name=`"description`" content=`"$desc`">",
      [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )
  } else {
    $text = $text -replace '</head>', "<meta name=`"description`" content=`"$desc`">`r`n</head>"
  }

  $h1 = [regex]::Match($text, '<h1[^>]*>.*?</h1>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($h1.Success) {
    $text = [regex]::Replace(
      $text,
      '<h1[^>]*>.*?</h1>',
      "<h1>$title</h1>",
      [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )
  }

  Set-Content $path $text -Encoding UTF8
  $changed++
}

Write-Host ""
Write-Host "완료: 한국어 제목·설명·H1 $changed개 수정" -ForegroundColor Green
Write-Host ""
Write-Host "중요: 목록 페이지를 다시 만들려면 기존의 '1-최종목록복구-실행.bat'를 다시 실행하세요."
Write-Host "그다음 git add ., commit, push 하세요."
Write-Host ""
Pause

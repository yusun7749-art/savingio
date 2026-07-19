/* Savingio legacy compatibility loader.
 * Older article pages reference /js/savingio-brain-data.js.
 * Load the canonical data file synchronously before navigation initializes.
 */
(function () {
  if (!window.SAVINGIO_BRAIN_DATA) {
    document.write('<script src="/data/savingio-brain-data.js?v=12"><\/script>');
  }

  const normalizePath = (value) => String(value || '')
    .split('?')[0]
    .split('#')[0]
    .replace(/\.html$/, '')
    .replace(/\/$/, '');

  const commonLatest = [
    ['/articles/electricity-bill-saving.html', '전기세 줄이는 7가지 방법'],
    ['/articles/air-conditioner-electricity-saving.html', '여름철 에어컨 전기요금 절약'],
    ['/articles/automatic-payment-saving.html', '자동이체로 놓치는 비용 점검'],
    ['/articles/bank-fees-to-avoid.html', '피할 수 있는 은행 수수료'],
    ['/articles/check-hidden-refunds.html', '숨은 환급금 확인 방법']
  ];

  const commonExplore = [
    ['/categories/utility-bills.html', '전기·가스·수도요금'],
    ['/categories/insurance.html', '보험료와 환급'],
    ['/categories/banking.html', '은행·카드 수수료'],
    ['/categories/car-transport.html', '교통·자동차 유지비'],
    ['/categories/communication.html', '통신·구독비']
  ];

  const configs = {
    '/articles/check-hidden-refunds': {
      kicker: '환급금 · 정부지원',
      core: [['#types','환급금 종류'],['#official','공식 조회처'],['#steps','조회 순서'],['#documents','준비 자료'],['#warning','사기 주의'],['#faq','자주 묻는 질문']],
      related: [['/articles/health-insurance-overpayment-refund.html','건강보험 과납보험료 환급'],['/articles/card-points-cashback-guide.html','카드포인트 현금화'],['/articles/cash-out-card-points.html','카드포인트 현금 전환'],['/articles/government24-benefit-check.html','정부24에서 놓친 혜택 찾기']],
      official: ['환급 조회는 문자 링크가 아닌 공식 사이트에서 직접 확인하세요.','https://www.gov.kr','정부24 바로가기 →'],
      calculator: ['/calculators/','생활비 계산기','환급금과 고정지출을 함께 정리해 실제 절감 효과를 확인해 보세요.'],
      category: [['/categories/government-support.html','정부지원 전체'],['/articles/check-hidden-refunds.html','환급금 찾기'],['/articles/health-insurance-overpayment-refund.html','보험료 과오납 환급'],['/articles/government24-benefit-check.html','정부24 혜택 조회'],['/articles/basic-livelihood-discounts.html','생활 안정 지원']]
    },
    '/articles/cashback-apps-guide': {
      kicker: '카드 · 절약 앱',
      core: [['#compare','앱 비교'],['#conditions','적립 조건'],['#withdraw','출금 방법'],['#privacy','개인정보 확인'],['#checklist','선택 체크리스트'],['#faq','자주 묻는 질문']],
      related: [['/articles/card-points-cashback-guide.html','카드포인트 캐시백'],['/articles/cash-out-card-points.html','카드포인트 현금 전환'],['/articles/automatic-payment-saving.html','자동이체 비용 점검'],['/articles/bank-fees-to-avoid.html','은행 수수료 줄이기']],
      official: ['앱 설치 전 운영사, 개인정보 처리방침, 출금 기준을 공식 안내에서 확인하세요.','/articles/cashback-apps-guide.html#checklist','선택 기준 확인하기 →'],
      calculator: ['/calculators/','생활비 계산기','월 지출과 실제 캐시백 금액을 비교해 절약 효과를 계산해 보세요.'],
      category: [['/categories/banking.html','은행·카드 전체'],['/articles/card-points-cashback-guide.html','카드포인트'],['/articles/cashback-apps-guide.html','캐시백 앱'],['/articles/automatic-payment-saving.html','자동결제 점검'],['/articles/bank-fees-to-avoid.html','수수료 절약']]
    },
    '/articles/card-points-cashback-guide': {
      kicker: '카드 · 포인트',
      core: [['#check','포인트 조회'],['#convert','현금 전환'],['#expire','소멸 예정'],['#account','입금 계좌'],['#warning','주의사항'],['#faq','자주 묻는 질문']],
      related: [['/articles/cash-out-card-points.html','카드포인트 현금 전환'],['/articles/cashback-apps-guide.html','캐시백 앱 비교'],['/articles/automatic-payment-saving.html','자동이체 비용 점검'],['/articles/bank-fees-to-avoid.html','피할 수 있는 은행 수수료']],
      official: ['보유 포인트와 현금화 가능 여부는 카드사 또는 공식 통합조회 서비스에서 확인하세요.','https://www.cardpoint.or.kr','카드포인트 통합조회 →'],
      calculator: ['/calculators/','생활비 계산기','전환한 포인트를 월 생활비 절감액에 반영해 보세요.'],
      category: [['/categories/banking.html','은행·카드 전체'],['/articles/card-points-cashback-guide.html','카드포인트 현금화'],['/articles/cashback-apps-guide.html','캐시백 앱'],['/articles/automatic-payment-saving.html','자동결제 점검'],['/articles/bank-fees-to-avoid.html','은행 수수료']]
    },
    '/articles/cash-advance-vs-card-loan': {
      kicker: '카드대출 · 금융비용',
      core: [['#difference','현금서비스와 카드론 차이'],['#interest','이자와 수수료'],['#credit','신용점수 영향'],['#repayment','상환 순서'],['#alternative','대안 확인'],['#faq','자주 묻는 질문']],
      related: [['/articles/loan-interest-saving.html','대출이자 줄이는 방법'],['/articles/credit-score-management.html','신용점수 관리'],['/articles/bank-fees-to-avoid.html','은행 수수료 줄이기'],['/articles/automatic-payment-saving.html','자동이체 비용 점검']],
      official: ['대출 실행 전 실제 금리, 상환 방식, 중도상환 조건을 금융회사 공식 화면에서 확인하세요.','https://finlife.fss.or.kr','금융상품 비교하기 →'],
      calculator: ['/calculators/loan-payment.html','대출 상환 계산기','금액과 금리, 기간을 입력해 월 상환액과 총이자를 확인해 보세요.'],
      category: [['/categories/banking.html','은행·카드 전체'],['/articles/cash-advance-vs-card-loan.html','카드대출 비교'],['/articles/loan-interest-saving.html','대출이자 절약'],['/articles/credit-score-management.html','신용점수 관리'],['/articles/bank-fees-to-avoid.html','수수료 절약']]
    },
    '/articles/traffic-fine-check-payment-guide': {
      kicker: '교통 · 과태료',
      core: [['#difference','범칙금·과태료 차이'],['#check','조회 방법'],['#payment','납부 순서'],['#discount','사전납부 확인'],['#appeal','이의제기'],['#faq','자주 묻는 질문']],
      related: [['/articles/car-insurance-mileage-refund.html','마일리지 특약 환급'],['/articles/low-mileage-discount-check.html','저주행 특약 확인'],['/articles/car-maintenance-cost-saving.html','차량 유지비 절약'],['/articles/fuel-saving-driving-habits.html','주유비 아끼는 운전 습관']],
      official: ['교통 과태료와 범칙금은 경찰청 공식 조회 서비스에서 차량·운전자 정보를 확인하세요.','https://www.efine.go.kr','교통민원24 바로가기 →'],
      calculator: ['/calculators/','교통·자동차 계산기','월 차량 유지비와 과태료 지출을 함께 점검해 보세요.'],
      category: [['/categories/car-transport.html','교통·자동차 전체'],['/articles/traffic-fine-check-payment-guide.html','과태료·범칙금'],['/articles/car-maintenance-cost-saving.html','자동차 관리'],['/articles/car-insurance-mileage-refund.html','자동차보험'],['/articles/fuel-saving-driving-habits.html','교통·운전']]
    },
    '/articles/health-insurance-overpayment-refund': {
      kicker: '건강보험 · 환급',
      core: [['#reason','과납 발생 이유'],['#check','조회 방법'],['#apply','신청 순서'],['#documents','준비 자료'],['#missing','미지급 대응'],['#faq','자주 묻는 질문']],
      related: [['/articles/check-hidden-refunds.html','숨은 환급금 찾기'],['/articles/government24-benefit-check.html','정부24 혜택 조회'],['/articles/medical-expense-refund-guide.html','의료비 환급 확인'],['/articles/basic-livelihood-discounts.html','생활 안정 지원']],
      official: ['건강보험 과오납 환급금은 국민건강보험공단 공식 서비스에서 직접 조회하세요.','https://www.nhis.or.kr','건강보험공단 바로가기 →'],
      calculator: ['/calculators/','생활비 계산기','보험료 환급액과 월 의료비 부담을 함께 정리해 보세요.'],
      category: [['/categories/insurance.html','보험료와 환급'],['/articles/health-insurance-overpayment-refund.html','건강보험 환급'],['/articles/check-hidden-refunds.html','숨은 환급금'],['/articles/medical-expense-refund-guide.html','의료비 환급'],['/categories/government-support.html','정부지원 전체']]
    }
  };

  const listHtml = (items) => `<ul>${items.map(([href, title]) => `<li><a href="${href}">${title}</a></li>`).join('')}</ul>`;
  const section = (kicker, title, body) => `<section class="rail-section">${kicker ? `<span class="rail-kicker">${kicker}</span>` : ''}<h2>${title}</h2>${body}</section>`;

  const installRightRail = () => {
    const config = configs[normalizePath(location.pathname)];
    if (!config) return;
    const rail = document.querySelector('.right-rail');
    if (!rail) return;

    rail.innerHTML = [
      '<div id="savingio-brain-navigation"></div>',
      section(config.kicker, '이 글의 핵심', listHtml(config.core)),
      section('다음 행동', '관련 글', listHtml(config.related)),
      section('공식 확인', '공식 서비스에서 확인하기', `<p>${config.official[0]}</p><a class="rail-button" href="${config.official[1]}" target="_blank" rel="noopener noreferrer">${config.official[2]}</a>`),
      section('계산해 보기', config.calculator[1], `<p>${config.calculator[2]}</p><a class="rail-button" href="${config.calculator[0]}">계산기 바로가기 →</a>`),
      section('', '같은 카테고리', listHtml(config.category)),
      section('', '최신 생활비 절약 글', listHtml(commonLatest)),
      section('', '생활비 문제별 탐색', listHtml(commonExplore)),
      section('Savingio 안내', '정보가 달라졌나요?', '<p>제도와 수수료, 지급 기준은 바뀔 수 있습니다. 실제 안내와 다른 부분을 발견하면 알려주세요.</p><a href="/contact.html">오류 제보하기 →</a>')
    ].join('');
    rail.dataset.savingioRailDna = 'extended-v1';
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installRightRail, { once: true });
  } else {
    installRightRail();
  }
})();
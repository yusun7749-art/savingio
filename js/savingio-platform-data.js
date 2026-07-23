(function (global) {
  'use strict';

  function install() {
    const registry = global.SavingioPlatformRegistry;
    if (!registry) return false;

    registry.registerCalculators([
      {
        id: 'electricity-cost',
        title: '전기요금 계산기',
        url: '/calculators/electricity-cost.html',
        category: '생활비 절약',
        intents: ['전기요금', '전기세', '전력사용량', '에어컨'],
        keywords: ['kWh', '누진구간', '전기요금', '절전']
      },
      {
        id: 'salary-net-pay',
        title: '월급 실수령액 계산기',
        url: '/calculators/salary-net-pay.html',
        category: '직장·급여',
        intents: ['월급', '급여', '실수령액', '연봉'],
        keywords: ['세후월급', '공제', '4대보험']
      },
      {
        id: 'hourly-to-monthly',
        title: '시급 월급 환산 계산기',
        url: '/calculators/hourly-to-monthly.html',
        category: '직장·급여',
        intents: ['시급', '월급', '근로시간'],
        keywords: ['주휴수당', '월급환산', '근무시간']
      },
      {
        id: 'severance-pay',
        title: '퇴직금 계산기',
        url: '/calculators/severance-pay.html',
        category: '직장·급여',
        intents: ['퇴직금', '퇴사', '평균임금'],
        keywords: ['근속기간', '퇴직급여']
      },
      {
        id: 'loan-payment',
        title: '대출 상환액 계산기',
        url: '/calculators/loan-payment.html',
        category: '금융',
        intents: ['대출', '이자', '상환액', '원리금'],
        keywords: ['금리', '원금균등', '원리금균등']
      }
    ], { replace: true });

    global.dispatchEvent?.(new CustomEvent('savingio:platform-data-ready', {
      detail: { calculators: registry.getAll('calculators').length }
    }));
    return true;
  }

  if (!install()) global.addEventListener('savingio:registry-ready', install, { once: true });
})(window);


(function(){
  const tools = [
    ['퍼센트', '/calculators/percentage.html', '%'],
    ['환율', '/calculators/exchange-rate.html', 'FX'],
    ['실수령액', '/calculators/salary.html', '₩'],
    ['주휴수당', '/calculators/weekly-pay.html', '시'],
    ['퇴직금', '/calculators/severance.html', '퇴'],
    ['연차', '/calculators/annual-leave.html', '일'],
    ['부가세', '/calculators/vat.html', 'VAT'],
    ['대출이자', '/calculators/loan.html', '%']
  ];

  function toolRail(){
    if(document.querySelector('.sg-article-tools')) return;
    const rail=document.createElement('aside');
    rail.className='sg-article-tools';
    rail.innerHTML='<button class="sg-close" aria-label="닫기">×</button><h3>바로 계산하기</h3><nav>'+
      tools.map(x=>`<a href="${x[1]}"><span>${x[0]}</span><b>${x[2]}</b></a>`).join('')+
      '</nav>';
    document.body.appendChild(rail);

    const open=document.createElement('button');
    open.className='sg-tools-open';
    open.type='button';
    open.textContent='🧮 계산기';
    document.body.appendChild(open);

    rail.querySelector('.sg-close').addEventListener('click',()=>{
      rail.style.display='none'; open.style.display='block';
    });
    open.addEventListener('click',()=>{
      rail.style.display='block'; open.style.display='none';
    });
  }

  const relatedMap = {
    'percentage.html': [
      ['할인율 계산이 필요한 순간 6가지','/articles/impulse-buying-control.html'],
      ['부가세 포함·별도 금액 이해하기','/articles/vat-input-tax-deduction-2026.html'],
      ['카드 포인트와 캐시백 활용법','/articles/card-points-cashback-guide.html']
    ],
    'salary.html': [
      ['월급 관리 가이드','/articles/salary-management-guide.html'],
      ['신용점수를 지키는 생활 습관','/articles/credit-score-habits.html'],
      ['월간 예산표 작성 방법','/articles/monthly-budget-planner.html']
    ],
    'weekly-pay.html': [
      ['실업급여 신청 전 확인사항','/articles/unemployment-benefit-checklist.html'],
      ['근로장려금 지급일 확인 방법','/articles/earned-income-credit-payment.html'],
      ['월급 관리 가이드','/articles/salary-management-guide.html']
    ],
    'severance.html': [
      ['실업급여 신청 전 확인사항','/articles/unemployment-benefit-checklist.html'],
      ['국민연금 추가납부가 유리한 경우','/articles/national-pension-additional-payment.html'],
      ['비상금 마련 가이드','/articles/emergency-fund-guide.html']
    ],
    'annual-leave.html': [
      ['실업급여 구직활동 인정 기준','/articles/unemployment-benefit-job-search.html'],
      ['월급 관리 가이드','/articles/salary-management-guide.html'],
      ['근로장려금 신청 가이드','/articles/earned-income-tax-credit-korea.html']
    ],
    'vat.html': [
      ['부가가치세 신고 전 매출 누락 확인 방법','/articles/vat-sales-omission-check-2026.html'],
      ['매입세액 공제와 불공제 항목','/articles/vat-input-tax-deduction-2026.html'],
      ['부가가치세 무실적 신고 방법','/articles/vat-zero-sales-filing-2026.html']
    ],
    'loan.html': [
      ['신용점수 관리 방법','/articles/credit-score-management.html'],
      ['리볼빙 해지와 잔액 상환 방법','/articles/revolving-cancellation-payoff.html'],
      ['대출 중도상환수수료 확인 방법','/articles/loan-prepayment-fee-check.html']
    ]
  };

  function addRelated(){
    const name=location.pathname.split('/').pop();
    const items=relatedMap[name];
    if(!items || document.querySelector('.sg-related-content')) return;
    const section=document.createElement('section');
    section.className='sg-related-content';
    section.innerHTML=`<div class="sg-related-content-inner"><h2>계산 후 함께 보면 좋은 정보</h2><p>왜 이 계산이 필요한지, 실제 생활에서 어떻게 활용하는지 확인해 보세요.</p><div class="sg-related-grid">${items.map(x=>`<a href="${x[1]}">${x[0]}</a>`).join('')}</div></div>`;
    const footer=document.querySelector('footer');
    if(footer) footer.before(section); else document.body.appendChild(section);
  }

  const path=location.pathname;
  if(path.includes('/articles/') && !path.endsWith('/articles/') && !path.endsWith('/index.html')) toolRail();
  if(path.includes('/calculators/') && !path.endsWith('/calculators/') && !path.endsWith('/index.html')) addRelated();
})();

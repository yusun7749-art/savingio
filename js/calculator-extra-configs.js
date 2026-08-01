(function(){
  const won=v=>Math.round(v).toLocaleString('ko-KR')+'원';
  const num=(v,d=1)=>Number(v).toLocaleString('ko-KR',{maximumFractionDigits:d});
  const row=(label,value)=>[label,value];
  const configs=window.SAVINGIO_CALCULATORS=window.SAVINGIO_CALCULATORS||{};

  configs.hourly={
    title:'시급·월급 환산 계산기',description:'시급과 근무시간을 입력하면 예상 주급·월급·연봉을 계산합니다.',button:'예상 급여 확인하기',
    fields:[{id:'wage',label:'시급',type:'money',placeholder:'예: 10,320'},{id:'hours',label:'하루 근무시간',type:'number',step:.5,value:8},{id:'days',label:'주당 근무일',type:'number',min:1,max:7,value:5}],
    details:[{id:'holiday',label:'주휴수당 포함',type:'select',value:'yes',options:[['yes','포함'],['no','포함하지 않음']]}],
    notice:'월 환산액은 주당 근무시간과 평균 월 환산계수 4.345주를 사용한 참고 금액입니다.',official:['고용노동부 최저임금 확인','https://www.moel.go.kr/'],
    links:[['주휴수당 계산기','대상 여부와 금액 확인','/calculators/weekly-pay.html'],['급여 실수령액','공제 후 월급 확인','/calculators/salary.html']],
    calculate(v){if(v.wage<=0||v.hours<=0||v.days<=0)throw Error('시급과 근무시간을 입력해 주세요.');const weeklyHours=v.hours*v.days;const holidayHours=v.holiday==='yes'&&weeklyHours>=15?Math.min(8,weeklyHours/40*8):0;const weekly=v.wage*(weeklyHours+holidayHours);const monthly=weekly*4.345;return{label:'예상 월급',value:won(monthly),badge:holidayHours?'주휴 포함':'기본 환산',rows:[row('주간 근로시간',num(weeklyHours)+'시간'),row('예상 주급',won(weekly)),row('예상 월급',won(monthly)),row('예상 연봉',won(monthly*12))],explain:'입력한 시급과 근무시간을 기준으로 환산했습니다.'}}
  };

  configs.exchange={
    title:'환율 계산기',description:'외화 금액과 환율을 입력하면 원화 환산액과 수수료 반영 금액을 계산합니다.',button:'환산 금액 확인하기',
    fields:[{id:'foreign',label:'외화 금액',type:'number',step:.01,placeholder:'예: 100'},{id:'rate',label:'적용 환율(1외화당 원)',type:'number',step:.01,placeholder:'예: 1,380'}],
    details:[{id:'fee',label:'예상 수수료율(%)',type:'number',step:.1,value:0}],notice:'실제 적용 환율과 우대율은 금융기관·결제수단·거래 시점에 따라 달라집니다.',official:['서울외국환중개 환율 확인','https://www.smbs.biz/'],
    links:[['할인율 계산기','할인 전후 금액 확인','/calculators/discount.html'],['단가 계산기','수량별 가격 비교','/calculators/unit-converter.html']],
    calculate(v){if(v.foreign<=0||v.rate<=0)throw Error('외화 금액과 적용 환율을 입력해 주세요.');const base=v.foreign*v.rate,fee=base*(v.fee||0)/100,total=base+fee;return{label:'예상 원화 결제액',value:won(total),badge:'환율 기준',rows:[row('환전 기준 금액',won(base)),row('예상 수수료',won(fee)),row('수수료 포함',won(total))],explain:'직접 입력한 환율과 수수료율을 사용했습니다.'}}
  };

  configs.benefitScam={
    title:'지원금 문자 사기 위험 점검',description:'문자와 링크의 특징을 선택해 피싱 위험 신호를 빠르게 점검합니다.',button:'위험 신호 확인하기',
    fields:[{id:'link',label:'문자에 단축 링크가 있나요?',type:'select',value:'no',options:[['yes','예'],['no','아니요']]},{id:'money',label:'수수료·선입금을 요구하나요?',type:'select',value:'no',options:[['yes','예'],['no','아니요']]},{id:'urgent',label:'즉시 신청·계정 정지를 강조하나요?',type:'select',value:'no',options:[['yes','예'],['no','아니요']]}],notice:'이 도구는 위험 신호를 확인하는 참고용입니다. 의심되는 링크는 누르지 말고 해당 기관의 공식 앱이나 대표번호로 확인하세요.',official:['경찰청 사이버범죄 신고','https://ecrm.police.go.kr/'],links:[['지원금 문자 사기 구별법','확인 순서 보기','/articles/benefit-scam-warning-2026.html']],
    calculate(v){const score=[v.link,v.money,v.urgent].filter(x=>x==='yes').length;return{label:'발견된 위험 신호',value:score+'개',badge:score>=2?'위험 높음':score===1?'추가 확인':'낮음',rows:[row('단축 링크',v.link==='yes'?'있음':'없음'),row('금전 요구',v.money==='yes'?'있음':'없음'),row('긴급성 강조',v.urgent==='yes'?'있음':'없음')],explain:score?'링크를 누르지 말고 공식 채널에서 사실 여부를 확인하세요.':'위험 신호가 없더라도 발신번호만 믿지 말고 공식 채널에서 확인하세요.'}}
  };

  configs.carInsuranceRenewal={
    title:'자동차보험 갱신 점검도구',description:'갱신 전 확인할 할인·운전자 범위·특약 항목을 빠르게 점검합니다.',button:'갱신 점검 결과 보기',
    fields:[{id:'mileage',label:'마일리지 특약을 확인했나요?',type:'select',value:'no',options:[['yes','예'],['no','아니요']]},{id:'driver',label:'운전자 범위를 다시 확인했나요?',type:'select',value:'no',options:[['yes','예'],['no','아니요']]},{id:'discount',label:'자녀·안전장치 등 할인특약을 확인했나요?',type:'select',value:'no',options:[['yes','예'],['no','아니요']]}],notice:'보험료와 보장 범위는 보험사와 계약 조건에 따라 다릅니다. 가격만 비교하지 말고 보장 공백을 함께 확인하세요.',official:['보험다모아 확인','https://e-insmarket.or.kr/'],links:[['자동차보험 절약 가이드','갱신 순서 보기','/articles/car-insurance-saving.html']],
    calculate(v){const done=[v.mileage,v.driver,v.discount].filter(x=>x==='yes').length;return{label:'확인 완료 항목',value:done+'/3',badge:done===3?'점검 완료':'추가 확인',rows:[row('마일리지 특약',v.mileage==='yes'?'확인':'미확인'),row('운전자 범위',v.driver==='yes'?'확인':'미확인'),row('할인특약',v.discount==='yes'?'확인':'미확인')],explain:done===3?'기본 점검을 마쳤습니다. 최종 보장과 보험료를 비교하세요.':'미확인 항목을 갱신 전에 다시 점검하세요.'}}
  };

  configs.trafficFine={
    title:'교통 과태료·범칙금 대응 점검',description:'고지서 종류와 상태를 입력해 먼저 확인할 대응 순서를 정리합니다.',button:'확인 순서 보기',
    fields:[{id:'notice',label:'고지서 종류를 확인했나요?',type:'select',value:'unknown',options:[['fine','과태료'],['penalty','범칙금'],['unknown','모름']]},{id:'deadline',label:'납부기한이 지났나요?',type:'select',value:'no',options:[['yes','예'],['no','아니요']]},{id:'driver',label:'실제 운전자가 누구인지 확인했나요?',type:'select',value:'no',options:[['yes','예'],['no','아니요']]}],notice:'구체적인 처분과 이의절차는 고지기관과 사건 내용에 따라 달라집니다. 고지서의 발급기관과 납부기한을 우선 확인하세요.',official:['경찰청 교통민원24','https://www.efine.go.kr/'],links:[['과태료와 범칙금 차이','상세 안내 보기','/articles/traffic-fines-difference-guide.html']],
    calculate(v){let score=0;if(v.notice!=='unknown')score++;if(v.deadline==='no')score++;if(v.driver==='yes')score++;return{label:'확인 완료 항목',value:score+'/3',badge:v.deadline==='yes'?'기한 경과 확인':'점검 진행',rows:[row('고지서 종류',v.notice==='fine'?'과태료':v.notice==='penalty'?'범칙금':'미확인'),row('납부기한',v.deadline==='yes'?'경과':'기한 내'),row('실제 운전자',v.driver==='yes'?'확인':'미확인')],explain:v.deadline==='yes'?'발급기관에 가산금과 가능한 절차를 즉시 확인하세요.':'고지서 종류와 실제 운전자를 확인한 뒤 납부 또는 이의절차를 진행하세요.'}}
  };
})();

(()=>{
'use strict';
const VERSION='1.0.0';
const CALCULATORS=Object.freeze([
  {id:'electricity-cost',name:'전기요금 계산기',href:'/calculators/electricity-cost.html',terms:['전기요금','전기세','누진세','에어컨 전기']},
  {id:'salary-net-pay',name:'실수령액 계산기',href:'/calculators/salary-net-pay.html',terms:['실수령액','월급','연봉','급여']},
  {id:'hourly-to-monthly',name:'시급·월급 계산기',href:'/calculators/hourly-to-monthly.html',terms:['시급','주급','월급 환산','근로시간']},
  {id:'severance-pay',name:'퇴직금 계산기',href:'/calculators/severance-pay.html',terms:['퇴직금','퇴사','근속기간']},
  {id:'loan-payment',name:'대출 상환 계산기',href:'/calculators/loan-payment.html',terms:['대출','원리금','이자','상환액']}
]);
const normalize=value=>String(value??'').toLowerCase().normalize('NFKC').replace(/[^0-9a-z가-힣\s]/gi,' ').replace(/\s+/g,' ').trim();
function match(value,{limit=3}={}){
  const text=normalize(typeof value==='string'?value:[value?.title,value?.category,value?.keywords,(value?.exactQueries||[]).join(' ')].filter(Boolean).join(' '));
  return Object.freeze(CALCULATORS.map(calculator=>{
    let score=0;const matched=[];
    calculator.terms.forEach(term=>{const token=normalize(term);if(token&&text.includes(token)){score+=token.length*12;matched.push(term);}});
    if(text.includes('계산')&&matched.length)score+=40;
    return {...calculator,score,matched:Object.freeze(matched)};
  }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'ko')).slice(0,limit).map(Object.freeze));
}
function primary(value){return match(value,{limit:1})[0]||null;}
window.SavingioCalculatorRouter=Object.freeze({VERSION,CALCULATORS,match,primary});
})();
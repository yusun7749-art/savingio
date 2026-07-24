(()=>{
'use strict';
const VERSION='1.0.0';
const RULES=[
  {intent:'refund',patterns:['돌려받','환급','반환','받을 돈','과납'],terms:['환급','반환','과납','돌려받기']},
  {intent:'reduce-cost',patterns:['줄이고','아끼','절약','덜 내','낮추'],terms:['절약','할인','감면','비용 줄이기']},
  {intent:'calculate',patterns:['계산','얼마','예상','금액','요금'],terms:['계산기','예상 금액','요금 계산']},
  {intent:'apply',patterns:['신청','지원받','혜택받','접수'],terms:['신청 방법','지원 조건','대상 확인']},
  {intent:'check',patterns:['확인','조회','찾아','알아보'],terms:['확인 방법','조회 방법','체크']},
  {intent:'move-house',patterns:['이사','퇴거','전출','보증금'],terms:['이사 정산','관리비','보증금','장기수선충당금']},
  {intent:'employment',patterns:['퇴사','실업','월급','퇴직'],terms:['실업급여','퇴직금','급여','근로']}
];
const normalize=value=>String(value??'').toLowerCase().normalize('NFKC').replace(/\s+/g,' ').trim();
function analyze(query){
  const original=String(query??'').trim(),text=normalize(original),matched=[];
  RULES.forEach(rule=>{if(rule.patterns.some(pattern=>text.includes(normalize(pattern))))matched.push(rule);});
  const terms=[original];matched.forEach(rule=>terms.push(...rule.terms));
  return Object.freeze({query:original,intents:Object.freeze(matched.map(rule=>rule.intent)),expandedQuery:[...new Set(terms.filter(Boolean))].join(' '),confidence:matched.length?Math.min(1,0.45+matched.length*0.2):0});
}
function search(pipeline,query,category='전체'){
  const intent=analyze(query),ranked=pipeline.search(intent.expandedQuery,category);
  return Object.freeze({intent,results:ranked});
}
window.SavingioIntentEngine=Object.freeze({VERSION,RULES:Object.freeze(RULES),analyze,search});
})();
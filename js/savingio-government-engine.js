(()=>{
'use strict';
const VERSION='1.0.0';
const OFFICES=Object.freeze([
  {id:'hometax',name:'국세청 홈택스',url:'https://www.hometax.go.kr/',terms:['국세','소득세','종합소득세','부가세','연말정산','세금 환급','사업자']},
  {id:'wetax',name:'위택스',url:'https://www.wetax.go.kr/',terms:['지방세','자동차세','재산세','취득세','주민세','등록면허세']},
  {id:'nhis',name:'국민건강보험공단',url:'https://www.nhis.or.kr/',terms:['건강보험','보험료 과오납','본인부담상한','건강보험 환급','요양비']},
  {id:'nps',name:'국민연금공단',url:'https://www.nps.or.kr/',terms:['국민연금','노령연금','연금 예상액','반환일시금']},
  {id:'work24',name:'고용24',url:'https://www.work24.go.kr/',terms:['실업급여','고용보험','구직급여','육아휴직','출산휴가','직업훈련']},
  {id:'gov24',name:'정부24',url:'https://www.gov.kr/',terms:['정부지원','민원','보조금','지원금','증명서','전입신고']},
  {id:'bokjiro',name:'복지로',url:'https://www.bokjiro.go.kr/',terms:['복지','기초생활','아동수당','부모급여','차상위','복지서비스']},
  {id:'easylaw',name:'찾기쉬운 생활법령정보',url:'https://www.easylaw.go.kr/',terms:['법률','분쟁','계약','임대차','상속','교통법규']},
  {id:'car365',name:'자동차365',url:'https://www.car365.go.kr/',terms:['자동차 등록','중고차','차량 조회','자동차 검사','자동차 이력']},
  {id:'kotsa',name:'한국교통안전공단',url:'https://www.kotsa.or.kr/',terms:['자동차검사','교통안전','검사 예약','튜닝']}
]);
const normalize=value=>String(value??'').toLowerCase().normalize('NFKC').replace(/[^0-9a-z가-힣\s]/gi,' ').replace(/\s+/g,' ').trim();
function match(value,{limit=3}={}){
  const text=normalize(typeof value==='string'?value:[value?.title,value?.category,value?.large,value?.middle,value?.small,value?.keywords,(value?.exactQueries||[]).join(' ')].filter(Boolean).join(' '));
  return Object.freeze(OFFICES.map(office=>{
    let score=0;const matched=[];
    office.terms.forEach(term=>{const token=normalize(term);if(token&&text.includes(token)){score+=token.length*10;matched.push(term);}});
    if(text.includes(normalize(office.name)))score+=100;
    return {...office,score,matched:Object.freeze(matched)};
  }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'ko')).slice(0,limit).map(Object.freeze));
}
function primary(value){return match(value,{limit:1})[0]||null;}
window.SavingioGovernmentEngine=Object.freeze({VERSION,OFFICES,match,primary});
})();
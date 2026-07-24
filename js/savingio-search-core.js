(()=>{
'use strict';
const VERSION='1.1.0';
const CATEGORIES=['금융','생활비 절약','정부혜택','세금·환급','직장·급여','자동차·교통','연금·노후','아이·교육','주거','생활정보'];
const ALIASES={
  '누쉬':['누수'],'누쑤':['누수'],'누스':['누수'],'누슈':['누수'],
  '장기충당금':['장기수선충당금','장기수선','관리비','아파트'],
  '장충금':['장기수선충당금','장기수선','관리비','아파트'],
  '장기수선':['장기수선','장기수선충당금','관리비','아파트','이사','환급'],
  '전기':['전기','전기요금','전기세','누진세','에어컨'],
  '자동차':['자동차','차량','운전','교통'],
  '세금':['세금','국세','지방세','환급','홈택스','위택스'],
  '급여':['급여','월급','임금','연봉','시급','주휴수당','퇴직금'],
  '보험':['보험','보장','보험료'],
  '아이':['아이','어린이','아동','자녀','육아','교육']
};
const normalize=value=>String(value||'').toLowerCase().normalize('NFKC').replace(/\s+/g,' ').trim();
const compact=value=>normalize(value).replace(/[^0-9a-z가-힣]+/gi,'');
const asList=value=>Array.isArray(value)?value:(value==null||value===''?[]:String(value).split(','));
function terms(query){
  const base=normalize(query).split(/\s+/).map(compact).filter(Boolean), expanded=[];
  base.forEach(term=>{expanded.push(term);(ALIASES[term]||[]).forEach(item=>expanded.push(compact(item)));});
  return [...new Set(expanded)];
}
function score(record,query){
  if(!compact(query))return 1;
  const title=compact(record?.title),category=compact(record?.category),exact=compact(asList(record?.exactQueries||record?.exact).join(' ')),keywords=compact(record?.keywords||record?.search),desc=compact(record?.desc),href=compact(record?.href);
  let total=0,matched=false;
  for(const term of terms(query)){
    if(!term)continue;
    if(title===term){total+=100000;matched=true;}
    else if(title.startsWith(term)){total+=80000;matched=true;}
    else if(title.includes(term)){total+=60000;matched=true;}
    else if(exact.includes(term)){total+=30000;matched=true;}
    else if(keywords.includes(term)){total+=18000;matched=true;}
    else if(desc.includes(term)){total+=7000;matched=true;}
    else if(category===term||category.includes(term)){total+=3000;matched=true;}
    else if(href.includes(term)){total+=1000;matched=true;}
  }
  return matched?total:0;
}
function filter(records,{query='',category='전체'}={}){
  const safeCategory=CATEGORIES.includes(category)?category:'전체';
  return (Array.isArray(records)?records:[]).map((record,index)=>({record,index,score:score(record,query)}))
    .filter(item=>(!compact(query)||item.score>0)&&(safeCategory==='전체'||item.record.category===safeCategory))
    .sort((a,b)=>b.score-a.score||a.index-b.index);
}
function createPipeline(records){
  const source=Object.freeze([...(Array.isArray(records)?records:[])]);
  return Object.freeze({records:source,search(query,category='전체'){return filter(source,{query,category});},count(query,category='전체'){return filter(source,{query,category}).length;}});
}
window.SavingioSearchCore=Object.freeze({VERSION,CATEGORIES,normalize,compact,terms,score,filter,createPipeline});
})();
(()=>{
'use strict';
const VERSION='1.2.0';
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
const normalizeCache=new Map(),termsCache=new Map();
const normalize=value=>{
  const raw=String(value||'');
  if(normalizeCache.has(raw))return normalizeCache.get(raw);
  const result=raw.toLowerCase().normalize('NFKC').replace(/\s+/g,' ').trim();
  if(normalizeCache.size<2000)normalizeCache.set(raw,result);
  return result;
};
const compact=value=>normalize(value).replace(/[^0-9a-z가-힣]+/gi,'');
const asList=value=>Array.isArray(value)?value:(value==null||value===''?[]:String(value).split(','));
function terms(query){
  const key=normalize(query);
  if(termsCache.has(key))return termsCache.get(key);
  const base=key.split(/\s+/).map(compact).filter(Boolean),expanded=[];
  base.forEach(term=>{expanded.push(term);(ALIASES[term]||[]).forEach(item=>expanded.push(compact(item)));});
  const result=Object.freeze([...new Set(expanded)]);
  if(termsCache.size<300)termsCache.set(key,result);
  return result;
}
function indexRecord(record,index){
  return Object.freeze({
    record,index,
    title:compact(record?.title),
    category:compact(record?.category),
    categoryRaw:String(record?.category||''),
    exact:compact(asList(record?.exactQueries||record?.exact).join(' ')),
    keywords:compact(record?.keywords||record?.search),
    desc:compact(record?.desc||record?.description),
    href:compact(record?.href)
  });
}
function scoreIndexed(item,queryTerms,hasQuery){
  if(!hasQuery)return 1;
  let total=0,matched=false;
  for(const term of queryTerms){
    if(!term)continue;
    if(item.title===term){total+=100000;matched=true;}
    else if(item.title.startsWith(term)){total+=80000;matched=true;}
    else if(item.title.includes(term)){total+=60000;matched=true;}
    else if(item.exact.includes(term)){total+=30000;matched=true;}
    else if(item.keywords.includes(term)){total+=18000;matched=true;}
    else if(item.desc.includes(term)){total+=7000;matched=true;}
    else if(item.category===term||item.category.includes(term)){total+=3000;matched=true;}
    else if(item.href.includes(term)){total+=1000;matched=true;}
  }
  return matched?total:0;
}
function score(record,query){
  const queryKey=compact(query),item=indexRecord(record,0);
  return scoreIndexed(item,terms(query),Boolean(queryKey));
}
function runIndexed(indexed,{query='',category='전체'}={}){
  const safeCategory=CATEGORIES.includes(category)?category:'전체',queryKey=compact(query),queryTerms=terms(query);
  const result=[];
  for(const item of indexed){
    if(safeCategory!=='전체'&&item.categoryRaw!==safeCategory)continue;
    const itemScore=scoreIndexed(item,queryTerms,Boolean(queryKey));
    if(queryKey&&!itemScore)continue;
    result.push({record:item.record,index:item.index,score:itemScore});
  }
  result.sort((a,b)=>b.score-a.score||a.index-b.index);
  return result;
}
function filter(records,options={}){
  const source=Array.isArray(records)?records:[],indexed=source.map(indexRecord);
  return runIndexed(indexed,options);
}
function createPipeline(records){
  const source=Object.freeze([...(Array.isArray(records)?records:[])]),indexed=Object.freeze(source.map(indexRecord)),cache=new Map();
  const get=(query='',category='전체')=>{
    const safeCategory=CATEGORIES.includes(category)?category:'전체',key=`${normalize(query)}\u0000${safeCategory}`;
    if(cache.has(key))return cache.get(key);
    const result=Object.freeze(runIndexed(indexed,{query,category:safeCategory}));
    if(cache.size>=100)cache.delete(cache.keys().next().value);
    cache.set(key,result);
    return result;
  };
  return Object.freeze({
    records:source,
    search(query,category='전체'){return get(query,category);},
    count(query,category='전체'){return get(query,category).length;},
    clearCache(){cache.clear();},
    stats(){return Object.freeze({records:source.length,cachedQueries:cache.size,version:VERSION});}
  });
}
window.SavingioSearchCore=Object.freeze({VERSION,CATEGORIES,normalize,compact,terms,score,filter,createPipeline});
})();
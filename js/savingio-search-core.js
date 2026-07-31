(()=>{
'use strict';
const VERSION='1.3.0';
const CATEGORIES=['금융','생활비 절약','정부혜택','세금·환급','직장·급여','자동차·교통','연금·노후','아이·교육','주거','건강·의료','사업·자영업','여행·여가','생활정보'];
const ALIASES={
  '누쉬':['누수','물샘','천장누수','벽누수','누수보험','일상생활배상책임'],
  '누쑤':['누수','물샘','천장누수','벽누수'],
  '누스':['누수','물샘','천장누수','벽누수'],
  '누슈':['누수','물샘','천장누수','벽누수'],
  '물샘':['누수','천장누수','벽누수','배관누수'],
  '장기충당금':['장기수선충당금','장기수선','관리비','아파트','세입자환급'],
  '장충금':['장기수선충당금','장기수선','관리비','아파트','세입자환급'],
  '장기수선':['장기수선','장기수선충당금','관리비','아파트','이사','환급'],
  '관리비':['관리비','아파트관리비','장기수선충당금','공동주택','관리비절약'],
  '계약':['계약','임대차','전세','월세','계약해지','계약갱신','보증금','전입신고'],
  '전월세':['전세','월세','임대차','보증금','계약갱신','전입신고'],
  '전기':['전기','전기요금','전기세','누진세','에어컨','냉방비'],
  '전기세':['전기요금','전기세','누진세','전력사용량'],
  '자동차':['자동차','차량','운전','교통','자동차보험','자동차세'],
  '차보험':['자동차보험','자동차사고','보험처리','사고접수'],
  '자동차보험':['자동차보험','자동차사고','보험처리','사고접수','보험료할인','마일리지환급'],
  '사고보험':['자동차사고','자동차보험','보험처리','사고접수','대인대물'],
  '과태료':['과태료','범칙금','교통위반','벌점','주정차위반','속도위반'],
  '범칙금':['범칙금','과태료','교통위반','벌점','속도위반'],
  '세금':['세금','국세','지방세','환급','홈택스','위택스','세액공제'],
  '환급':['환급','돌려받는돈','미환급금','국세환급','지방세환급','건강보험환급','보험료환급','카드포인트'],
  '돌려받을돈':['환급','미환급금','국세환급','지방세환급','건강보험환급','보험료환급'],
  '급여':['급여','월급','임금','연봉','시급','주휴수당','퇴직금','급여명세서'],
  '월급':['급여','월급','임금','연봉','급여명세서','실수령액'],
  '보험':['보험','보장','보험료','실손보험','자동차보험','화재보험'],
  '아이':['아이','어린이','아동','자녀','육아','교육','돌봄'],
  '정부지원':['정부지원','정부혜택','지원금','보조금','복지','바우처','장려금'],
  '지원금':['정부지원','정부혜택','지원금','보조금','복지','바우처','장려금'],
  '카드포인트':['카드포인트','포인트현금화','포인트통합조회','캐시백','카드혜택'],
  '캐시백':['캐시백','카드포인트','카드혜택','전월실적','적립한도'],
  '리볼빙':['리볼빙','일부결제금액이월약정','카드대금','카드이자'],
  '퇴직금':['퇴직금','퇴직금계산','평균임금','퇴직연금','퇴직금지급기한'],
  '실업급여':['실업급여','구직급여','고용보험','실업인정','이직확인서']
};
const INTENTS={
  '누수':['누수','물샘','배관','천장','벽','보험'],
  '관리비':['관리비','장기수선','아파트','공동주택'],
  '계약':['계약','임대차','전세','월세','보증금','갱신','해지'],
  '자동차보험':['자동차보험','자동차사고','사고접수','보험처리','대인','대물'],
  '과태료':['과태료','범칙금','벌점','교통위반','주정차','속도위반'],
  '환급':['환급','미환급','돌려받','환급금','포인트현금화']
};
const normalizeCache=new Map(),termsCache=new Map();
const normalize=value=>{const raw=String(value||'');if(normalizeCache.has(raw))return normalizeCache.get(raw);const result=raw.toLowerCase().normalize('NFKC').replace(/\s+/g,' ').trim();if(normalizeCache.size<3000)normalizeCache.set(raw,result);return result;};
const compact=value=>normalize(value).replace(/[^0-9a-z가-힣]+/gi,'');
const asList=value=>Array.isArray(value)?value:(value==null||value===''?[]:String(value).split(','));
function levenshtein(a,b){if(a===b)return 0;if(!a)return b.length;if(!b)return a.length;if(Math.abs(a.length-b.length)>2)return 99;const prev=Array.from({length:b.length+1},(_,i)=>i),cur=new Array(b.length+1);for(let i=1;i<=a.length;i++){cur[0]=i;let rowMin=cur[0];for(let j=1;j<=b.length;j++){cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));rowMin=Math.min(rowMin,cur[j]);}if(rowMin>2)return 99;for(let j=0;j<=b.length;j++)prev[j]=cur[j];}return prev[b.length];}
function terms(query){const key=normalize(query);if(termsCache.has(key))return termsCache.get(key);const base=key.split(/\s+/).map(compact).filter(Boolean),expanded=[];base.forEach(term=>{expanded.push(term);(ALIASES[term]||[]).forEach(item=>expanded.push(compact(item)));});const joined=compact(key);if(joined&&!base.includes(joined)){expanded.unshift(joined);(ALIASES[joined]||[]).forEach(item=>expanded.push(compact(item)));}const result=Object.freeze([...new Set(expanded)]);if(termsCache.size<500)termsCache.set(key,result);return result;}
function indexRecord(record,index){const title=compact(record?.title),exact=compact(asList(record?.exactQueries||record?.exact).join(' ')),keywords=compact(record?.keywords||record?.search),desc=compact(record?.desc||record?.description),href=compact(record?.href),category=compact(record?.category);return Object.freeze({record,index,title,category,categoryRaw:String(record?.category||''),exact,keywords,desc,href,all:`${title} ${exact} ${keywords} ${desc} ${href} ${category}`});}
function fuzzyScore(field,term,weight){if(term.length<2||!field)return 0;if(field.includes(term))return weight;const tokens=field.split(/\s+/).filter(Boolean);for(const token of tokens){if(token.length<2)continue;const max=term.length<=4?1:2;if(levenshtein(token.slice(0,Math.max(token.length,term.length)),term)<=max)return Math.round(weight*.35);}return 0;}
function intentBoost(item,queryKey){let boost=0;for(const [intent,words] of Object.entries(INTENTS)){if(queryKey!==intent&&!ALIASES[intent]?.some(x=>compact(x)===queryKey))continue;const hay=`${item.title}${item.exact}${item.keywords}${item.desc}${item.href}`;let matched=0;for(const word of words)if(hay.includes(compact(word)))matched++;boost+=matched*12000;if(item.title.includes(intent))boost+=90000;}return boost;}
function scoreIndexed(item,queryTerms,hasQuery,queryKey){if(!hasQuery)return 1;let total=0,matched=false;for(const term of queryTerms){if(!term)continue;let part=0;if(item.title===term)part=120000;else if(item.title.startsWith(term))part=95000;else if(item.title.includes(term))part=70000;else if(item.exact.includes(term))part=42000;else if(item.keywords.includes(term))part=26000;else if(item.desc.includes(term))part=10000;else if(item.category===term||item.category.includes(term))part=5000;else if(item.href.includes(term))part=2500;else part=Math.max(fuzzyScore(item.title,term,50000),fuzzyScore(item.exact,term,24000),fuzzyScore(item.keywords,term,16000));if(part){total+=part;matched=true;}}if(!matched)return 0;return total+intentBoost(item,queryKey);}
function score(record,query){const queryKey=compact(query),item=indexRecord(record,0);return scoreIndexed(item,terms(query),Boolean(queryKey),queryKey);}
function runIndexed(indexed,{query='',category='전체'}={}){const safeCategory=CATEGORIES.includes(category)?category:'전체',queryKey=compact(query),queryTerms=terms(query),result=[];for(const item of indexed){if(safeCategory!=='전체'&&item.categoryRaw!==safeCategory)continue;const itemScore=scoreIndexed(item,queryTerms,Boolean(queryKey),queryKey);if(queryKey&&!itemScore)continue;result.push({record:item.record,index:item.index,score:itemScore});}result.sort((a,b)=>b.score-a.score||a.index-b.index);return result;}
function filter(records,options={}){const source=Array.isArray(records)?records:[],indexed=source.map(indexRecord);return runIndexed(indexed,options);}
function createPipeline(records){const source=Object.freeze([...(Array.isArray(records)?records:[])]),indexed=Object.freeze(source.map(indexRecord)),cache=new Map();const get=(query='',category='전체')=>{const safeCategory=CATEGORIES.includes(category)?category:'전체',key=`${normalize(query)}\u0000${safeCategory}`;if(cache.has(key))return cache.get(key);const result=Object.freeze(runIndexed(indexed,{query,category:safeCategory}));if(cache.size>=120)cache.delete(cache.keys().next().value);cache.set(key,result);return result;};return Object.freeze({records:source,search(query,category='전체'){return get(query,category);},count(query,category='전체'){return get(query,category).length;},clearCache(){cache.clear();},stats(){return Object.freeze({records:source.length,cachedQueries:cache.size,version:VERSION});}});}
window.SavingioSearchCore=Object.freeze({VERSION,CATEGORIES,normalize,compact,terms,score,filter,createPipeline});
})();
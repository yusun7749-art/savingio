(()=>{
'use strict';
const VERSION='1.2.0';
const BRAIN_URL='/data/savingio-brain-data.json';
const TREE_URL='/data/savingio-category-tree.json';
let cache=null;
const text=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:(value==null||value===''?[]:String(value).split(',').map(text).filter(Boolean));
const freezeRecords=records=>Object.freeze(records.map(record=>Object.freeze({...record,exactQueries:Object.freeze([...record.exactQueries])})));
async function json(url){const response=await fetch(`${url}?v=${VERSION}`,{cache:'no-store'});if(!response.ok)throw new Error(`Registry source failed: ${response.status} ${url}`);return response.json();}
const TITLE_RULES=[
  ['사업·자영업',['사업자','자영업','소상공인','폐업','개업','배달비','사업용','사업 비용','비용처리','경비처리','사업 통신비']],
  ['여행·여가',['휴가철','여름휴가','휴가 예산','여행자보험','여행자 보험','여행 준비','숙박','호텔','렌터카 여행']],
  ['자동차·교통',['렌터카','렌트카','자동차','차량','운전','교통','과태료','범칙금','주차','연비','주유','블랙박스']],
  ['연금·노후',['국민연금','노령연금','기초연금','연금 수급','연금 보험료','장기요양','노후']],
  ['주거',['반환보증','전세보증','임대차','전세','월세','누수','아파트','관리비','장기수선','보증금','전입','임대인','세입자']],
  ['정부혜택',['국민취업지원제도','차상위','저소득','정부지원','정부혜택','지원금','보조금','바우처','복지','장려금','감면']],
  ['세금·환급',['종합소득세','부가세','재산세','자동차세','연말정산','세금','국세','지방세','환급','홈택스','위택스','매입세액']],
  ['직장·급여',['실업급여','퇴직금','월급','급여','임금','연봉','시급','주휴수당','근로시간','초과수당','휴가비']],
  ['아이·교육',['아이','어린이','아동','자녀','육아','교육','학교','학원','돌봄']],
  ['건강·의료',['건강보험','병원','의료비','진료비','약값','건강검진','수면검사','비급여']],
  ['생활비 절약',['전기요금','전기세','수도요금','가스요금','난방비','통신비','에어컨','냉방비','구독','생활비','절약']],
  ['금융',['은행','신용카드','체크카드','카드 혜택','대출','계좌','통장','예금','적금','금리','이자','신용점수','금융상품','실손보험','보험료 자동이체']]
];
function titleCategory(title){const value=String(title||'').toLowerCase();for(const [label,terms] of TITLE_RULES){if(terms.some(term=>value.includes(term.toLowerCase())))return label;}return'';}
function categoryFor(item,middle,tree){
  const direct=titleCategory(item.title);
  if(direct)return direct;
  const haystack=`${item.title||''} ${item.description||''} ${item.search_keywords||''} ${(item.exact_queries||[]).join?.(' ')||''} ${middle||''}`.toLowerCase();
  const ranked=tree.categories.map(category=>{
    let score=0,matchedLength=0;
    for(const raw of category.keywords||[]){const keyword=String(raw||'').toLowerCase().trim();if(!keyword||!haystack.includes(keyword))continue;score+=keyword.length>=5?5:keyword.length>=3?3:1;matchedLength+=keyword.length;}
    return{category,score,matchedLength};
  }).filter(row=>row.score>0).sort((a,b)=>b.score-a.score||b.matchedLength-a.matchedLength||(a.category.order||999)-(b.category.order||999));
  if(ranked.length)return ranked[0].category.label;
  const labels=tree.categories.map(category=>category.label);
  return labels.includes(item.category)?item.category:'생활정보';
}
function flatten(brain,tree){const seenUrl=new Set(),seenTitle=new Set(),records=[],duplicates=[];Object.entries(brain.tree||{}).forEach(([large,middles])=>Object.entries(middles||{}).forEach(([middle,smalls])=>Object.entries(smalls||{}).forEach(([small,items])=>(items||[]).forEach((item,index)=>{const title=text(item.title),href=text(item.href);if(!title||!href)return;const duplicateUrl=seenUrl.has(href),duplicateTitle=seenTitle.has(title);if(duplicateUrl||duplicateTitle)duplicates.push({title,href,duplicateUrl,duplicateTitle});if(duplicateUrl)return;seenUrl.add(href);seenTitle.add(title);records.push({id:`SV-${String(records.length+1).padStart(4,'0')}`,title,href,type:text(item.type)||'article',status:'published',large,middle,small,category:categoryFor(item,middle,tree),description:text(item.description),keywords:text(item.search_keywords),exactQueries:list(item.exact_queries),order:index});}))));return{records,duplicates};}
async function load({force=false}={}){if(cache&&!force)return cache;const [brain,tree]=await Promise.all([json(BRAIN_URL),json(TREE_URL)]);const {records,duplicates}=flatten(brain,tree);cache=Object.freeze({version:VERSION,sourceVersion:text(brain.version),generatedAt:new Date().toISOString(),tree:Object.freeze(tree.categories.map(category=>Object.freeze({...category,keywords:Object.freeze([...category.keywords])}))),records:freezeRecords(records),duplicates:Object.freeze(duplicates.map(item=>Object.freeze(item)))});return cache;}
function fromCards(cards){const records=[...(cards||[])].map((card,index)=>Object.freeze({id:`DOM-${String(index+1).padStart(4,'0')}`,title:text(card.querySelector('h2')?.textContent),href:text(card.getAttribute('href')),type:'article',status:'published',large:'',middle:'',small:'',category:text(card.dataset.category||card.querySelector('.card-category')?.textContent)||'생활정보',description:text(card.querySelector('p')?.textContent),keywords:text(card.dataset.search),exactQueries:Object.freeze(list(card.dataset.exactSearch)),order:index,card}));return freezeRecords(records);}
window.SavingioArticleRegistry=Object.freeze({VERSION,load,fromCards,getCached:()=>cache});
})();
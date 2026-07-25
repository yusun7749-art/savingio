(()=>{
'use strict';
const VERSION='1.1.0';
const BRAIN_URL='/data/savingio-brain-data.json';
const TREE_URL='/data/savingio-category-tree.json';
let cache=null;
const text=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:(value==null||value===''?[]:String(value).split(',').map(text).filter(Boolean));
const freezeRecords=records=>Object.freeze(records.map(record=>Object.freeze({...record,exactQueries:Object.freeze([...record.exactQueries])})));
async function json(url){const response=await fetch(`${url}?v=${VERSION}`,{cache:'no-store'});if(!response.ok)throw new Error(`Registry source failed: ${response.status} ${url}`);return response.json();}
function categoryFor(item,middle,tree){
  const haystack=`${item.title||''} ${item.description||''} ${item.search_keywords||''} ${(item.exact_queries||[]).join?.(' ')||''} ${middle||''}`.toLowerCase();
  const ranked=tree.categories.map(category=>{
    let score=0,matchedLength=0;
    for(const raw of category.keywords||[]){
      const keyword=String(raw||'').toLowerCase().trim();
      if(!keyword||!haystack.includes(keyword))continue;
      score+=keyword.length>=5?4:keyword.length>=3?3:2;
      matchedLength+=keyword.length;
    }
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
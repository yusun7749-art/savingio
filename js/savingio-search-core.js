(function(global){
  'use strict';

  const normalize=value=>String(value||'').toLowerCase().replace(/[^0-9a-z가-힣]+/gi,'');
  const QUERY_ALIASES={
    '누쉬':'누수','누쑤':'누수','누스':'누수','누슈':'누수',
    '장기충당금':'장기수선충당금','장충금':'장기수선충당금'
  };
  const normalizeQuery=value=>QUERY_ALIASES[normalize(value)]||normalize(value);
  const asList=value=>Array.isArray(value)?value:(value==null||value===''?[]:String(value).split(','));
  const grams=value=>{
    const text=normalize(value),out=[];
    for(let i=0;i<text.length-1;i++)out.push(text.slice(i,i+2));
    return out;
  };
  const similarity=(left,right)=>{
    const a=grams(left),b=grams(right);
    if(!a.length||!b.length)return normalize(left)===normalize(right)?1:0;
    const pool=[...b];let hits=0;
    a.forEach(x=>{const i=pool.indexOf(x);if(i>=0){hits++;pool.splice(i,1)}});
    return 2*hits/(a.length+b.length);
  };

  function score(item,query){
    const q=normalizeQuery(query);
    if(!q)return 1;
    const title=normalize(item&&item.title);
    const keywords=normalize(item&&item.keywords);
    const exact=asList(item&&item.exactQueries).map(normalize).filter(Boolean);
    if(exact.includes(q))return 1000;
    if(title===q)return 900;
    if(title.startsWith(q))return 700;
    if(title.includes(q))return 600;
    if(keywords.includes(q))return 400;
    const fuzzy=Math.max(0,...[...exact,title].filter(Boolean).map(value=>similarity(value,q)));
    if(q.length>=2&&fuzzy>=.56)return 200+Math.round(fuzzy*100);
    const words=String(query||'').split(/\s+/).map(normalizeQuery).filter(Boolean);
    if(words.length&&words.every(word=>keywords.includes(word)))return 300;
    return 0;
  }

  global.SavingioSearchCore={normalize,normalizeQuery,similarity,score};
})(window);

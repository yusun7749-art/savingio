(() => {
  'use strict';

  const registry=window.SavingioV2Modules;
  const store=window.SavingioV2SearchConsoleStore;
  if(!registry||!store)throw new Error('Search Console Center dependencies are not loaded');

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const label=value=>({unverified:'미확인',verified:'확인 완료',warning:'주의',error:'오류'}[value]||String(value||'미확인'));
  const metric=(name,value)=>`<article class="metric"><span>${esc(name)}</span><strong>${esc(value)}</strong></article>`;
  const option=(value,current)=>`<option value="${value}"${value===current?' selected':''}>${label(value)}</option>`;
  const time=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'확인 전':date.toLocaleString('ko-KR');};

  function history(items){
    if(!items.length)return '<div class="empty">저장된 확인 이력이 없습니다.</div>';
    return `<div class="connection-list">${[...items].reverse().map(item=>`<div><span>${esc(item.event)}<small class="meta">${esc(time(item.at))}${item.note?` · ${esc(item.note)}`:''}</small></span><strong>기록</strong></div>`).join('')}</div>`;
  }

  function select(name,current){return `<label><span>${esc(name)}</span><select name="${esc(name)}">${store.states.map(value=>option(value,current)).join('')}</select></label>`;}

  registry.register({
    id:'tool-search-console',
    title:'Search Console 센터',
    render(){
      const data=store.read();
      return `<section class="view" data-module-root><header class="hero"><p>SEARCH CONSOLE CENTER</p><h2>Search Console 센터</h2><p>Savingio의 색인·사이트맵·URL 검사·크롤링 상태를 운영자가 확인하고 기록합니다. Google API 연결 전에는 임의의 수치나 성공 상태를 만들지 않습니다.</p></header><div class="metrics">${metric('속성',data.property)}${metric('연결',label(data.connection))}${metric('사이트맵',label(data.sitemap))}${metric('URL 검사',label(data.urlInspection))}${metric('색인',label(data.indexing))}${metric('최근 확인',time(data.lastChecked))}</div><section class="panel"><h3>Search Console 상태 입력</h3><form id="searchConsoleForm"><div class="connection-list">${select('connection',data.connection)}${select('sitemap',data.sitemap)}${select('urlInspection',data.urlInspection)}${select('indexing',data.indexing)}${select('crawl',data.crawl)}<label><span>색인된 페이지</span><input name="indexedPages" type="number" min="0" value="${data.indexedPages??''}" placeholder="확인한 값만 입력"></label><label><span>제외된 페이지</span><input name="excludedPages" type="number" min="0" value="${data.excludedPages??''}" placeholder="확인한 값만 입력"></label><label><span>확인 메모</span><input name="note" maxlength="240" value="${esc(data.note)}"></label></div><div class="header-actions"><button class="button" type="submit">확인 상태 저장</button><button class="button secondary" type="button" data-search-console-action="reset">기록 초기화</button></div></form></section><section class="panel"><h3>현재 점검표</h3><div class="connection-list"><div><span>Google Search Console 속성</span><strong>${esc(label(data.connection))}</strong></div><div><span>sitemap.xml 제출·처리</span><strong>${esc(label(data.sitemap))}</strong></div><div><span>대표 URL 검사</span><strong>${esc(label(data.urlInspection))}</strong></div><div><span>페이지 색인 현황</span><strong>${esc(label(data.indexing))}${data.indexedPages===null?'':` · ${data.indexedPages}개`}</strong></div><div><span>제외 페이지</span><strong>${data.excludedPages===null?'미입력':`${data.excludedPages}개`}</strong></div><div><span>크롤링 문제</span><strong>${esc(label(data.crawl))}</strong></div><div><span>외부 API 연결</span><strong>미연결</strong></div><div><span>허위 데이터 생성 방지</span><strong>LOCK</strong></div></div></section><section class="panel"><h3>최근 확인 이력</h3>${history(data.history)}</section></section>`;
    }
  });

  document.addEventListener('submit',event=>{
    const form=event.target.closest('#searchConsoleForm');
    if(!form)return;
    event.preventDefault();
    const data=new FormData(form);
    const number=name=>{const raw=String(data.get(name)||'').trim();return raw===''?null:Number(raw);};
    store.write({connection:data.get('connection'),sitemap:data.get('sitemap'),urlInspection:data.get('urlInspection'),indexing:data.get('indexing'),crawl:data.get('crawl'),indexedPages:number('indexedPages'),excludedPages:number('excludedPages'),note:String(data.get('note')||'').trim()||'운영자 확인'},'Search Console 상태 저장');
  });
  document.addEventListener('click',event=>{
    const target=event.target.closest('[data-search-console-action="reset"]');
    if(!target)return;
    event.preventDefault();
    if(confirm('Search Console 운영 기록을 초기화하시겠습니까?'))store.reset();
  });
})();
(() => {
  'use strict';

  const registry=window.SavingioV2Modules;
  const store=window.SavingioV2RevenueInventoryStore;
  const workflow=window.SavingioV2WorkflowEngine;
  if(!registry||!store||!workflow)throw new Error('Revenue Center dependency is not loaded');

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money=value=>`${Number(value||0).toLocaleString('ko-KR')}원`;
  const time=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?String(value||''):date.toLocaleString('ko-KR');};
  const channelLabel=value=>({adsense:'AdSense',affiliate:'제휴',sponsorship:'협찬',product:'상품',other:'기타'}[value]||value);
  const statusLabel=value=>store.statusLabels[value]||value;
  const option=(value,label,current)=>`<option value="${esc(value)}"${value===current?' selected':''}>${esc(label)}</option>`;

  function form(item={}){
    return `<form class="panel" data-revenue-form><h3>${item.id?'수익 기록 수정':'수익 기록 등록'}</h3><input type="hidden" name="id" value="${esc(item.id||'')}"><div class="form-grid"><label>제목<input name="title" required value="${esc(item.title||'')}"></label><label>페이지 URL<input name="url" value="${esc(item.url||'')}"></label><label>채널<select name="channel">${store.channels.map(key=>option(key,channelLabel(key),item.channel||'adsense')).join('')}</select></label><label>상태<select name="status">${store.statuses.map(key=>option(key,statusLabel(key),item.status||'unverified')).join('')}</select></label><label>기간<input name="period" placeholder="2026-07" value="${esc(item.period||'')}"></label><label>통화<input name="currency" value="${esc(item.currency||'KRW')}"></label><label>추정 수익<input name="estimatedRevenue" type="number" min="0" value="${Number(item.estimatedRevenue||0)}"></label><label>확정 수익<input name="confirmedRevenue" type="number" min="0" value="${Number(item.confirmedRevenue||0)}"></label><label>정산 완료액<input name="settledRevenue" type="number" min="0" value="${Number(item.settledRevenue||0)}"></label><label>클릭<input name="clicks" type="number" min="0" value="${Number(item.clicks||0)}"></label><label>전환<input name="conversions" type="number" min="0" value="${Number(item.conversions||0)}"></label><label>출처<input name="source" value="${esc(item.source||'manual')}"></label></div><label>메모<textarea name="note">${esc(item.note||'')}</textarea></label><div class="header-actions"><button class="button" type="submit">저장</button>${item.id?'<button class="button secondary" type="button" data-revenue-cancel>취소</button>':''}</div></form>`;
  }

  function rows(items){
    if(!items.length)return '<div class="empty">조건에 맞는 수익 기록이 없습니다.</div>';
    return `<div class="project-list">${items.map(item=>`<article class="project-card"><div class="project-top"><div><div class="project-title">${esc(item.title)}</div><div class="meta">${esc(channelLabel(item.channel))} · ${esc(item.period||'기간 미입력')} · ${esc(item.source)}</div></div><span class="status ${esc(item.status)}">${esc(statusLabel(item.status))}</span></div><div class="connection-list"><div><span>추정 수익</span><strong>${money(item.estimatedRevenue)}</strong></div><div><span>확정 수익</span><strong>${money(item.confirmedRevenue)}</strong></div><div><span>정산 완료</span><strong>${money(item.settledRevenue)}</strong></div><div><span>클릭 / 전환</span><strong>${item.clicks.toLocaleString('ko-KR')} / ${item.conversions.toLocaleString('ko-KR')}</strong></div></div><div class="meta">${esc(item.url||'페이지 미지정')} · 최근 갱신 ${esc(time(item.updatedAt))}${item.note?` · ${esc(item.note)}`:''}</div><div class="header-actions">${item.url?`<a class="button secondary" href="${esc(item.url)}" target="_blank" rel="noopener">페이지 열기</a>`:''}<button class="button secondary" type="button" data-revenue-edit="${esc(item.id)}">수정</button><button class="button secondary" type="button" data-revenue-workflow="${esc(item.id)}">수익 점검</button><button class="button secondary" type="button" data-revenue-delete="${esc(item.id)}">삭제</button></div></article>`).join('')}</div>`;
  }

  function render(){
    const items=store.query();
    const summary=store.summary(items);
    return `<section class="view" data-module-root><header class="hero"><p>REVENUE CENTER</p><h2>수익 센터</h2><p>AdSense·제휴·협찬·상품 수익을 페이지와 기간별로 관리합니다. 추정·확정·정산 완료 금액을 분리하여 허위 수익을 방지합니다.</p></header><div class="metrics"><article class="metric"><span>전체 기록</span><strong>${summary.total}건</strong></article><article class="metric"><span>추정 수익</span><strong>${money(summary.estimatedRevenue)}</strong></article><article class="metric"><span>확정 수익</span><strong>${money(summary.confirmedRevenue)}</strong></article><article class="metric"><span>정산 완료</span><strong>${money(summary.settledRevenue)}</strong></article><article class="metric"><span>전환</span><strong>${summary.conversions.toLocaleString('ko-KR')}건</strong></article></div><section class="panel"><h3>검색·필터</h3><form data-revenue-filter class="form-grid"><label>검색<input name="keyword" placeholder="제목·URL·기간·출처·메모"></label><label>채널<select name="channel"><option value="">전체</option>${store.channels.map(key=>option(key,channelLabel(key),'')).join('')}</select></label><label>상태<select name="status"><option value="">전체</option>${store.statuses.map(key=>option(key,statusLabel(key),'')).join('')}</select></label><div class="header-actions"><button class="button" type="submit">적용</button><button class="button secondary" type="reset">초기화</button></div></form></section><div data-revenue-editor>${form()}</div><section class="panel"><h3>수익 기록</h3><div data-revenue-list>${rows(items)}</div></section><section class="panel"><h3>수익 진실성 LOCK</h3><div class="connection-list"><div><span>추정 수익</span><strong>확정 수익과 분리</strong></div><div><span>확정 수익</span><strong>외부 화면 확인 후 입력</strong></div><div><span>정산 완료액</span><strong>실제 지급·정산 확인 후 입력</strong></div><div><span>자동 임의 수익 생성</span><strong>금지</strong></div></div></section></section>`;
  }

  registry.register({id:'dept-revenue',title:'수익 센터',render});

  document.addEventListener('submit',event=>{
    if(event.target.matches('[data-revenue-form]')){
      event.preventDefault();
      const data=Object.fromEntries(new FormData(event.target));
      store.upsert(data);
      window.SavingioAdminV2?.mount?.('dept-revenue','replace');
    }
    if(event.target.matches('[data-revenue-filter]')){
      event.preventDefault();
      const filters=Object.fromEntries(new FormData(event.target));
      const root=event.target.closest('[data-module-root]');
      const list=root?.querySelector('[data-revenue-list]');
      if(list)list.innerHTML=rows(store.query(filters));
    }
  });

  document.addEventListener('reset',event=>{
    if(event.target.matches('[data-revenue-filter]'))setTimeout(()=>{const root=event.target.closest('[data-module-root]');const list=root?.querySelector('[data-revenue-list]');if(list)list.innerHTML=rows(store.query());},0);
  });

  document.addEventListener('click',event=>{
    const edit=event.target.closest('[data-revenue-edit]');
    const remove=event.target.closest('[data-revenue-delete]');
    const work=event.target.closest('[data-revenue-workflow]');
    const cancel=event.target.closest('[data-revenue-cancel]');
    if(edit){const item=store.get(edit.dataset.revenueEdit);const root=edit.closest('[data-module-root]');const editor=root?.querySelector('[data-revenue-editor]');if(item&&editor){editor.innerHTML=form(item);editor.scrollIntoView({behavior:'smooth',block:'start'});}return;}
    if(remove){if(confirm('이 수익 기록을 삭제하시겠습니까?')){store.remove(remove.dataset.revenueDelete);window.SavingioAdminV2?.mount?.('dept-revenue','replace');}return;}
    if(work){const item=store.get(work.dataset.revenueWorkflow);if(item){workflow.create({title:`수익 점검 · ${item.title}`,projectId:item.id,stage:'revenue',priority:'high'});window.SavingioAdminV2?.mount?.('dept-revenue','replace');}return;}
    if(cancel){window.SavingioAdminV2?.mount?.('dept-revenue','replace');}
  });
})();
(() => {
  'use strict';

  const registry=window.SavingioV2Modules;
  const store=window.SavingioV2SeoInventoryStore;
  const workflow=window.SavingioV2WorkflowEngine;
  if(!registry||!store||!workflow)throw new Error('SEO Operations Center dependencies are not loaded');

  const INDEX_LABELS=Object.freeze({unknown:'미확인',requested:'색인 요청',indexed:'색인됨',excluded:'제외됨',error:'오류'});
  const PRIORITY_LABELS=Object.freeze({low:'낮음',normal:'보통',high:'높음',urgent:'긴급'});
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const time=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?String(value||''):date.toLocaleString('ko-KR');};

  function options(values,labels,current=''){
    return ['<option value="">전체</option>',...values.map(value=>`<option value="${esc(value)}"${value===current?' selected':''}>${esc(labels[value]||value)}</option>`)].join('');
  }

  function editOptions(values,labels,current){
    return values.map(value=>`<option value="${esc(value)}"${value===current?' selected':''}>${esc(labels[value]||value)}</option>`).join('');
  }

  function form(item={}){
    const id=item.id||'';
    const checked=name=>item[name]?' checked':'';
    return `<section class="panel"><h3>${id?'SEO 항목 수정':'SEO 항목 등록'}</h3><form id="seoInventoryForm"><input type="hidden" name="id" value="${esc(id)}"><div class="connection-list"><label><span>페이지 제목</span><input name="title" required maxlength="140" value="${esc(item.title||'')}" placeholder="예: 전기요금 절약 가이드"></label><label><span>URL</span><input name="url" required maxlength="220" value="${esc(item.url||'')}" placeholder="/articles/example"></label><label><span>색인 상태</span><select name="indexState">${editOptions(store.indexStates,INDEX_LABELS,item.indexState||'unknown')}</select></label><label><span>우선순위</span><select name="priority">${editOptions(store.priorities,PRIORITY_LABELS,item.priority||'normal')}</select></label><label><span>내부링크 수</span><input name="internalLinks" type="number" min="0" max="999" value="${esc(item.internalLinks??0)}"></label><label><span>운영 메모</span><input name="note" maxlength="240" value="${esc(item.note||'')}" placeholder="색인 제외 원인 또는 수정사항"></label></div><div class="connection-list"><label><span>Meta title</span><input type="checkbox" name="metaTitle"${checked('metaTitle')}></label><label><span>Meta description</span><input type="checkbox" name="metaDescription"${checked('metaDescription')}></label><label><span>Canonical</span><input type="checkbox" name="canonical"${checked('canonical')}></label><label><span>구조화 데이터</span><input type="checkbox" name="schema"${checked('schema')}></label></div><div class="header-actions"><button class="button" type="submit">저장</button>${id?'<button class="button secondary" type="button" data-seo-cancel>취소</button>':''}</div></form></section>`;
  }

  function cards(items){
    if(!items.length)return '<div class="panel empty">조건에 맞는 SEO 항목이 없습니다.</div>';
    return `<div class="project-list">${items.map(item=>`<article class="project-card"><div class="project-top"><div><div class="project-title">${esc(item.title)}</div><div class="meta">${esc(item.url)} · 갱신 ${esc(time(item.updatedAt))}</div></div><span class="status ${item.indexState==='indexed'?'done':item.indexState==='error'||item.indexState==='excluded'?'error':'pending'}">${esc(INDEX_LABELS[item.indexState])}</span></div><div class="progress"><i style="width:${item.score}%"></i></div><div class="meta">SEO 점수 ${item.score}점 · 내부링크 ${item.internalLinks}개 · 우선순위 ${esc(PRIORITY_LABELS[item.priority])}</div><div class="connection-list"><div><span>Meta title</span><strong>${item.metaTitle?'PASS':'FIX'}</strong></div><div><span>Meta description</span><strong>${item.metaDescription?'PASS':'FIX'}</strong></div><div><span>Canonical</span><strong>${item.canonical?'PASS':'FIX'}</strong></div><div><span>구조화 데이터</span><strong>${item.schema?'PASS':'FIX'}</strong></div></div>${item.note?`<p class="meta">${esc(item.note)}</p>`:''}<div class="header-actions"><button class="button secondary" type="button" data-seo-edit="${esc(item.id)}">수정</button><button class="button secondary" type="button" data-seo-workflow="${esc(item.id)}">SEO 재검사 작업</button>${item.url?`<a class="button secondary" href="${esc(item.url)}" target="_blank" rel="noopener">페이지 열기</a>`:''}<button class="button secondary" type="button" data-seo-delete="${esc(item.id)}">삭제</button></div></article>`).join('')}</div>`;
  }

  function render(){
    const params=new URLSearchParams(location.search);
    const keyword=params.get('seoKeyword')||'';
    const indexState=params.get('seoIndexState')||'';
    const priority=params.get('seoPriority')||'';
    const editId=params.get('seoEdit')||'';
    const items=store.query({keyword,indexState,priority});
    const summary=store.summary(store.readAll());
    const editing=editId?store.get(editId):null;
    return `<section class="view" data-module-root><header class="hero"><p>SEO OPERATIONS</p><h2>SEO 운영 센터</h2><p>URL별 색인 상태, 메타데이터, Canonical, 구조화 데이터, 내부링크와 우선순위를 관리합니다. 외부 Search Console 결과는 확인된 값만 직접 기록합니다.</p></header><div class="metrics"><article class="metric"><span>전체 URL</span><strong>${summary.total}건</strong></article><article class="metric"><span>색인됨</span><strong>${summary.indexed}건</strong></article><article class="metric"><span>제외·오류</span><strong>${summary.excluded}건</strong></article><article class="metric"><span>수정 필요</span><strong>${summary.incomplete}건</strong></article><article class="metric"><span>평균 점수</span><strong>${summary.average}점</strong></article></div>${form(editing||{})}<section class="panel"><h3>검색·필터</h3><form id="seoFilterForm"><div class="connection-list"><label><span>검색어</span><input name="keyword" value="${esc(keyword)}" placeholder="제목·URL·메모"></label><label><span>색인 상태</span><select name="indexState">${options(store.indexStates,INDEX_LABELS,indexState)}</select></label><label><span>우선순위</span><select name="priority">${options(store.priorities,PRIORITY_LABELS,priority)}</select></label></div><div class="header-actions"><button class="button" type="submit">검색</button><button class="button secondary" type="button" data-seo-reset>초기화</button></div></form></section><section class="panel"><h3>SEO 인벤토리 ${items.length}건</h3>${cards(items)}</section></section>`;
  }

  registry.register({id:'dept-seo',title:'SEO',render});

  document.addEventListener('submit',event=>{
    if(event.target.id==='seoInventoryForm'){
      event.preventDefault();
      const data=Object.fromEntries(new FormData(event.target).entries());
      data.metaTitle=event.target.metaTitle.checked;
      data.metaDescription=event.target.metaDescription.checked;
      data.canonical=event.target.canonical.checked;
      data.schema=event.target.schema.checked;
      store.upsert(data);
      const url=new URL(location.href);url.searchParams.delete('seoEdit');history.replaceState({},'',url.pathname+url.search);window.SavingioAdminV2?.mount?.('dept-seo','replace');
    }
    if(event.target.id==='seoFilterForm'){
      event.preventDefault();
      const data=Object.fromEntries(new FormData(event.target).entries());
      const url=new URL(location.href);
      [['seoKeyword',data.keyword],['seoIndexState',data.indexState],['seoPriority',data.priority]].forEach(([key,value])=>value?url.searchParams.set(key,value):url.searchParams.delete(key));
      history.replaceState({},'',url.pathname+url.search);window.SavingioAdminV2?.mount?.('dept-seo','none');
    }
  });

  document.addEventListener('click',event=>{
    const edit=event.target.closest('[data-seo-edit]');
    const remove=event.target.closest('[data-seo-delete]');
    const workflowButton=event.target.closest('[data-seo-workflow]');
    if(edit){const url=new URL(location.href);url.searchParams.set('seoEdit',edit.dataset.seoEdit);history.replaceState({},'',url.pathname+url.search);window.SavingioAdminV2?.mount?.('dept-seo','none');return;}
    if(event.target.closest('[data-seo-cancel]')){const url=new URL(location.href);url.searchParams.delete('seoEdit');history.replaceState({},'',url.pathname+url.search);window.SavingioAdminV2?.mount?.('dept-seo','none');return;}
    if(event.target.closest('[data-seo-reset]')){const url=new URL(location.href);['seoKeyword','seoIndexState','seoPriority','seoEdit'].forEach(key=>url.searchParams.delete(key));history.replaceState({},'',url.pathname+url.search);window.SavingioAdminV2?.mount?.('dept-seo','none');return;}
    if(remove&&confirm('이 SEO 항목을 삭제하시겠습니까?')){store.remove(remove.dataset.seoDelete);window.SavingioAdminV2?.mount?.('dept-seo','replace');return;}
    if(workflowButton){const item=store.get(workflowButton.dataset.seoWorkflow);if(!item)return;workflow.create({title:`SEO 재검사 · ${item.title}`,projectId:item.url||item.id,type:'seo-recheck',priority:item.priority==='urgent'?'urgent':'normal'});alert('SEO 재검사 워크플로를 생성했습니다.');}
  });

  window.addEventListener('savingio:v2-seo-inventory-changed',()=>{if(window.SavingioAdminV2?.activeId==='dept-seo')window.SavingioAdminV2.mount('dept-seo','replace');});
})();
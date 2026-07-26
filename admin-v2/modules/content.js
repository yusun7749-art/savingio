(() => {
  'use strict';

  const registry=window.SavingioV2Modules;
  const inventory=window.SavingioV2ContentInventoryStore;
  const queue=window.SavingioV2TaskQueue;
  if(!registry||!inventory||!queue)throw new Error('Content Inventory Center dependencies are not loaded');

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const time=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toLocaleString('ko-KR');};
  const statusOptions=selected=>inventory.statuses.map(status=>`<option value="${status}"${status===selected?' selected':''}>${esc(inventory.statusLabels[status])}</option>`).join('');
  const metric=(label,value)=>`<article class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`;

  function filters(){
    const params=new URLSearchParams(location.search);
    return {keyword:params.get('contentKeyword')||'',status:params.get('contentStatus')||'',category:params.get('contentCategory')||''};
  }

  function setFilters(form){
    const url=new URL(location.href);
    const data=new FormData(form);
    ['contentKeyword','contentStatus','contentCategory'].forEach(name=>{
      const value=String(data.get(name)||'').trim();
      if(value)url.searchParams.set(name,value);else url.searchParams.delete(name);
    });
    history.replaceState(history.state,'',url.pathname+url.search);
  }

  function editor(item={}){
    const id=item.id||'';
    return `<section class="panel"><h3>${id?'콘텐츠 수정':'콘텐츠 등록'}</h3><form id="contentInventoryForm"><input type="hidden" name="id" value="${esc(id)}"><div class="connection-list"><label><span>제목</span><input name="title" required maxlength="160" value="${esc(item.title||'')}" placeholder="글 제목"></label><label><span>Slug</span><input name="slug" maxlength="160" value="${esc(item.slug||'')}" placeholder="electricity-bill-saving"></label><label><span>URL</span><input name="url" maxlength="240" value="${esc(item.url||'')}" placeholder="/articles/electricity-bill-saving"></label><label><span>카테고리</span><input name="category" required maxlength="80" value="${esc(item.category||'')}" placeholder="생활비 절약"></label><label><span>상태</span><select name="status">${statusOptions(item.status||'draft')}</select></label><label><span>품질점수</span><input name="qualityScore" type="number" min="0" max="100" value="${esc(item.qualityScore??0)}"></label><label><span>운영 메모</span><textarea name="note" maxlength="500" placeholder="수정 이유, 검수 상태, 다음 행동">${esc(item.note||'')}</textarea></label></div><div class="header-actions"><button class="button" type="submit">${id?'수정 저장':'콘텐츠 등록'}</button>${id?'<button class="button secondary" type="button" data-content-action="cancel-edit">수정 취소</button>':''}</div></form></section>`;
  }

  function rows(items){
    if(!items.length)return '<div class="empty">조건에 맞는 콘텐츠가 없습니다.</div>';
    return `<div class="project-list">${items.map(item=>`<article class="project-card"><div class="project-top"><div><div class="project-title">${esc(item.title)}</div><div class="meta">${esc(item.category)} · ${esc(item.slug||'slug 없음')} · ${esc(item.url||'URL 없음')}</div></div><span class="status ${esc(item.status)}">${esc(inventory.statusLabels[item.status])}</span></div><div class="progress"><i style="width:${item.qualityScore}%"></i></div><div class="meta">품질점수 ${item.qualityScore}점 · 최근 수정 ${esc(time(item.updatedAt))}</div>${item.note?`<p>${esc(item.note)}</p>`:''}<div class="header-actions">${item.url?`<a class="button secondary" href="${esc(item.url)}" target="_blank" rel="noopener">페이지 열기</a>`:''}<button class="button secondary" type="button" data-content-action="edit" data-content-id="${esc(item.id)}">수정</button><button class="button secondary" type="button" data-content-action="create-workflow" data-content-id="${esc(item.id)}">수정 작업 생성</button><button class="button secondary" type="button" data-content-action="delete" data-content-id="${esc(item.id)}">삭제</button></div></article>`).join('')}</div>`;
  }

  function render(){
    const currentFilters=filters();
    const all=inventory.readAll();
    const list=inventory.query(currentFilters);
    const summary=inventory.summary(all);
    const editingId=new URLSearchParams(location.search).get('contentEdit')||'';
    const editing=editingId?inventory.get(editingId):null;
    const categoryOptions=summary.categories.map(category=>`<option value="${esc(category)}"${category===currentFilters.category?' selected':''}>${esc(category)}</option>`).join('');

    return `<section class="view" data-module-root><header class="hero"><p>CONTENT OPERATIONS</p><h2>콘텐츠 인벤토리 센터</h2><p>Savingio 글의 URL·카테고리·운영 상태·품질점수와 수정 작업을 한 화면에서 관리합니다.</p></header><div class="metrics">${metric('전체 콘텐츠',`${summary.total}건`)}${metric('발행 완료',`${summary.status.published}건`)}${metric('검수 중',`${summary.status.review}건`)}${metric('발행 준비',`${summary.status.ready}건`)}${metric('중지',`${summary.status.blocked}건`)}${metric('평균 품질',`${summary.averageQuality}점`)}</div>${editor(editing||{})}<section class="panel"><h3>검색·필터</h3><form id="contentInventoryFilter"><div class="connection-list"><label><span>검색</span><input name="contentKeyword" value="${esc(currentFilters.keyword)}" placeholder="제목, URL, 카테고리, 메모"></label><label><span>상태</span><select name="contentStatus"><option value="">전체</option>${inventory.statuses.map(status=>`<option value="${status}"${status===currentFilters.status?' selected':''}>${esc(inventory.statusLabels[status])}</option>`).join('')}</select></label><label><span>카테고리</span><select name="contentCategory"><option value="">전체</option>${categoryOptions}</select></label></div><div class="header-actions"><button class="button" type="submit">적용</button><button class="button secondary" type="button" data-content-action="reset-filter">초기화</button></div></form></section><section class="panel"><h3>콘텐츠 목록 · ${list.length}건</h3>${rows(list)}</section>${queue.render('content')}</section>`;
  }

  registry.register({id:'dept-content',title:'콘텐츠 인벤토리',render});

  document.addEventListener('submit',event=>{
    const form=event.target;
    if(form.id==='contentInventoryForm'){
      event.preventDefault();
      const data=Object.fromEntries(new FormData(form).entries());
      inventory.upsert(data);
      const url=new URL(location.href);url.searchParams.delete('contentEdit');history.replaceState(history.state,'',url.pathname+url.search);
      window.SavingioAdminV2?.mount?.('dept-content','replace');
      return;
    }
    if(form.id==='contentInventoryFilter'){
      event.preventDefault();
      setFilters(form);
      window.SavingioAdminV2?.mount?.('dept-content','replace');
    }
  });

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-content-action]');
    if(!button)return;
    const action=button.dataset.contentAction;
    const id=button.dataset.contentId||'';
    const url=new URL(location.href);
    if(action==='edit'){url.searchParams.set('contentEdit',id);history.replaceState(history.state,'',url.pathname+url.search);window.SavingioAdminV2?.mount?.('dept-content','replace');}
    if(action==='cancel-edit'){url.searchParams.delete('contentEdit');history.replaceState(history.state,'',url.pathname+url.search);window.SavingioAdminV2?.mount?.('dept-content','replace');}
    if(action==='reset-filter'){['contentKeyword','contentStatus','contentCategory'].forEach(name=>url.searchParams.delete(name));history.replaceState(history.state,'',url.pathname+url.search);window.SavingioAdminV2?.mount?.('dept-content','replace');}
    if(action==='delete'&&confirm('이 콘텐츠 항목을 인벤토리에서 삭제하시겠습니까?')){inventory.remove(id);window.SavingioAdminV2?.mount?.('dept-content','replace');}
    if(action==='create-workflow'){
      const item=inventory.get(id);
      if(!item)return;
      window.SavingioV2WorkflowEngine?.create?.({title:`${item.title} 콘텐츠 수정`,projectId:item.slug||item.id,type:'content-update',priority:item.status==='blocked'?'urgent':'normal'});
      alert('콘텐츠 수정 워크플로를 생성했습니다.');
    }
  });
})();
(() => {
  'use strict';

  const registry=window.SavingioV2Modules;
  const store=window.SavingioV2QaInventoryStore;
  const workflow=window.SavingioV2WorkflowEngine;
  if(!registry||!store||!workflow)throw new Error('QA center dependencies are not loaded');

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const checkLabel=value=>value?'PASS':'FAIL';
  const time=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?String(value||''):date.toLocaleString('ko-KR');};
  const metric=(label,value)=>`<article class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`;
  const checks=Object.freeze([['content','콘텐츠'],['seo','SEO'],['image','이미지'],['links','내부링크'],['responsive','반응형'],['liveUrl','실제 URL']]);

  function form(item={}){
    return `<section class="panel"><h3>${item.id?'QA 항목 수정':'새 QA 검사 등록'}</h3><form id="qaInventoryForm"><input type="hidden" name="id" value="${esc(item.id||'')}"><div class="connection-list"><label><span>제목</span><input name="title" required maxlength="140" value="${esc(item.title||'')}" placeholder="검사할 콘텐츠 제목"></label><label><span>URL</span><input name="url" maxlength="220" value="${esc(item.url||'')}" placeholder="/articles/example"></label><label><span>검수 메모</span><input name="note" maxlength="240" value="${esc(item.note||'')}" placeholder="수정 필요 사항"></label></div><div class="connection-list">${checks.map(([key,label])=>`<label><span>${label}</span><input type="checkbox" name="${key}" ${item[key]?'checked':''}></label>`).join('')}<label><span>강제 중지</span><input type="checkbox" name="blocked" ${item.result==='blocked'?'checked':''}></label></div><div class="header-actions"><button class="button" type="submit">저장</button>${item.id?'<button class="button secondary" type="button" data-qa-action="cancel">신규 입력으로 전환</button>':''}</div></form></section>`;
  }

  function cards(items){
    if(!items.length)return '<div class="panel empty">조건에 맞는 QA 항목이 없습니다.</div>';
    return `<div class="project-list">${items.map(item=>`<article class="project-card"><div class="project-top"><div><div class="project-title">${esc(item.title)}</div><div class="meta">${esc(item.id)} · ${esc(item.url||'URL 미입력')}</div></div><span class="status ${item.result==='pass'?'done':item.result==='pending'?'pending':'error'}">${esc(store.resultLabels[item.result])}</span></div><div class="stage-list">${checks.map(([key,label])=>`<div class="stage ${item[key]?'done':'pending'}"><span>${item[key]?'✓':'·'}</span><strong>${esc(label)}</strong><small>${checkLabel(item[key])}</small></div>`).join('')}</div><div class="meta">${esc(item.note||'메모 없음')} · ${esc(time(item.updatedAt))}</div><div class="header-actions"><button class="button secondary" type="button" data-qa-action="edit" data-id="${esc(item.id)}">수정</button><button class="button secondary" type="button" data-qa-action="workflow" data-id="${esc(item.id)}">수정 워크플로 생성</button>${item.url?`<a class="button secondary" href="${esc(item.url)}" target="_blank" rel="noopener">페이지 열기</a>`:''}<button class="button secondary" type="button" data-qa-action="delete" data-id="${esc(item.id)}">삭제</button></div></article>`).join('')}</div>`;
  }

  let editingId='';
  let filters={keyword:'',result:''};

  function render(){
    const items=store.query(filters);
    const summary=store.summary();
    const editing=editingId?store.get(editingId):null;
    return `<section class="view" data-module-root><header class="hero"><p>QA CENTER</p><h2>QA 검수 센터</h2><p>콘텐츠·SEO·이미지·내부링크·반응형·실제 URL을 항목별로 확인하고 배포 전 PASS 여부를 관리합니다.</p></header><div class="metrics">${metric('전체',`${summary.total}건`)}${metric('PASS',`${summary.result.pass}건`)}${metric('FAIL',`${summary.result.fail}건`)}${metric('중지',`${summary.result.blocked}건`)}${metric('콘텐츠 통과율',`${summary.checkRates.content}%`)}${metric('실제 URL 통과율',`${summary.checkRates.liveUrl}%`)}</div>${form(editing||{})}<section class="panel"><h3>검색·필터</h3><form id="qaFilterForm"><div class="connection-list"><label><span>검색</span><input name="keyword" value="${esc(filters.keyword)}" placeholder="제목·URL·메모"></label><label><span>판정</span><select name="result"><option value="">전체</option>${store.results.map(value=>`<option value="${value}" ${filters.result===value?'selected':''}>${esc(store.resultLabels[value])}</option>`).join('')}</select></label></div><div class="header-actions"><button class="button" type="submit">적용</button><button class="button secondary" type="button" data-qa-action="reset-filter">초기화</button></div></form></section><section class="panel"><h3>QA 검사 목록</h3>${cards(items)}</section></section>`;
  }

  registry.register({id:'dept-qa',title:'QA 검수 센터',render});

  document.addEventListener('submit',event=>{
    const formEl=event.target;
    if(formEl.id==='qaInventoryForm'){
      event.preventDefault();
      const data=new FormData(formEl);
      store.upsert({id:data.get('id'),title:data.get('title'),url:data.get('url'),note:data.get('note'),content:data.has('content'),seo:data.has('seo'),image:data.has('image'),links:data.has('links'),responsive:data.has('responsive'),liveUrl:data.has('liveUrl'),result:data.has('blocked')?'blocked':'pending'});
      editingId='';window.SavingioAdminV2?.mount?.('dept-qa','replace');return;
    }
    if(formEl.id==='qaFilterForm'){
      event.preventDefault();const data=new FormData(formEl);filters={keyword:String(data.get('keyword')||''),result:String(data.get('result')||'')};window.SavingioAdminV2?.mount?.('dept-qa','replace');
    }
  });

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-qa-action]');if(!button)return;
    const action=button.dataset.qaAction;const id=button.dataset.id||'';
    if(action==='edit')editingId=id;
    if(action==='cancel')editingId='';
    if(action==='reset-filter')filters={keyword:'',result:''};
    if(action==='delete'&&confirm('이 QA 항목을 삭제할까요?'))store.remove(id);
    if(action==='workflow'){
      const item=store.get(id);
      if(item)workflow.create({title:`QA 수정 · ${item.title}`,projectId:item.url||item.id,type:'urgent-fix',priority:item.result==='blocked'?'urgent':'normal'});
    }
    window.SavingioAdminV2?.mount?.('dept-qa','replace');
  });
})();
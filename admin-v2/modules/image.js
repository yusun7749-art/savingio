(() => {
  'use strict';

  const registry=window.SavingioV2Modules;
  const store=window.SavingioV2ImageInventoryStore;
  const workflow=window.SavingioV2WorkflowEngine;
  if(!registry||!store||!workflow)throw new Error('Image inventory dependencies are not loaded');

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const time=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?String(value||''):date.toLocaleString('ko-KR');};
  const option=(value,label,current)=>`<option value="${esc(value)}"${value===current?' selected':''}>${esc(label)}</option>`;

  let filters={keyword:'',type:'',status:''};
  let editingId='';

  function editor(item={}){
    const current=item.id?item:{};
    return `<section class="panel"><h3>${current.id?'이미지 자산 수정':'새 이미지 자산 등록'}</h3><form id="imageInventoryForm"><input type="hidden" name="id" value="${esc(current.id||'')}"><div class="connection-list"><label><span>자산 제목</span><input name="title" required maxlength="140" value="${esc(current.title||'')}" placeholder="예: 자동차보험 대표 이미지"></label><label><span>이미지 경로</span><input name="path" value="${esc(current.path||'')}" placeholder="/images/articles/example.svg"></label><label><span>사용 페이지</span><input name="targetUrl" value="${esc(current.targetUrl||'')}" placeholder="/articles/example"></label><label><span>자산 유형</span><select name="type">${store.types.map(key=>option(key,store.typeLabels[key],current.type||'thumbnail')).join('')}</select></label><label><span>운영 상태</span><select name="status">${store.statuses.map(key=>option(key,store.statusLabels[key],current.status||'draft')).join('')}</select></label><label><span>ALT</span><input name="alt" value="${esc(current.alt||'')}" placeholder="이미지 내용을 설명하는 대체 텍스트"></label><label><span>가로(px)</span><input name="width" type="number" min="0" value="${esc(current.width||0)}"></label><label><span>세로(px)</span><input name="height" type="number" min="0" value="${esc(current.height||0)}"></label><label><span>운영 메모</span><input name="note" value="${esc(current.note||'')}" placeholder="수정 또는 검수 사항"></label></div><div class="header-actions"><label><input name="watermark" type="checkbox"${current.watermark?' checked':''}> 워터마크 적용</label><label><input name="optimized" type="checkbox"${current.optimized?' checked':''}> 최적화 완료</label><label><input name="brandChecked" type="checkbox"${current.brandChecked?' checked':''}> 브랜드 검수 완료</label><button class="button" type="submit">${current.id?'수정 저장':'자산 등록'}</button>${current.id?'<button class="button secondary" type="button" data-image-action="cancel">취소</button>':''}</div></form></section>`;
  }

  function filterPanel(){
    return `<section class="panel"><h3>검색·필터</h3><form id="imageInventoryFilter"><div class="connection-list"><label><span>검색</span><input name="keyword" value="${esc(filters.keyword)}" placeholder="제목·경로·ALT·메모"></label><label><span>자산 유형</span><select name="type"><option value="">전체 유형</option>${store.types.map(key=>option(key,store.typeLabels[key],filters.type)).join('')}</select></label><label><span>운영 상태</span><select name="status"><option value="">전체 상태</option>${store.statuses.map(key=>option(key,store.statusLabels[key],filters.status)).join('')}</select></label></div><div class="header-actions"><button class="button" type="submit">필터 적용</button><button class="button secondary" type="button" data-image-action="reset-filter">초기화</button></div></form></section>`;
  }

  function cards(items){
    if(!items.length)return '<div class="panel empty">조건에 맞는 이미지 자산이 없습니다.</div>';
    return `<div class="project-list">${items.map(item=>{const quality=store.quality(item);const path=item.path?`<a class="button secondary" href="${esc(item.path)}" target="_blank" rel="noopener">이미지 열기</a>`:'';const page=item.targetUrl?`<a class="button secondary" href="${esc(item.targetUrl)}" target="_blank" rel="noopener">사용 페이지</a>`:'';return `<article class="project-card"><div class="project-top"><div><div class="project-title">${esc(item.title)}</div><div class="meta">${esc(store.typeLabels[item.type])} · ${esc(item.path||'경로 미등록')} · ${esc(time(item.updatedAt))}</div></div><span class="status ${esc(item.status)}">${esc(store.statusLabels[item.status])}</span></div><div class="progress"><i style="width:${quality}%"></i></div><div class="meta">품질 ${quality}% · ${item.width||0}×${item.height||0} · ALT ${item.alt?'등록':'누락'} · 최적화 ${item.optimized?'완료':'대기'} · 브랜드 ${item.brandChecked?'PASS':'대기'} · 워터마크 ${item.watermark?'적용':'미적용'}</div>${item.alt?`<div class="meta">ALT: ${esc(item.alt)}</div>`:''}${item.note?`<div class="meta">메모: ${esc(item.note)}</div>`:''}<div class="header-actions">${path}${page}<button class="button secondary" type="button" data-image-action="edit" data-image-id="${esc(item.id)}">수정</button><button class="button secondary" type="button" data-image-action="workflow" data-image-id="${esc(item.id)}">이미지 작업 생성</button><button class="button secondary" type="button" data-image-action="delete" data-image-id="${esc(item.id)}">삭제</button></div></article>`;}).join('')}</div>`;
  }

  function render(){
    const items=store.query(filters);
    const summary=store.summary();
    const editItem=editingId?store.get(editingId):null;
    return `<section class="view" data-module-root><header class="hero"><p>IMAGE INVENTORY</p><h2>이미지 인벤토리</h2><p>대표 이미지·본문 이미지·인포그래픽·쇼츠 자산의 경로, ALT, 규격, 최적화, 워터마크와 브랜드 검수 상태를 관리합니다.</p></header><div class="metrics"><article class="metric"><span>전체 자산</span><strong>${summary.total}건</strong></article><article class="metric"><span>사용 중</span><strong>${summary.status.published||0}건</strong></article><article class="metric"><span>검수 중</span><strong>${summary.status.review||0}건</strong></article><article class="metric"><span>중지</span><strong>${summary.status.blocked||0}건</strong></article><article class="metric"><span>ALT 누락</span><strong>${summary.altMissing}건</strong></article><article class="metric"><span>평균 품질</span><strong>${summary.averageQuality}%</strong></article></div>${editor(editItem||{})}${filterPanel()}<section class="panel"><h3>이미지 자산 ${items.length}건</h3>${cards(items)}</section></section>`;
  }

  registry.register({id:'dept-image',title:'이미지 인벤토리',render});

  document.addEventListener('submit',event=>{
    if(event.target.id==='imageInventoryForm'){
      event.preventDefault();
      const data=Object.fromEntries(new FormData(event.target).entries());
      data.watermark=event.target.elements.watermark.checked;
      data.optimized=event.target.elements.optimized.checked;
      data.brandChecked=event.target.elements.brandChecked.checked;
      store.upsert(data);editingId='';window.SavingioAdminV2?.mount?.('dept-image','replace');return;
    }
    if(event.target.id==='imageInventoryFilter'){
      event.preventDefault();filters=Object.fromEntries(new FormData(event.target).entries());window.SavingioAdminV2?.mount?.('dept-image','replace');
    }
  });

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-image-action]');
    if(!button)return;
    const action=button.dataset.imageAction;
    const id=button.dataset.imageId;
    if(action==='edit'){editingId=id;window.SavingioAdminV2?.mount?.('dept-image','replace');return;}
    if(action==='cancel'){editingId='';window.SavingioAdminV2?.mount?.('dept-image','replace');return;}
    if(action==='reset-filter'){filters={keyword:'',type:'',status:''};window.SavingioAdminV2?.mount?.('dept-image','replace');return;}
    if(action==='delete'){if(confirm('이 이미지 자산을 삭제할까요?')){store.remove(id);window.SavingioAdminV2?.mount?.('dept-image','replace');}return;}
    if(action==='workflow'){
      const item=store.get(id);if(!item)return;
      workflow.create({title:`이미지 보완 · ${item.title}`,projectId:item.targetUrl||item.id,type:'content-update',priority:item.status==='blocked'?'urgent':'normal'});
      alert('이미지 보완 워크플로를 생성했습니다.');
    }
  });
})();
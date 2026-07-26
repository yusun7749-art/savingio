(() => {
  'use strict';

  const registry=window.SavingioV2Modules;
  const store=window.SavingioV2DeployInventoryStore;
  const workflow=window.SavingioV2WorkflowEngine;
  if(!registry||!store||!workflow)throw new Error('Deploy center dependencies are not loaded');

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const time=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?String(value||''):date.toLocaleString('ko-KR');};
  const checked=value=>value?'checked':'';
  let filters={keyword:'',status:'',environment:''};
  let editingId='';

  function form(item={}){
    return `<section class="panel"><h3>${item.id?'배포 기록 수정':'새 배포 기록'}</h3><form id="deployInventoryForm"><input type="hidden" name="id" value="${esc(item.id||'')}"><div class="connection-list"><label><span>배포 제목</span><input name="title" required maxlength="120" value="${esc(item.title||'')}" placeholder="예: Admin V2 운영 배포"></label><label><span>대상 URL</span><input name="targetUrl" value="${esc(item.targetUrl||'')}" placeholder="/admin-v2/"></label><label><span>환경</span><select name="environment">${store.environments.map(value=>`<option value="${value}" ${item.environment===value?'selected':''}>${value==='production'?'운영':'미리보기'}</option>`).join('')}</select></label><label><span>상태</span><select name="status">${store.statuses.map(value=>`<option value="${value}" ${item.status===value?'selected':''}>${esc(store.statusLabels[value])}</option>`).join('')}</select></label><label><span>Commit SHA</span><input name="commitSha" value="${esc(item.commitSha||'')}" placeholder="확인된 값만 입력"></label><label><span>Deployment ID</span><input name="deploymentId" value="${esc(item.deploymentId||'')}" placeholder="확인된 값만 입력"></label></div><div class="connection-list"><label><span>승인 완료</span><input type="checkbox" name="approved" ${checked(item.approved)}></label><label><span>GitHub 반영 확인</span><input type="checkbox" name="github" ${checked(item.github)}></label><label><span>Cloudflare 배포 확인</span><input type="checkbox" name="cloudflare" ${checked(item.cloudflare)}></label><label><span>실제 URL 확인</span><input type="checkbox" name="liveUrl" ${checked(item.liveUrl)}></label><label><span>롤백 준비</span><input type="checkbox" name="rollbackReady" ${checked(item.rollbackReady)}></label><label><span>운영 메모</span><input name="note" value="${esc(item.note||'')}" placeholder="확인된 사실만 기록"></label></div><div class="header-actions"><button class="button" type="submit">저장</button>${item.id?'<button class="button secondary" type="button" data-deploy-action="cancel-edit">취소</button>':''}</div></form></section>`;
  }

  function filtersPanel(summary){
    return `<section class="panel"><h3>배포 검색·필터</h3><form id="deployFilterForm"><div class="connection-list"><label><span>검색</span><input name="keyword" value="${esc(filters.keyword)}" placeholder="제목·URL·Commit·메모"></label><label><span>상태</span><select name="status"><option value="">전체</option>${store.statuses.map(value=>`<option value="${value}" ${filters.status===value?'selected':''}>${esc(store.statusLabels[value])}</option>`).join('')}</select></label><label><span>환경</span><select name="environment"><option value="">전체</option>${store.environments.map(value=>`<option value="${value}" ${filters.environment===value?'selected':''}>${value==='production'?'운영':'미리보기'}</option>`).join('')}</select></label></div><div class="header-actions"><button class="button" type="submit">적용</button><button class="button secondary" type="button" data-deploy-action="reset-filter">초기화</button></div></form><div class="metrics"><article class="metric"><span>전체</span><strong>${summary.total}</strong></article><article class="metric"><span>승인 완료</span><strong>${summary.approved}</strong></article><article class="metric"><span>실제 검증 완료</span><strong>${summary.verified}</strong></article><article class="metric"><span>실패</span><strong>${summary.failed}</strong></article></div></section>`;
  }

  function cards(items){
    if(!items.length)return '<section class="panel empty">조건에 맞는 배포 기록이 없습니다.</section>';
    return `<div class="project-list">${items.map(item=>`<article class="project-card"><div class="project-top"><div><div class="project-title">${esc(item.title)}</div><div class="meta">${esc(item.id)} · ${item.environment==='production'?'운영':'미리보기'} · ${esc(time(item.updatedAt))}</div></div><span class="status ${item.status==='verified'?'done':item.status==='failed'?'error':'pending'}">${esc(store.statusLabels[item.status])}</span></div><div class="meta">${esc(item.targetUrl||'대상 URL 미등록')}</div><div class="connection-list"><div><span>승인</span><strong>${item.approved?'확인':'미확인'}</strong></div><div><span>GitHub</span><strong>${item.github?'확인':'미확인'}</strong></div><div><span>Cloudflare</span><strong>${item.cloudflare?'확인':'미확인'}</strong></div><div><span>실제 URL</span><strong>${item.liveUrl?'확인':'미확인'}</strong></div><div><span>롤백 준비</span><strong>${item.rollbackReady?'준비':'미준비'}</strong></div></div>${item.commitSha||item.deploymentId?`<div class="meta">Commit ${esc(item.commitSha||'미등록')} · Deployment ${esc(item.deploymentId||'미등록')}</div>`:''}<div class="meta">${esc(item.note||'메모 없음')}</div><div class="header-actions"><button class="button secondary" type="button" data-deploy-action="edit" data-deploy-id="${esc(item.id)}">수정</button>${item.targetUrl?`<a class="button secondary" href="${esc(item.targetUrl)}" target="_blank" rel="noopener">페이지 열기</a>`:''}<button class="button secondary" type="button" data-deploy-action="workflow" data-deploy-id="${esc(item.id)}">배포 워크플로</button><button class="button secondary" type="button" data-deploy-action="delete" data-deploy-id="${esc(item.id)}">삭제</button></div></article>`).join('')}</div>`;
  }

  function render(){
    const items=store.query(filters);
    const summary=store.summary(store.readAll());
    const editing=editingId?store.get(editingId):null;
    return `<section class="view" data-module-root><header class="hero"><p>DEPLOY APPROVAL CENTER</p><h2>배포 승인 센터</h2><p>승인, GitHub 반영, Cloudflare 배포, 실제 URL 검증, 실패와 롤백 기록을 확인된 사실 기준으로 관리합니다.</p></header>${form(editing||{})}${filtersPanel(summary)}${cards(items)}<section class="panel"><h3>진실성 LOCK</h3><div class="connection-list"><div><span>배포 성공 판정</span><strong>실제 URL 확인 후에만 검증 완료</strong></div><div><span>외부 자동화 미연결</span><strong>확인하지 않은 Commit·Deployment ID 생성 금지</strong></div><div><span>실패 처리</span><strong>실패·롤백 상태와 원인을 기록</strong></div></div></section></section>`;
  }

  registry.register({id:'dept-deploy',title:'배포 승인 센터',render});

  document.addEventListener('submit',event=>{
    const formElement=event.target;
    if(formElement.id==='deployInventoryForm'){
      event.preventDefault();
      const data=Object.fromEntries(new FormData(formElement));
      store.upsert({...data,approved:formElement.approved.checked,github:formElement.github.checked,cloudflare:formElement.cloudflare.checked,liveUrl:formElement.liveUrl.checked,rollbackReady:formElement.rollbackReady.checked});
      editingId='';window.SavingioAdminV2?.mount?.('dept-deploy','replace');return;
    }
    if(formElement.id==='deployFilterForm'){
      event.preventDefault();filters=Object.fromEntries(new FormData(formElement));window.SavingioAdminV2?.mount?.('dept-deploy','replace');
    }
  });

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-deploy-action]');if(!button)return;
    const action=button.dataset.deployAction;const id=button.dataset.deployId;
    if(action==='edit'){editingId=id;window.SavingioAdminV2?.mount?.('dept-deploy','replace');}
    if(action==='cancel-edit'){editingId='';window.SavingioAdminV2?.mount?.('dept-deploy','replace');}
    if(action==='reset-filter'){filters={keyword:'',status:'',environment:''};window.SavingioAdminV2?.mount?.('dept-deploy','replace');}
    if(action==='delete'&&confirm('이 배포 기록을 삭제할까요?')){store.remove(id);window.SavingioAdminV2?.mount?.('dept-deploy','replace');}
    if(action==='workflow'){
      const item=store.get(id);if(!item)return;
      workflow.create({title:`${item.title} 배포 검증`,projectId:item.targetUrl||item.id,type:'urgent-fix',priority:item.status==='failed'?'urgent':'normal'});
      alert('배포 검증 워크플로를 생성했습니다.');
    }
  });

  window.addEventListener('savingio:v2-deploy-inventory-changed',()=>{if(window.SavingioAdminV2?.activeId==='dept-deploy')window.SavingioAdminV2.mount('dept-deploy','replace');});
})();
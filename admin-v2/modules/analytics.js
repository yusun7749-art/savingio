(() => {
  'use strict';

  const registry=window.SavingioV2Modules;
  const store=window.SavingioV2AnalyticsInventoryStore;
  const workflow=window.SavingioV2WorkflowEngine;
  if(!registry||!store||!workflow)throw new Error('Analytics Center dependencies are not loaded');

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const sourceLabels={manual:'직접 입력','search-console':'Search Console',analytics:'Analytics',cloudflare:'Cloudflare'};
  const time=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?String(value||''):date.toLocaleString('ko-KR');};
  const metric=(name,value)=>`<article class="metric"><span>${esc(name)}</span><strong>${esc(value)}</strong></article>`;
  const num=value=>Number(value||0).toLocaleString('ko-KR');

  function form(item={}){
    return `<section class="panel"><h3>${item.id?'분석 기록 수정':'분석 기록 등록'}</h3><form id="analyticsInventoryForm"><input type="hidden" name="id" value="${esc(item.id||'')}"><div class="connection-list"><label><span>페이지 제목</span><input name="title" required maxlength="140" value="${esc(item.title||'')}"></label><label><span>페이지 URL</span><input name="url" maxlength="240" value="${esc(item.url||'')}"></label><label><span>데이터 출처</span><select name="source">${store.sources.map(value=>`<option value="${value}"${item.source===value?' selected':''}>${esc(sourceLabels[value]||value)}</option>`).join('')}</select></label><label><span>검증 상태</span><select name="status">${store.statuses.map(value=>`<option value="${value}"${item.status===value?' selected':''}>${esc(store.statusLabels[value])}</option>`).join('')}</select></label><label><span>측정 기간</span><input name="period" maxlength="80" value="${esc(item.period||'')}" placeholder="예: 2026-07-01~2026-07-26"></label><label><span>조회수</span><input name="views" type="number" min="0" value="${esc(item.views||0)}"></label><label><span>클릭수</span><input name="clicks" type="number" min="0" value="${esc(item.clicks||0)}"></label><label><span>노출수</span><input name="impressions" type="number" min="0" value="${esc(item.impressions||0)}"></label><label><span>CTR (%)</span><input name="ctr" type="number" min="0" max="100" step="0.01" value="${esc(item.ctr||0)}"></label><label><span>평균 체류시간(초)</span><input name="avgSeconds" type="number" min="0" value="${esc(item.avgSeconds||0)}"></label><label><span>전환수</span><input name="conversions" type="number" min="0" value="${esc(item.conversions||0)}"></label><label><span>수익 신호</span><input name="revenueSignal" type="number" min="0" step="0.01" value="${esc(item.revenueSignal||0)}"></label><label><span>운영 메모</span><textarea name="note" rows="3">${esc(item.note||'')}</textarea></label></div><div class="header-actions"><button class="button" type="submit">저장</button>${item.id?'<button class="button secondary" type="button" data-analytics-action="cancel">취소</button>':''}</div></form></section>`;
  }

  function filters(){return `<section class="panel"><h3>검색·필터</h3><form id="analyticsFilterForm"><div class="connection-list"><label><span>검색</span><input name="keyword" placeholder="제목·URL·기간·메모"></label><label><span>상태</span><select name="status"><option value="">전체</option>${store.statuses.map(value=>`<option value="${value}">${esc(store.statusLabels[value])}</option>`).join('')}</select></label><label><span>출처</span><select name="source"><option value="">전체</option>${store.sources.map(value=>`<option value="${value}">${esc(sourceLabels[value]||value)}</option>`).join('')}</select></label></div><div class="header-actions"><button class="button" type="submit">적용</button><button class="button secondary" type="button" data-analytics-action="reset-filter">초기화</button></div></form></section>`;}

  function cards(items){
    if(!items.length)return '<div class="empty">조건에 맞는 분석 기록이 없습니다.</div>';
    return `<div class="project-list">${items.map(item=>`<article class="project-card"><div class="project-top"><div><div class="project-title">${esc(item.title)}</div><div class="meta">${esc(item.url||'URL 미입력')} · ${esc(sourceLabels[item.source]||item.source)} · ${esc(item.period||'기간 미입력')}</div></div><span class="status ${esc(item.status)}">${esc(store.statusLabels[item.status])}</span></div><div class="metrics">${metric('조회',num(item.views))}${metric('클릭',num(item.clicks))}${metric('노출',num(item.impressions))}${metric('CTR',`${item.ctr}%`)}${metric('체류',`${num(item.avgSeconds)}초`)}${metric('전환',num(item.conversions))}</div><div class="meta">수익 신호 ${num(item.revenueSignal)} · 갱신 ${esc(time(item.updatedAt))}${item.note?` · ${esc(item.note)}`:''}</div><div class="header-actions">${item.url?`<a class="button secondary" href="${esc(item.url)}" target="_blank" rel="noopener">페이지 열기</a>`:''}<button class="button secondary" type="button" data-analytics-action="edit" data-analytics-id="${esc(item.id)}">수정</button><button class="button secondary" type="button" data-analytics-action="workflow" data-analytics-id="${esc(item.id)}">성과 개선 작업</button><button class="button secondary" type="button" data-analytics-action="delete" data-analytics-id="${esc(item.id)}">삭제</button></div></article>`).join('')}</div>`;
  }

  let filtersState={keyword:'',status:'',source:''};
  let editingId='';

  function render(){
    const items=store.query(filtersState);
    const summary=store.summary();
    const editing=editingId?store.get(editingId):null;
    return `<section class="view" data-module-root data-module="analytics-center"><header class="hero"><p>ANALYTICS CENTER</p><h2>분석 센터</h2><p>페이지별 조회·노출·클릭·체류·전환·수익 신호를 확인된 데이터만 기록합니다. 외부 데이터가 연결되지 않은 항목은 미확인 상태로 유지합니다.</p></header><div class="metrics">${metric('전체 기록',`${summary.total}건`)}${metric('검증 완료',`${summary.verified}건`)}${metric('조회수',num(summary.views))}${metric('클릭수',num(summary.clicks))}${metric('노출수',num(summary.impressions))}${metric('전환수',num(summary.conversions))}</div>${form(editing||{})}${filters()}<section class="panel"><h3>페이지별 성과 기록</h3>${cards(items)}</section><section class="panel"><h3>데이터 진실성 LOCK</h3><div class="connection-list"><div><span>외부 연동 전 자동 수치 생성</span><strong>금지</strong></div><div><span>Search Console·Analytics 수치</span><strong>확인된 값만 기록</strong></div><div><span>미확인 데이터</span><strong>0이 아니라 미확인 상태로 구분</strong></div><div><span>수익 신호</span><strong>실제 수익과 별도 관리</strong></div></div></section></section>`;
  }

  registry.register({id:'dept-analytics',title:'분석 센터',render});

  function remount(){window.SavingioAdminV2?.mount?.('dept-analytics','replace');}

  document.addEventListener('submit',event=>{
    if(event.target.id==='analyticsInventoryForm'){
      event.preventDefault();
      const data=Object.fromEntries(new FormData(event.target));
      store.upsert(data);editingId='';remount();return;
    }
    if(event.target.id==='analyticsFilterForm'){
      event.preventDefault();filtersState=Object.fromEntries(new FormData(event.target));remount();
    }
  });

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-analytics-action]');if(!button)return;
    const action=button.dataset.analyticsAction;const id=button.dataset.analyticsId;
    if(action==='edit'){editingId=id;remount();return;}
    if(action==='cancel'){editingId='';remount();return;}
    if(action==='reset-filter'){filtersState={keyword:'',status:'',source:''};remount();return;}
    if(action==='delete'){if(confirm('이 분석 기록을 삭제하시겠습니까?')){store.remove(id);remount();}return;}
    if(action==='workflow'){
      const item=store.get(id);if(!item)return;
      workflow.create({title:`${item.title} 성과 개선`,projectId:item.url||item.id,type:'seo-recheck',priority:'normal',stage:'analytics',status:'pending',analyticsNote:'분석 센터에서 생성'});
      remount();
    }
  });

  window.addEventListener('savingio:v2-analytics-inventory-changed',()=>{if(document.querySelector('[data-module="analytics-center"]'))remount();});
})();
(()=>{
'use strict';
const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let state={registry:null,graph:null,related:null,actions:null,doctor:null,isolated:[],weak:[],activeView:'errors'};

function setText(id,value){const node=document.getElementById(id);if(node)node.textContent=String(value);}
function metric(id,value){setText(id,value);}
function errorItem(item){const title=item.title||item.code||'확인 필요';const href=item.href||item.first?.href||'';return `<div class="result-item"><strong>${esc(title)}</strong><span>${esc(item.code||'')}</span>${href?`<span>${esc(href)}</span>`:''}</div>`;}
function articleItem(record,label=''){return `<div class="result-item"><strong>${esc(record.title||'제목 없음')}</strong><span>${esc(label)}</span><span>${esc(record.href||'')}</span></div>`;}

function renderList(){
  const list=$('#doctorList');
  const doctor=state.doctor||{errors:[],warnings:[]};
  let html='';
  if(state.activeView==='errors')html=doctor.errors.map(errorItem).join('');
  if(state.activeView==='warnings')html=doctor.warnings.map(errorItem).join('');
  if(state.activeView==='isolated')html=state.isolated.map(record=>articleItem(record,'연결 0개')).join('');
  if(state.activeView==='weak')html=state.weak.map(item=>articleItem(item.record,`연결 ${item.count}개`)).join('');
  list.innerHTML=html||'<div class="empty">해당 항목이 없습니다.</div>';
}

function renderCategories(){
  const records=state.registry.records;
  const counts=new Map();
  records.forEach(record=>counts.set(record.category,(counts.get(record.category)||0)+1));
  const rows=[...counts.entries()].sort((a,b)=>b[1]-a[1]);
  const max=Math.max(...rows.map(row=>row[1]),1);
  setText('categoryCount',`${rows.length}개 카테고리`);
  $('#categoryMap').innerHTML=rows.map(([label,count])=>`<div class="category-row-admin"><div class="category-label" title="${esc(label)}">${esc(label)}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(4,Math.round(count/max*100))}%"></div></div><div class="category-value">${count}</div></div>`).join('');
}

function renderInspector(){
  const select=$('#articleSelect');
  const record=state.registry.records.find(item=>item.id===select.value)||state.registry.records[0];
  if(!record){$('#articleInspector').innerHTML='<div class="empty">글이 없습니다.</div>';return;}
  const related=state.related.mixed(record,{limit:6});
  const chain=state.actions.chain(record);
  const path=state.graph.path(record).join(' › ')||record.category;
  $('#articleInspector').innerHTML=`
    <section class="inspector-card"><h3>Registry</h3><span class="status-pill">${esc(record.category)}</span><p><strong>${esc(record.title)}</strong></p><p>${esc(record.href)}</p><p>${esc(path)}</p><p>키워드: ${esc(record.keywords||'없음')}</p></section>
    <section class="inspector-card"><h3>Related Graph</h3>${related.length?`<ol>${related.map(item=>`<li><a href="${esc(item.record.href)}" target="_blank" rel="noopener">${esc(item.record.title)}</a> <small>(${item.score})</small></li>`).join('')}</ol>`:'<p>연결된 글이 없습니다.</p>'}</section>
    <section class="inspector-card"><h3>Action Chain</h3>${chain?`<ol>${chain.steps.map(step=>`<li>${esc(step.label)}</li>`).join('')}</ol>`:'<p>행동 사슬이 없습니다.</p>'}</section>`;
}

function populateSelect(records){
  const select=$('#articleSelect');
  select.innerHTML=records.map(record=>`<option value="${esc(record.id)}">${esc(record.title)}</option>`).join('');
  renderInspector();
}

function computeGraphHealth(){
  const records=state.registry.records;
  state.isolated=[];state.weak=[];
  records.forEach(record=>{
    const count=state.graph.neighbors(record,{limit:1000}).length;
    if(count===0)state.isolated.push(record);
    else if(count<3)state.weak.push({record,count});
  });
  state.weak.sort((a,b)=>a.count-b.count);
}

function renderMetrics(){
  const stats=state.graph.stats();
  metric('metricArticles',state.registry.records.length);
  metric('metricNodes',stats.nodes);
  metric('metricEdges',stats.edges.toLocaleString('ko-KR'));
  metric('metricAverage',stats.nodes?(stats.edges/stats.nodes).toFixed(1):'0');
  metric('metricIsolated',state.isolated.length);
  metric('metricErrors',state.doctor.errorCount);
  metric('metricWarnings',state.doctor.warningCount);
  metric('metricPass',state.doctor.pass?'PASS':'CHECK');
  const summary=$('#doctorSummary');
  summary.className=`summary-box ${state.doctor.pass?'pass':'fail'}`;
  summary.textContent=state.doctor.pass?`Registry ${state.doctor.recordCount}개 검사 완료 · 치명적 오류 없음`:`오류 ${state.doctor.errorCount}개 · 경고 ${state.doctor.warningCount}개 확인 필요`;
  setText('doctorStamp',new Date(state.doctor.checkedAt).toLocaleString('ko-KR'));
}

async function load(){
  setText('brainStatus','Registry와 Knowledge Graph를 검사하고 있습니다.');
  try{
    const registry=await window.SavingioArticleRegistry.load({force:true});
    const graph=window.SavingioBrainEngine.build(registry);
    const related=window.SavingioRelatedEngine.build(graph);
    const actions=window.SavingioActionChain.build(graph,related);
    const doctor=window.SavingioSearchDoctor.audit(registry);
    state={...state,registry,graph,related,actions,doctor};
    computeGraphHealth();renderMetrics();renderCategories();populateSelect(registry.records);renderList();
    setText('brainStatus',`Brain ${registry.records.length}개 노드가 연결되었습니다.`);
  }catch(error){
    console.error(error);
    setText('brainStatus',`Brain 로드 실패: ${error.message}`);
    $('#doctorSummary').className='summary-box fail';
    $('#doctorSummary').textContent=error.message;
  }
}

document.addEventListener('click',event=>{
  const button=event.target.closest('[data-view]');
  if(!button)return;
  state.activeView=button.dataset.view;
  document.querySelectorAll('[data-view]').forEach(node=>node.classList.toggle('active',node===button));
  renderList();
});
$('#refreshBrain').addEventListener('click',load);
$('#articleSelect').addEventListener('change',renderInspector);
$('#articleQuery').addEventListener('input',event=>{
  const query=event.target.value.trim().toLowerCase();
  const records=state.registry.records.filter(record=>`${record.title} ${record.href} ${record.category}`.toLowerCase().includes(query));
  populateSelect(records);
});
load();
})();

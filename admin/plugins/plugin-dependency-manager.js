(() => {
  'use strict';

  const clone=value=>JSON.parse(JSON.stringify(value));
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function manager(){
    if(!window.SavingioPluginManager) throw Object.assign(new Error('Plugin Manager가 준비되지 않았습니다.'),{code:'PLUGIN_MANAGER_NOT_READY'});
    return window.SavingioPluginManager;
  }

  function manifestEngine(){
    if(!window.SavingioPluginManifest) throw Object.assign(new Error('Plugin Manifest Engine이 준비되지 않았습니다.'),{code:'PLUGIN_MANIFEST_NOT_READY'});
    return window.SavingioPluginManifest;
  }

  function records(){ return manager().list(); }
  function byId(){ return new Map(records().map(item=>[item.id,item])); }

  function dependenciesOf(id){
    const plugin=manager().get(id);
    if(!plugin) throw Object.assign(new Error(`설치된 Plugin을 찾을 수 없습니다: ${id}`),{code:'PLUGIN_NOT_INSTALLED'});
    const installed=byId();
    return (plugin.manifest?.dependencies||[]).map(dep=>{
      const target=installed.get(dep.id)||null;
      const compatible=target ? manifestEngine().satisfies(target.version,dep.version) : false;
      return { ...clone(dep), installed:Boolean(target), installedVersion:target?.version||'', compatible, status:!target?(dep.optional?'optional-missing':'missing'):(compatible?'ready':'incompatible') };
    });
  }

  function dependantsOf(id){
    return records().filter(plugin=>(plugin.manifest?.dependencies||[]).some(dep=>dep.id===id)).map(plugin=>({
      id:plugin.id,
      name:plugin.name,
      version:plugin.version,
      dependency:(plugin.manifest.dependencies||[]).find(dep=>dep.id===id)
    }));
  }

  function graph(){
    const items=records();
    return {
      nodes:items.map(item=>({id:item.id,name:item.name,version:item.version,enabled:item.enabled})),
      edges:items.flatMap(item=>(item.manifest?.dependencies||[]).map(dep=>({from:item.id,to:dep.id,version:dep.version,optional:Boolean(dep.optional)})))
    };
  }

  function cycles(){
    const g=graph();
    const adj=new Map(g.nodes.map(node=>[node.id,[]]));
    g.edges.forEach(edge=>{ if(adj.has(edge.from)) adj.get(edge.from).push(edge.to); });
    const visiting=new Set(), visited=new Set(), stack=[], found=[];
    function walk(id){
      if(visiting.has(id)){
        const start=stack.indexOf(id);
        found.push([...stack.slice(start),id]);
        return;
      }
      if(visited.has(id)) return;
      visiting.add(id); stack.push(id);
      (adj.get(id)||[]).forEach(walk);
      stack.pop(); visiting.delete(id); visited.add(id);
    }
    g.nodes.forEach(node=>walk(node.id));
    return found;
  }

  function installOrder(ids=[]){
    const selected=new Set((ids.length?ids:records().map(item=>item.id)).map(String));
    const installed=byId();
    const order=[], temporary=new Set(), permanent=new Set(), missing=[];
    function visit(id){
      if(permanent.has(id)) return;
      if(temporary.has(id)) throw Object.assign(new Error(`순환 의존성이 감지되었습니다: ${id}`),{code:'PLUGIN_DEPENDENCY_CYCLE'});
      temporary.add(id);
      const plugin=installed.get(id);
      if(!plugin){ missing.push(id); temporary.delete(id); return; }
      (plugin.manifest?.dependencies||[]).filter(dep=>!dep.optional).forEach(dep=>visit(dep.id));
      temporary.delete(id); permanent.add(id); if(selected.has(id)) order.push(id);
    }
    [...selected].forEach(visit);
    return { order:[...new Set(order)], missing:[...new Set(missing)] };
  }

  function removalImpact(id){
    const direct=dependantsOf(id);
    const all=new Set();
    const queue=direct.map(item=>item.id);
    while(queue.length){
      const current=queue.shift();
      if(all.has(current)) continue;
      all.add(current);
      dependantsOf(current).forEach(item=>queue.push(item.id));
    }
    return { pluginId:id, direct:clone(direct), affected:[...all] };
  }

  function audit(){
    const errors=[], warnings=[];
    records().forEach(plugin=>dependenciesOf(plugin.id).forEach(dep=>{
      if(dep.status==='missing') errors.push(`MISSING:${plugin.id}:${dep.id}`);
      if(dep.status==='incompatible') errors.push(`INCOMPATIBLE:${plugin.id}:${dep.id}:${dep.version}`);
      if(dep.status==='optional-missing') warnings.push(`OPTIONAL_MISSING:${plugin.id}:${dep.id}`);
    }));
    cycles().forEach(cycle=>errors.push(`CYCLE:${cycle.join('>')}`));
    return { valid:errors.length===0, errors:[...new Set(errors)], warnings:[...new Set(warnings)], graph:graph(), installed:records().length };
  }

  function render(root){
    const report=audit();
    const items=records();
    root.innerHTML=`<section class="workboard-view"><header class="workboard-head"><div><p class="eyebrow">SAVINGIO PLUGIN DEPENDENCY</p><h3>Plugin 의존성 관리</h3><p>필수·선택 의존성, 버전 호환성, 순환 구조와 제거 영향도를 점검합니다.</p></div><div class="workboard-current"><small>검사 결과</small><strong>${report.valid?'PASS':'FAIL'}</strong><span>오류 ${report.errors.length} · 경고 ${report.warnings.length}</span></div></header><div class="workboard-layout"><main class="workboard-phases"><details open><summary><strong>의존성 상태</strong><span>${items.length}</span></summary><ul>${items.map(plugin=>{const deps=dependenciesOf(plugin.id);return `<li class="workboard-task ${deps.every(dep=>['ready','optional-missing'].includes(dep.status))?'done':'active'}"><span class="workboard-mark">${deps.length?'↳':'✓'}</span><span><strong>${esc(plugin.name)}</strong>${deps.length?deps.map(dep=>`${esc(dep.id)} ${esc(dep.version)} · ${esc(dep.status)}`).join(' / '):'의존성 없음'}</span><em>${dependantsOf(plugin.id).length}개가 참조</em></li>`;}).join('')}</ul></details></main><aside class="workboard-side"><section><h4>설치 순서</h4><p>${esc(installOrder().order.join(' → ')||'대상 없음')}</p></section><section><h4>순환 의존성</h4><p>${cycles().length?esc(cycles().map(item=>item.join(' → ')).join(', ')):'없음'}</p></section><section><h4>오류</h4><p>${report.errors.length?esc(report.errors.join(', ')):'없음'}</p></section></aside></div></section>`;
    return report;
  }

  window.SavingioPluginDependency=Object.freeze({dependenciesOf,dependantsOf,graph,cycles,installOrder,removalImpact,audit,render});
  window.dispatchEvent(new CustomEvent('savingio:plugin-dependency-ready',{detail:audit()}));
})();
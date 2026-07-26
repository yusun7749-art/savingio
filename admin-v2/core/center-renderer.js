(() => {
  'use strict';

  if(window.SavingioV2CenterRenderer)throw new Error('Admin V2 Center Renderer already exists');

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const metric=(label,value)=>`<article class="metric"><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`;
  const field=(definition,data)=>{
    const name=esc(definition.name);
    const label=esc(definition.label);
    const value=data[definition.name]??definition.default??'';
    if(definition.type==='select'){
      const options=(definition.options||[]).map(option=>{
        const optionValue=typeof option==='string'?option:option.value;
        const optionLabel=typeof option==='string'?option:option.label;
        return `<option value="${esc(optionValue)}"${String(optionValue)===String(value)?' selected':''}>${esc(optionLabel)}</option>`;
      }).join('');
      return `<label><span>${label}</span><select name="${name}">${options}</select></label>`;
    }
    if(definition.type==='textarea')return `<label><span>${label}</span><textarea name="${name}" rows="${Number(definition.rows||5)}" maxlength="${Number(definition.maxlength||4000)}" placeholder="${esc(definition.placeholder||'')}">${esc(value)}</textarea></label>`;
    return `<label><span>${label}</span><input name="${name}" type="${esc(definition.type||'text')}" maxlength="${Number(definition.maxlength||500)}" value="${esc(value)}" placeholder="${esc(definition.placeholder||'')}"></label>`;
  };
  const history=(items,columns)=>{
    if(!items?.length)return '<div class="empty">아직 저장된 확인 이력이 없습니다.</div>';
    return `<div class="connection-list">${items.map(item=>`<div><span>${esc(new Date(item.at).toLocaleString('ko-KR'))}<small class="meta">${esc(item.note||'운영 기록')}</small></span><strong>${esc(columns.map(column=>item[column]||'미확인').join(' · '))}</strong></div>`).join('')}</div>`;
  };

  function render(config,data,integrity={pass:true}){
    const metrics=(config.metrics||[]).map(item=>metric(item.label,typeof item.value==='function'?item.value(data,integrity):data[item.value]??'미확인')).join('');
    const lockRows=(config.locks||[]).map(item=>`<div><span>${esc(item.label)}</span><strong>${esc(typeof item.value==='function'?item.value(data,integrity):item.value)}</strong></div>`).join('');
    const fields=(config.fields||[]).map(item=>field(item,data)).join('');
    const externalRows=(config.external||[]).map(item=>`<div><span>${esc(item.label)}</span><strong>${esc(typeof item.value==='function'?item.value(data,integrity):item.value)}</strong></div>`).join('');
    return `<section class="view" data-module-root data-center-id="${esc(config.id)}"><header class="hero"><p>${esc(config.kicker||'ADMIN V2 CENTER')}</p><h2>${esc(config.title)}</h2><p>${esc(config.description||'')}</p></header><div class="metrics">${metrics}</div>${lockRows?`<section class="panel"><h3>${esc(config.lockTitle||'기본 LOCK')}</h3><div class="connection-list">${lockRows}</div></section>`:''}<section class="panel"><h3>${esc(config.formTitle||'상태 기록')}</h3><form id="${esc(config.formId)}"><div class="connection-list">${fields}</div><div class="header-actions"><button class="button" type="submit">${esc(config.saveLabel||'상태 저장')}</button>${config.resetAction?`<button class="button secondary" type="button" data-center-reset="${esc(config.resetAction)}">기록 초기화</button>`:''}</div></form></section>${config.historyColumns?`<section class="panel"><h3>최근 확인 이력</h3>${history(data.history,config.historyColumns)}</section>`:''}${externalRows?`<section class="panel"><h3>${esc(config.externalTitle||'외부 연결 상태')}</h3><div class="connection-list">${externalRows}</div></section>`:''}</section>`;
  }

  function formData(form,fields){
    const source=new FormData(form);
    return Object.fromEntries((fields||[]).map(field=>[field.name,String(source.get(field.name)??'')]));
  }

  const api=Object.freeze({render,formData,escape:esc,verify:()=>Object.freeze({pass:true,version:1,mode:'config-driven'})});
  Object.defineProperty(window,'SavingioV2CenterRenderer',{value:api,writable:false,configurable:false,enumerable:true});
})();
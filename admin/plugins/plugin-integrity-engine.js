(() => {
  'use strict';

  const TRUST_KEY='savingio-plugin-integrity-trust-v1';
  const HISTORY_KEY='savingio-plugin-integrity-history-v1';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const now=()=>new Date().toISOString();
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function readJson(key,fallback){
    try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}
    catch{return clone(fallback);}
  }

  function history(){
    const value=readJson(HISTORY_KEY,[]);
    return Array.isArray(value)?value:[];
  }

  function addHistory(action,detail={}){
    const items=history();
    items.unshift({id:`PINT-${Date.now()}`,action,detail:clone(detail),createdAt:now()});
    localStorage.setItem(HISTORY_KEY,JSON.stringify(items.slice(0,300)));
  }

  function trustPolicy(){
    const value=readJson(TRUST_KEY,{requireSignature:false,blockTampered:true,allowedPublishers:['Savingio'],trustedKeys:{}});
    return {
      requireSignature:Boolean(value.requireSignature),
      blockTampered:value.blockTampered!==false,
      allowedPublishers:Array.isArray(value.allowedPublishers)?[...new Set(value.allowedPublishers.map(String).filter(Boolean))]:['Savingio'],
      trustedKeys:value.trustedKeys&&typeof value.trustedKeys==='object'?clone(value.trustedKeys):{}
    };
  }

  function setTrustPolicy(next={}){
    const value={...trustPolicy(),...next};
    value.allowedPublishers=[...new Set((value.allowedPublishers||[]).map(String).filter(Boolean))];
    value.trustedKeys=value.trustedKeys&&typeof value.trustedKeys==='object'?value.trustedKeys:{};
    localStorage.setItem(TRUST_KEY,JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('savingio:plugin-integrity-policy',{detail:clone(value)}));
    return clone(value);
  }

  function stable(value){
    if(Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
    if(value&&typeof value==='object') return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
    return JSON.stringify(value);
  }

  function bytesToHex(buffer){
    return [...new Uint8Array(buffer)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  }

  async function sha256(value){
    if(!globalThis.crypto?.subtle) throw Object.assign(new Error('Web Crypto API를 사용할 수 없습니다.'),{code:'WEB_CRYPTO_UNAVAILABLE'});
    const bytes=new TextEncoder().encode(typeof value==='string'?value:stable(value));
    return bytesToHex(await crypto.subtle.digest('SHA-256',bytes));
  }

  function normalizeManifest(input={}){
    const source=input.manifest&&typeof input.manifest==='object'?input.manifest:input;
    const manifest=clone(source||{});
    delete manifest.signature;
    delete manifest.integrity;
    delete manifest.hash;
    delete manifest.checksum;
    return manifest;
  }

  function signatureOf(input={}){
    const source=input.manifest&&typeof input.manifest==='object'?input.manifest:input;
    const signature=source?.signature||input.signature||null;
    if(!signature) return null;
    if(typeof signature==='string') return {algorithm:'sha256',value:signature,publisher:source?.publisher||input.publisher||''};
    return {
      algorithm:String(signature.algorithm||'sha256').toLowerCase(),
      value:String(signature.value||signature.digest||''),
      publisher:String(signature.publisher||source?.publisher||input.publisher||''),
      keyId:String(signature.keyId||'')
    };
  }

  function expectedHashOf(input={}){
    const source=input.manifest&&typeof input.manifest==='object'?input.manifest:input;
    const raw=source?.integrity||source?.hash||source?.checksum||input.integrity||input.hash||input.checksum||'';
    return String(raw).replace(/^sha256[-:]/i,'').trim().toLowerCase();
  }

  function publisherAllowed(publisher,policy=trustPolicy()){
    if(!publisher) return !policy.requireSignature;
    return policy.allowedPublishers.length===0||policy.allowedPublishers.includes(publisher);
  }

  async function verify(input={},options={}){
    const policy={...trustPolicy(),...options};
    const manifest=normalizeManifest(input);
    const actualHash=await sha256(manifest);
    const expectedHash=expectedHashOf(input);
    const signature=signatureOf(input);
    const publisher=String(signature?.publisher||input.publisher||input.manifest?.publisher||manifest.publisher||'');
    const errors=[];
    const warnings=[];

    if(expectedHash&&expectedHash!==actualHash) errors.push('INTEGRITY_HASH_MISMATCH');
    if(!expectedHash) warnings.push('INTEGRITY_HASH_MISSING');
    if(policy.requireSignature&&!signature) errors.push('SIGNATURE_REQUIRED');
    if(signature&&signature.algorithm!=='sha256') errors.push('UNSUPPORTED_SIGNATURE_ALGORITHM');
    if(signature?.value&&signature.value.toLowerCase()!==actualHash) errors.push('SIGNATURE_MISMATCH');
    if(signature&&!signature.value) errors.push('SIGNATURE_VALUE_MISSING');
    if(!publisherAllowed(publisher,policy)) errors.push('UNTRUSTED_PUBLISHER');

    const valid=errors.length===0;
    const report={
      id:String(input.id||input.manifest?.id||manifest.id||''),
      version:String(input.version||input.manifest?.version||manifest.version||''),
      publisher,
      algorithm:'sha256',
      expectedHash,
      actualHash,
      signed:Boolean(signature),
      valid,
      blocked:!valid&&policy.blockTampered!==false,
      errors,
      warnings,
      checkedAt:now()
    };
    addHistory('verify',report);
    window.dispatchEvent(new CustomEvent(valid?'savingio:plugin-integrity-pass':'savingio:plugin-integrity-fail',{detail:clone(report)}));
    return report;
  }

  async function sign(input={},options={}){
    const manifest=normalizeManifest(input);
    const publisher=String(options.publisher||input.publisher||manifest.publisher||'Savingio');
    const digest=await sha256(manifest);
    const signed={...manifest,integrity:`sha256-${digest}`,signature:{algorithm:'sha256',value:digest,publisher,keyId:String(options.keyId||'local')}};
    addHistory('sign',{id:signed.id||'',version:signed.version||'',publisher,digest});
    return signed;
  }

  function installed(){
    return window.SavingioPluginManager?.list?.()||[];
  }

  async function verifyInstalled(options={}){
    const results=[];
    for(const plugin of installed()){
      try{results.push(await verify(plugin,options));}
      catch(error){results.push({id:plugin.id||'',valid:false,blocked:true,errors:[error?.code||'VERIFY_FAILED'],warnings:[],checkedAt:now()});}
    }
    const failed=results.filter(item=>!item.valid);
    const report={valid:failed.length===0,total:results.length,passed:results.length-failed.length,failed:failed.length,results,checkedAt:now()};
    addHistory('verify-installed',report);
    return report;
  }

  async function guard(input={},options={}){
    const report=await verify(input,options);
    if(report.blocked) throw Object.assign(new Error(`Plugin 무결성 검증 실패: ${report.id||'unknown'}`),{code:'PLUGIN_INTEGRITY_BLOCKED',integrityReport:report});
    return report;
  }

  async function audit(){
    const policy=trustPolicy();
    const report=await verifyInstalled({requireSignature:false,blockTampered:policy.blockTampered});
    return {...report,policy,history:history().length,webCrypto:Boolean(globalThis.crypto?.subtle)};
  }

  async function render(root){
    root.innerHTML='<section class="workboard-view"><header class="workboard-head"><div><p class="eyebrow">SAVINGIO PLUGIN INTEGRITY</p><h3>Plugin 서명·무결성 검사</h3><p>설치된 Plugin의 SHA-256 해시, 서명 상태, Publisher 신뢰 여부를 검사합니다.</p></div><div class="workboard-current"><small>검사 상태</small><strong data-integrity-status>검사 중</strong><span data-integrity-summary>잠시만 기다려 주세요.</span></div></header><div class="workboard-layout"><main class="workboard-phases" data-integrity-results></main><aside class="workboard-side"><section><h4>보안 정책</h4><label><input type="checkbox" data-require-signature> 서명 필수</label><label><input type="checkbox" data-block-tampered> 변조 Plugin 차단</label></section><section><h4>신뢰 Publisher</h4><p data-trusted-publishers></p></section><section><button type="button" data-integrity-rerun>다시 검사</button></section></aside></div></section>';
    const run=async()=>{
      const report=await audit();
      const status=root.querySelector('[data-integrity-status]');
      const summary=root.querySelector('[data-integrity-summary]');
      const results=root.querySelector('[data-integrity-results]');
      if(status) status.textContent=report.valid?'PASS':'FAIL';
      if(summary) summary.textContent=`전체 ${report.total} · 통과 ${report.passed} · 실패 ${report.failed}`;
      if(results) results.innerHTML=`<details open><summary><strong>무결성 검사 결과</strong><span>${report.total}</span></summary><ul>${report.results.map(item=>`<li class="workboard-task ${item.valid?'done':'active'}"><span class="workboard-mark">${item.valid?'✓':'!'}</span><span><strong>${esc(item.id||'unknown')}</strong>${esc(item.publisher||'publisher 없음')} · ${esc(item.actualHash||'hash 없음')}</span><em>${item.valid?'통과':esc(item.errors.join(', '))}</em></li>`).join('')||'<li>설치된 Plugin이 없습니다.</li>'}</ul></details>`;
      return report;
    };
    const policy=trustPolicy();
    const requireInput=root.querySelector('[data-require-signature]');
    const blockInput=root.querySelector('[data-block-tampered]');
    if(requireInput) requireInput.checked=policy.requireSignature;
    if(blockInput) blockInput.checked=policy.blockTampered;
    const publishers=root.querySelector('[data-trusted-publishers]');
    if(publishers) publishers.textContent=policy.allowedPublishers.join(', ')||'모든 Publisher 허용';
    requireInput?.addEventListener('change',async event=>{setTrustPolicy({requireSignature:event.currentTarget.checked});await run();});
    blockInput?.addEventListener('change',async event=>{setTrustPolicy({blockTampered:event.currentTarget.checked});await run();});
    root.querySelector('[data-integrity-rerun]')?.addEventListener('click',run);
    return run();
  }

  window.SavingioPluginIntegrity=Object.freeze({trustPolicy,setTrustPolicy,sha256,sign,verify,verifyInstalled,guard,history,audit,render});
  window.dispatchEvent(new CustomEvent('savingio:plugin-integrity-ready',{detail:{policy:trustPolicy()}}));
})();

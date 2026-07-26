(() => {
  'use strict';
  const KEY='savingio-admin-v2-build-progress';
  const defaults=Object.freeze({currentPhase:'공통 기반 구조',status:'in_progress',percent:'15',currentTask:'공통 Center Renderer 적용',completed:'MASTER LOG 전체 확인\n현재 Admin V2 구조 확인',remaining:'개발 진행 보드\nCloudflare Center\n회귀 검사\nMASTER LOG 갱신',note:'실제 구현·검증한 항목만 완료 처리',history:[]});
  const states=Object.freeze(['not_started','in_progress','blocked','verified','complete']);
  const clean=value=>String(value??'').trim();
  function read(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...defaults}}}
  function write(patch){const current=read();const percent=Math.max(0,Math.min(100,Number(patch.percent??current.percent)||0));const next={...current,...patch,percent:String(percent),history:[{at:new Date().toISOString(),note:clean(patch.note||current.note),status:clean(patch.status||current.status),percent:String(percent)},...(current.history||[])].slice(0,30)};localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent('savingio:v2-center-data-changed',{detail:{center:'build-progress'}}));return next}
  function reset(){localStorage.removeItem(KEY);window.dispatchEvent(new CustomEvent('savingio:v2-center-data-changed',{detail:{center:'build-progress'}}));return read()}
  function verify(){const data=read();return Object.freeze({pass:states.includes(data.status)&&Number(data.percent)>=0&&Number(data.percent)<=100,noFakeCompletion:data.status!=='complete'||Number(data.percent)===100});}
  Object.defineProperty(window,'SavingioV2BuildProgressStore',{value:Object.freeze({read,write,reset,verify,states}),writable:false,configurable:false});
})();
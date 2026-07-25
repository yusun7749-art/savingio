(() => {
  'use strict';

  const registry=window.SavingioV2Modules;
  const store=window.SavingioV2AdSenseStore;
  if(!registry||!store)throw new Error('AdSense Center dependencies are not loaded');

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const labels={unverified:'미확인',preparing:'준비 중',reviewing:'검토 중',ready:'준비 완료','needs-attention':'확인 필요',unknown:'미확인',found:'정상 확인',missing:'찾을 수 없음',mismatch:'값 불일치',inactive:'비활성',limited:'제한됨',active:'활성',clear:'문제 없음',warning:'경고',violation:'위반'};
  const label=value=>labels[value]||String(value||'미확인');
  const options=(values,current)=>values.map(value=>`<option value="${esc(value)}"${value===current?' selected':''}>${esc(label(value))}</option>`).join('');
  const metric=(name,value)=>`<article class="metric"><span>${esc(name)}</span><strong>${esc(value)}</strong></article>`;
  const time=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'미확인':date.toLocaleString('ko-KR');};

  function renderHistory(history){
    if(!history.length)return '<div class="empty">아직 저장된 확인 이력이 없습니다.</div>';
    return `<div class="connection-list">${history.map(item=>`<div><span>${esc(time(item.at))}<small class="meta">${esc(item.note||'운영자 기록')}</small></span><strong>${esc(label(item.siteStatus))} · ads.txt ${esc(label(item.adsTxtStatus))}</strong></div>`).join('')}</div>`;
  }

  registry.register({
    id:'tool-adsense',
    title:'AdSense 센터',
    render(){
      const data=store.read();
      const integrity=store.verify();
      return `<section class="view" data-module-root><header class="hero"><p>ADSENSE CENTER</p><h2>AdSense 센터</h2><p>Savingio의 AdSense 승인·ads.txt·광고 게재·정책 상태를 운영자가 실제 확인한 내용만 기록합니다.</p></header><div class="metrics">${metric('사이트 상태',label(data.siteStatus))}${metric('ads.txt',label(data.adsTxtStatus))}${metric('광고 게재',label(data.adServingStatus))}${metric('정책 상태',label(data.policyStatus))}${metric('수익 연결',data.revenueConnected?'연결됨':'미연결')}${metric('Publisher LOCK',integrity.publisherLock?'PASS':'FAIL')}</div><section class="panel"><h3>공식 설정 LOCK</h3><div class="connection-list"><div><span>사이트</span><strong>${esc(data.site)}</strong></div><div><span>Publisher ID</span><strong>${esc(data.publisherId)}</strong></div><div><span>Client ID</span><strong>${esc(data.clientId)}</strong></div><div><span>ads.txt 공식 값</span><strong>${esc(data.adsTxtLine)}</strong></div></div></section><section class="panel"><h3>상태 기록</h3><form id="adsenseStatusForm"><div class="connection-list"><label><span>사이트 승인 상태</span><select name="siteStatus">${options(store.siteStates,data.siteStatus)}</select></label><label><span>ads.txt 상태</span><select name="adsTxtStatus">${options(store.adsTxtStates,data.adsTxtStatus)}</select></label><label><span>광고 게재 상태</span><select name="adServingStatus">${options(store.adStates,data.adServingStatus)}</select></label><label><span>정책 상태</span><select name="policyStatus">${options(store.policyStates,data.policyStatus)}</select></label><label><span>수익 데이터 연결</span><select name="revenueConnected"><option value="false"${data.revenueConnected?'':' selected'}>미연결</option><option value="true"${data.revenueConnected?' selected':''}>연결됨</option></select></label><label><span>운영 메모</span><input name="note" maxlength="300" value="${esc(data.note)}" placeholder="AdSense에서 직접 확인한 내용만 입력"></label></div><div class="header-actions"><button class="button" type="submit">확인 상태 저장</button><button class="button secondary" type="button" data-adsense-action="reset">기록 초기화</button></div></form></section><section class="panel"><h3>최근 확인 이력</h3>${renderHistory(data.history)}</section><section class="panel"><h3>외부 연결 상태</h3><div class="connection-list"><div><span>AdSense API</span><strong>미연결</strong></div><div><span>실시간 승인 조회</span><strong>미연결</strong></div><div><span>실시간 수익 데이터</span><strong>미연결</strong></div><div><span>허위 상태·수익 생성 방지</span><strong>LOCK</strong></div></div></section></section>`;
    }
  });

  document.addEventListener('submit',event=>{const form=event.target.closest('#adsenseStatusForm');if(!form)return;event.preventDefault();const data=new FormData(form);store.write({siteStatus:String(data.get('siteStatus')),adsTxtStatus:String(data.get('adsTxtStatus')),adServingStatus:String(data.get('adServingStatus')),policyStatus:String(data.get('policyStatus')),revenueConnected:String(data.get('revenueConnected'))==='true',note:String(data.get('note')||'')});});
  document.addEventListener('click',event=>{const button=event.target.closest('[data-adsense-action="reset"]');if(!button)return;event.preventDefault();store.reset();});
})();

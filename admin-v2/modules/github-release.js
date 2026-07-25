(() => {
  'use strict';

  const registry=window.SavingioV2Modules;
  const store=window.SavingioV2GitHubReleaseStore;
  if(!registry||!store)throw new Error('GitHub Release Center dependencies are not loaded');

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const labels={unknown:'미확인',connected:'연결됨',disconnected:'미연결',error:'오류',pending:'대기',ready:'준비 완료',pushed:'푸시 완료',failed:'실패',draft:'초안',released:'릴리스 완료'};
  const label=value=>labels[value]||String(value||'미확인');
  const options=(values,current)=>values.map(value=>`<option value="${esc(value)}"${value===current?' selected':''}>${esc(label(value))}</option>`).join('');
  const metric=(name,value)=>`<article class="metric"><span>${esc(name)}</span><strong>${esc(value)}</strong></article>`;
  const time=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'미확인':date.toLocaleString('ko-KR');};

  function renderHistory(history){
    if(!history.length)return '<div class="empty">아직 저장된 릴리스 점검 이력이 없습니다.</div>';
    return `<div class="connection-list">${history.map(item=>`<div><span>${esc(time(item.at))}<small class="meta">${esc(item.operatorNote||'운영자 기록')}</small></span><strong>${esc(label(item.pushStatus))} · ${esc(label(item.releaseStatus))}</strong></div>`).join('')}</div>`;
  }

  registry.register({
    id:'tool-github-release',
    title:'GitHub Release 센터',
    render(){
      const data=store.read();
      const integrity=store.verify();
      return `<section class="view" data-module-root><header class="hero"><p>GITHUB RELEASE CENTER</p><h2>GitHub Release 센터</h2><p>Savingio main 브랜치의 커밋·푸시·릴리스 준비 상태를 운영자가 실제 확인한 내용만 기록합니다.</p></header><div class="metrics">${metric('연결 상태',label(data.connectionStatus))}${metric('Push 상태',label(data.pushStatus))}${metric('Release 상태',label(data.releaseStatus))}${metric('최근 Commit',data.lastCommitSha||'미확인')}${metric('GitHub API',data.apiConnected?'연결됨':'미연결')}${metric('Repository LOCK',integrity.repositoryLock?'PASS':'FAIL')}</div><section class="panel"><h3>저장소 LOCK</h3><div class="connection-list"><div><span>Repository</span><strong>${esc(data.repository)}</strong></div><div><span>Default branch</span><strong>${esc(data.branch)}</strong></div><div><span>허위 릴리스 방지</span><strong>${integrity.noFakeRelease?'LOCK':'FAIL'}</strong></div></div></section><section class="panel"><h3>릴리스 상태 기록</h3><form id="githubReleaseForm"><div class="connection-list"><label><span>GitHub 연결 상태</span><select name="connectionStatus">${options(store.connectionStates,data.connectionStatus)}</select></label><label><span>Push 상태</span><select name="pushStatus">${options(store.pushStates,data.pushStatus)}</select></label><label><span>Release 상태</span><select name="releaseStatus">${options(store.releaseStates,data.releaseStatus)}</select></label><label><span>최근 Commit SHA</span><input name="lastCommitSha" maxlength="40" value="${esc(data.lastCommitSha)}" placeholder="실제 확인한 commit SHA"></label><label><span>GitHub API 연결</span><select name="apiConnected"><option value="false"${data.apiConnected?'':' selected'}>미연결</option><option value="true"${data.apiConnected?' selected':''}>연결됨</option></select></label><label><span>변경 파일 목록</span><textarea name="changedFiles" rows="5" maxlength="2000" placeholder="실제 변경된 파일 경로를 한 줄씩 입력">${esc(data.changedFiles)}</textarea></label><label><span>Release notes</span><textarea name="releaseNotes" rows="7" maxlength="4000" placeholder="릴리스 설명 초안">${esc(data.releaseNotes)}</textarea></label><label><span>운영 메모</span><input name="operatorNote" maxlength="500" value="${esc(data.operatorNote)}" placeholder="직접 확인한 내용만 입력"></label></div><div class="header-actions"><button class="button" type="submit">릴리스 상태 저장</button><button class="button secondary" type="button" data-github-release-action="reset">기록 초기화</button></div></form></section><section class="panel"><h3>최근 점검 이력</h3>${renderHistory(data.history)}</section><section class="panel"><h3>외부 실행 상태</h3><div class="connection-list"><div><span>GitHub 실시간 API</span><strong>${data.apiConnected?'연결됨':'미연결'}</strong></div><div><span>실제 Release 생성</span><strong>미구현</strong></div><div><span>실제 Rollback 실행</span><strong>미구현</strong></div><div><span>Cloudflare 배포 확인</span><strong>별도 센터 예정</strong></div><div><span>허위 Push·Release 성공 생성 방지</span><strong>LOCK</strong></div></div></section></section>`;
    }
  });

  document.addEventListener('submit',event=>{const form=event.target.closest('#githubReleaseForm');if(!form)return;event.preventDefault();const data=new FormData(form);store.write({connectionStatus:String(data.get('connectionStatus')),pushStatus:String(data.get('pushStatus')),releaseStatus:String(data.get('releaseStatus')),lastCommitSha:String(data.get('lastCommitSha')||''),apiConnected:String(data.get('apiConnected'))==='true',changedFiles:String(data.get('changedFiles')||''),releaseNotes:String(data.get('releaseNotes')||''),operatorNote:String(data.get('operatorNote')||'')});});
  document.addEventListener('click',event=>{const button=event.target.closest('[data-github-release-action="reset"]');if(!button)return;event.preventDefault();store.reset();});
})();

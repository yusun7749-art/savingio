(() => {
  const threshold = 42;
  const state = { groups: [], articles: [] };
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stop = new Set(['방법','정리','가이드','확인','절약','신청','조회','기준','총정리','알아보기','하는법','2026','savingio']);
  const tokens = v => new Set(String(v||'').toLowerCase().replace(/[^0-9a-z가-힣\s]/g,' ').split(/\s+/).filter(x=>x.length>1&&!stop.has(x)));

  function similarity(a,b){
    const aa=tokens(a.title), bb=tokens(b.title);
    const hit=[...aa].filter(x=>bb.has(x)).length, union=new Set([...aa,...bb]).size||1;
    const title=Math.round(hit/union*100);
    const sa=new Set(((a.path||'').split('/').pop()||'').replace(/\.html$/,'').replace(/-20\d\d$/,'').split('-').filter(x=>x.length>2));
    const sb=new Set(((b.path||'').split('/').pop()||'').replace(/\.html$/,'').replace(/-20\d\d$/,'').split('-').filter(x=>x.length>2));
    const slug=Math.round([...sa].filter(x=>sb.has(x)).length/(new Set([...sa,...sb]).size||1)*100);
    return Math.max(title,Math.round(title*.7+slug*.3));
  }

  function readArticles(){
    return [...document.querySelectorAll('#contentApprovalRows tr[data-path]')].map(row=>{
      const link=row.querySelector('.content-title-cell a'), cells=row.children;
      return {row,title:link?.textContent.trim()||'',path:row.dataset.path||'',score:Number((cells[0]?.querySelector('strong')?.textContent||'0').replace(/\D/g,'')),length:Number((cells[5]?.textContent||'0').replace(/\D/g,''))};
    }).filter(x=>x.title&&x.path);
  }

  function buildGroups(articles){
    const parent=articles.map((_,i)=>i), find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));
    const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;}, scores=new Map();
    for(let i=0;i<articles.length;i++)for(let j=i+1;j<articles.length;j++){const s=similarity(articles[i],articles[j]);scores.set(`${i}:${j}`,s);if(s>=threshold)join(i,j);}
    const buckets=new Map();
    articles.forEach((article,i)=>{const root=find(i);if(!buckets.has(root))buckets.set(root,[]);buckets.get(root).push({...article,index:i});});
    return [...buckets.values()].filter(x=>x.length>1).map((items,index)=>{
      items.sort((a,b)=>b.score-a.score||b.length-a.length);const representative=items[0];
      const list=items.map((item,order)=>{const i=Math.min(item.index,representative.index),j=Math.max(item.index,representative.index);const match=item===representative?100:(scores.get(`${i}:${j}`)||similarity(item,representative));const action=order===0?'대표 유지':(item.score>=representative.score-10||item.length>=representative.length*.65?'통합 후보':'삭제 후보');return {...item,match,action};});
      return {id:`DUP-${String(index+1).padStart(3,'0')}`,items:list,representative,intent:representative.title};
    }).sort((a,b)=>b.items.length-a.items.length);
  }

  function ensureUI(){
    if(!$('#duplicateCenterSummary')) $('.content-toolbar')?.insertAdjacentHTML('beforebegin',`<section id="duplicateCenterSummary" class="duplicate-center-summary"><div><span>중복 그룹</span><strong id="dupGroupCount">0</strong></div><div><span>통합 후보</span><strong id="dupMergeCount">0</strong></div><div><span>삭제 후보</span><strong id="dupDeleteCount">0</strong></div><div><span>검토 완료</span><strong id="dupReviewedCount">0</strong></div><button class="btn ghost" id="openDuplicateCenter" type="button">중복센터 전체 보기</button></section><section class="new-topic-gate"><div><strong>새 글 중복 사전검사</strong><small>새 글을 만들기 전에 기존 대표글이 있는지 먼저 확인합니다.</small></div><input id="newTopicDuplicateInput" type="search" placeholder="새 글 주제 입력"><button class="btn primary" id="checkNewTopicDuplicate" type="button">신규 가능 여부 검사</button><p id="newTopicDuplicateResult"></p></section>`);
    if(!$('#duplicateCenterDialog')) document.body.insertAdjacentHTML('beforeend',`<dialog id="duplicateCenterDialog" class="duplicate-center-dialog"><section class="duplicate-center-shell"><header><div><p class="eyebrow">Savingio Duplicate Center</p><h2 id="duplicateDialogTitle">중복 글 비교</h2><p id="duplicateDialogMeta" class="meta"></p></div><button class="icon-btn" id="duplicateDialogClose" type="button">×</button></header><div id="duplicateGroupList" class="duplicate-group-list"></div><div id="duplicateGroupDetail" class="duplicate-group-detail"></div></section></dialog>`);
    if(!document.body.dataset.duplicateBound){document.body.dataset.duplicateBound='1';$('#openDuplicateCenter')?.addEventListener('click',()=>openCenter());$('#checkNewTopicDuplicate')?.addEventListener('click',checkTopic);$('#duplicateDialogClose')?.addEventListener('click',()=>$('#duplicateCenterDialog').close());}
  }

  const reviewed=group=>localStorage.getItem(`savingio-duplicate-reviewed:${group.id}`)==='yes';
  function renderSummary(){ensureUI();$('#dupGroupCount').textContent=state.groups.length;$('#dupMergeCount').textContent=state.groups.flatMap(g=>g.items).filter(x=>x.action==='통합 후보').length;$('#dupDeleteCount').textContent=state.groups.flatMap(g=>g.items).filter(x=>x.action==='삭제 후보').length;$('#dupReviewedCount').textContent=state.groups.filter(reviewed).length;}

  function decorateRows(){
    const byPath=new Map();state.groups.forEach(g=>g.items.forEach(i=>byPath.set(i.path,{g,i})));
    state.articles.forEach(article=>{const cell=article.row.children[4];if(!cell)return;const found=byPath.get(article.path);const html=found?`<button class="duplicate-group-button" type="button" data-duplicate-group="${found.g.id}"><strong>${found.g.id}</strong><span>${found.g.items.length}개 · ${esc(found.i.action)}</span><small>비교·정리하기</small></button>`:'<span class="duplicate-clear">중복 없음</span>';if(cell.dataset.duplicateHtml!==html){cell.dataset.duplicateHtml=html;cell.innerHTML=html;}});
    document.querySelectorAll('[data-duplicate-group]').forEach(button=>{if(button.dataset.bound)return;button.dataset.bound='1';button.addEventListener('click',()=>openCenter(button.dataset.duplicateGroup));});
  }

  function renderList(){
    $('#duplicateGroupList').innerHTML=state.groups.length?state.groups.map(g=>`<button type="button" data-group-id="${g.id}" class="duplicate-list-item ${reviewed(g)?'reviewed':''}"><strong>${g.id}</strong><span>${esc(g.intent)}</span><small>${g.items.length}개 · ${reviewed(g)?'검토 완료':'검토 필요'}</small></button>`).join(''):'<p class="content-empty">중복 그룹이 없습니다.</p>';
    document.querySelectorAll('[data-group-id]').forEach(b=>b.addEventListener('click',()=>showGroup(b.dataset.groupId)));
  }

  async function queueAction(g,i,action,button){
    const merge=action==='merge';
    const ok=confirm(merge?`대표글에 통합할 준비를 등록합니다.\n\n대표: ${g.representative.title}\n대상: ${i.title}\n\n원본 두 글을 백업하고 검토 단계로 이동합니다.`:`삭제 준비를 등록합니다.\n\n대표: ${g.representative.title}\n삭제 후보: ${i.title}\n\n원본 백업과 최종 승인 전에는 실제 삭제되지 않습니다.`);
    if(!ok)return;
    const original=button.textContent;button.disabled=true;button.textContent=merge?'통합 준비 중…':'삭제 준비 중…';
    try{
      const response=await fetch('/api/admin/content-action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,article:{path:i.path,title:i.title,score:i.score,duplicateGroup:g.id},representative:{path:g.representative.path,title:g.representative.title,score:g.representative.score},requestedAt:new Date().toISOString()})});
      const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'작업 등록 실패');
      localStorage.setItem(`savingio-duplicate-decision:${i.path}`,merge?'통합 준비 등록':'삭제 준비 등록');
      alert(result.message||'작업이 승인센터에 등록되었습니다.');showGroup(g.id);
    }catch(error){alert(`작업 등록 실패\n${error.message}`);button.disabled=false;button.textContent=original;}
  }

  function showGroup(id){
    const g=state.groups.find(x=>x.id===id)||state.groups[0];if(!g)return;
    $('#duplicateDialogTitle').textContent=`${g.id} 중복 비교`;$('#duplicateDialogMeta').textContent=`검색의도 대표: ${g.intent} · ${g.items.length}개 URL`;
    $('#duplicateGroupDetail').innerHTML=`<div class="duplicate-recommendation"><strong>대표 유지 추천</strong><a href="${esc(g.representative.path)}" target="_blank" rel="noopener">${esc(g.representative.title)}</a><p>품질 ${g.representative.score}점 · 본문 ${g.representative.length.toLocaleString()}자 기준으로 그룹 내 가장 강한 글입니다.</p></div><div class="duplicate-comparison-table"><table><thead><tr><th>추천</th><th>글</th><th>대표와 유사도</th><th>품질</th><th>본문</th><th>운영 판단</th><th>실행</th></tr></thead><tbody>${g.items.map(i=>{const representative=i.path===g.representative.path;const saved=localStorage.getItem(`savingio-duplicate-decision:${i.path}`);return `<tr><td><span class="dup-action ${representative?'keep':i.action==='통합 후보'?'merge':'delete'}">${i.action}</span></td><td><a href="${esc(i.path)}" target="_blank" rel="noopener">${esc(i.title)}</a><small>${esc(i.path)}</small></td><td>${i.match}%</td><td>${i.score}점</td><td>${i.length.toLocaleString()}자</td><td><select data-decision-path="${esc(i.path)}" ${representative?'disabled':''}><option ${i.action==='대표 유지'?'selected':''}>대표 유지</option><option ${i.action==='통합 후보'?'selected':''}>통합 후보</option><option ${i.action==='삭제 후보'?'selected':''}>삭제 후보</option><option>판단 보류</option></select>${saved?`<small class="duplicate-saved-state">${esc(saved)}</small>`:''}</td><td>${representative?'<span class="representative-lock">🔒 대표글</span>':`<div class="duplicate-execute-actions"><button type="button" class="dup-merge-btn" data-dup-execute="merge" data-path="${esc(i.path)}">통합 준비</button><button type="button" class="dup-delete-btn" data-dup-execute="delete" data-path="${esc(i.path)}">삭제 준비</button></div>`}</td></tr>`;}).join('')}</tbody></table></div><div class="duplicate-impact-note"><strong>안전 실행 순서</strong><span>원본 백업 → 통합/삭제 계획 검토 → 내부링크 점검 → 대표 URL 연결 → 사이트맵 정리 → 배포 후 URL 검증</span></div><p class="duplicate-action-message">통합·삭제 버튼은 즉시 사이트를 변경하지 않고 백업과 승인 검토 작업을 먼저 등록합니다.</p><div class="dialog-actions"><button class="btn ghost" id="duplicateHoldBtn" type="button">판단 보류</button><button class="btn primary" id="duplicateReviewDoneBtn" type="button">이 그룹 검토 완료</button></div>`;
    document.querySelectorAll('[data-dup-execute]').forEach(button=>button.addEventListener('click',()=>{const item=g.items.find(x=>x.path===button.dataset.path);if(item)queueAction(g,item,button.dataset.dupExecute,button);}));
    $('#duplicateReviewDoneBtn').addEventListener('click',()=>{document.querySelectorAll('[data-decision-path]').forEach(s=>localStorage.setItem(`savingio-duplicate-decision:${s.dataset.decisionPath}`,s.value));localStorage.setItem(`savingio-duplicate-reviewed:${g.id}`,'yes');renderList();renderSummary();showGroup(g.id);});
    $('#duplicateHoldBtn').addEventListener('click',()=>{localStorage.removeItem(`savingio-duplicate-reviewed:${g.id}`);renderList();renderSummary();});
  }

  function openCenter(id){ensureUI();renderList();showGroup(id);$('#duplicateCenterDialog').showModal();}
  function checkTopic(){const input=$('#newTopicDuplicateInput'),result=$('#newTopicDuplicateResult'),title=input?.value.trim();if(!title){result.textContent='검사할 새 글 주제를 입력해주세요.';result.className='warn';return;}const matches=state.articles.map(article=>({article,score:similarity({title,path:''},article)})).filter(x=>x.score>=threshold).sort((a,b)=>b.score-a.score);if(!matches.length){result.innerHTML='✅ <strong>신규 작성 가능</strong> · 현재 제목/검색의도 기준 중복 후보가 없습니다.';result.className='pass';return;}const best=matches[0];result.innerHTML=`⛔ <strong>새 글 생성 보류</strong> · 기존 대표 후보 <a href="${esc(best.article.path)}" target="_blank">${esc(best.article.title)}</a> (${best.score}% 유사). 기존 글 업데이트 또는 중복 그룹 검토가 먼저입니다.`;result.className='fail';}

  function refresh(){const articles=readArticles();if(!articles.length)return;state.articles=articles;state.groups=buildGroups(articles);renderSummary();decorateRows();}
  function start(){ensureUI();const body=$('#contentApprovalRows');if(body)new MutationObserver(()=>{clearTimeout(start.timer);start.timer=setTimeout(refresh,120);}).observe(body,{childList:true});document.addEventListener('savingio:content-audit-complete',refresh);refresh();}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();
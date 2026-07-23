(() => {
  const config = { threshold: 42 };
  const state = { groups: [], articles: [], activeGroup: null };
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
  const stopwords = new Set(['방법','정리','가이드','확인','절약','신청','조회','기준','총정리','알아보기','하는법','2026','savingio']);

  function tokens(value) {
    return new Set(String(value || '')
      .toLowerCase()
      .replace(/[^0-9a-z가-힣\s]/g, ' ')
      .split(/\s+/)
      .map(v => v.trim())
      .filter(v => v.length > 1 && !stopwords.has(v)));
  }

  function similarity(a, b) {
    const aa = tokens(a.title), bb = tokens(b.title);
    const intersection = [...aa].filter(token => bb.has(token)).length;
    const union = new Set([...aa, ...bb]).size || 1;
    const titleScore = Math.round(intersection / union * 100);
    const slugA = a.path.split('/').pop().replace(/-20\d\d$/,'');
    const slugB = b.path.split('/').pop().replace(/-20\d\d$/,'');
    const sa = new Set(slugA.split('-').filter(v => v.length > 2));
    const sb = new Set(slugB.split('-').filter(v => v.length > 2));
    const slugIntersection = [...sa].filter(v => sb.has(v)).length;
    const slugUnion = new Set([...sa, ...sb]).size || 1;
    const slugScore = Math.round(slugIntersection / slugUnion * 100);
    return Math.max(titleScore, Math.round(titleScore * .7 + slugScore * .3));
  }

  function readArticles() {
    return [...document.querySelectorAll('#contentApprovalRows tr[data-path]')].map(row => {
      const link = row.querySelector('.content-title-cell a');
      const cells = row.children;
      const score = Number((cells[0]?.querySelector('strong')?.textContent || '0').replace(/[^0-9]/g,''));
      const length = Number((cells[5]?.textContent || '0').replace(/[^0-9]/g,''));
      return { row, title: link?.textContent.trim() || '', path: row.dataset.path || link?.getAttribute('href') || '', score, length };
    }).filter(item => item.path && item.title);
  }

  function buildGroups(articles) {
    const parent = articles.map((_, i) => i);
    const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
    const union = (a,b) => { a=find(a); b=find(b); if (a!==b) parent[b]=a; };
    const pairScores = new Map();
    for (let i=0;i<articles.length;i++) for (let j=i+1;j<articles.length;j++) {
      const score = similarity(articles[i], articles[j]);
      pairScores.set(`${i}:${j}`, score);
      if (score >= config.threshold) union(i,j);
    }
    const buckets = new Map();
    articles.forEach((article,i) => {
      const root=find(i);
      if (!buckets.has(root)) buckets.set(root, []);
      buckets.get(root).push({ ...article, index:i });
    });
    return [...buckets.values()].filter(items => items.length > 1).map((items, idx) => {
      items.sort((a,b) => b.score-a.score || b.length-a.length);
      const representative = items[0];
      const enriched = items.map((item, order) => {
        const i=Math.min(item.index, representative.index), j=Math.max(item.index, representative.index);
        const match = item === representative ? 100 : (pairScores.get(`${i}:${j}`) || similarity(item, representative));
        const action = order === 0 ? '대표 유지' : (item.score >= representative.score-10 || item.length >= representative.length*.65 ? '통합 후보' : '삭제 후보');
        return { ...item, match, action };
      });
      return { id:`DUP-${String(idx+1).padStart(3,'0')}`, items:enriched, representative, intent: representative.title };
    }).sort((a,b) => b.items.length-a.items.length);
  }

  function ensureSummary() {
    if ($('#duplicateCenterSummary')) return;
    const toolbar = $('.content-toolbar');
    if (!toolbar) return;
    toolbar.insertAdjacentHTML('beforebegin', `
      <section id="duplicateCenterSummary" class="duplicate-center-summary">
        <div><span>중복 그룹</span><strong id="dupGroupCount">0</strong></div>
        <div><span>통합 후보</span><strong id="dupMergeCount">0</strong></div>
        <div><span>삭제 후보</span><strong id="dupDeleteCount">0</strong></div>
        <div><span>검토 완료</span><strong id="dupReviewedCount">0</strong></div>
        <button class="btn ghost" id="openDuplicateCenter" type="button">중복센터 전체 보기</button>
      </section>
      <section class="new-topic-gate">
        <div><strong>새 글 중복 사전검사</strong><small>새 글을 만들기 전에 기존 대표글이 있는지 먼저 확인합니다.</small></div>
        <input id="newTopicDuplicateInput" type="search" placeholder="새 글 주제 입력">
        <button class="btn primary" id="checkNewTopicDuplicate" type="button">신규 가능 여부 검사</button>
        <p id="newTopicDuplicateResult"></p>
      </section>`);
    $('#openDuplicateCenter')?.addEventListener('click', () => openCenter());
    $('#checkNewTopicDuplicate')?.addEventListener('click', checkNewTopic);
  }

  function ensureDialog() {
    if ($('#duplicateCenterDialog')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <dialog id="duplicateCenterDialog" class="duplicate-center-dialog">
        <section class="duplicate-center-shell">
          <header><div><p class="eyebrow">Savingio Duplicate Center</p><h2 id="duplicateDialogTitle">중복 글 비교</h2><p id="duplicateDialogMeta" class="meta"></p></div><button class="icon-btn" id="duplicateDialogClose" type="button">×</button></header>
          <div id="duplicateGroupList" class="duplicate-group-list"></div>
          <div id="duplicateGroupDetail" class="duplicate-group-detail"></div>
        </section>
      </dialog>`);
    $('#duplicateDialogClose')?.addEventListener('click', () => $('#duplicateCenterDialog').close());
  }

  function reviewedCount() {
    return state.groups.filter(group => localStorage.getItem(`savingio-duplicate-reviewed:${group.id}`)==='yes').length;
  }

  function renderSummary() {
    ensureSummary();
    const merge = state.groups.flatMap(g=>g.items).filter(i=>i.action==='통합 후보').length;
    const del = state.groups.flatMap(g=>g.items).filter(i=>i.action==='삭제 후보').length;
    $('#dupGroupCount').textContent=state.groups.length;
    $('#dupMergeCount').textContent=merge;
    $('#dupDeleteCount').textContent=del;
    $('#dupReviewedCount').textContent=reviewedCount();
  }

  function decorateRows() {
    const groupByPath = new Map();
    state.groups.forEach(group => group.items.forEach(item => groupByPath.set(item.path, group)));
    state.articles.forEach(article => {
      const cell = article.row.children[4];
      if (!cell) return;
      const group = groupByPath.get(article.path);
      if (!group) { cell.innerHTML='<span class="duplicate-clear">중복 없음</span>'; return; }
      const item = group.items.find(v=>v.path===article.path);
      cell.innerHTML=`<button class="duplicate-group-button" type="button" data-duplicate-group="${group.id}"><strong>${group.id}</strong><span>${group.items.length}개 · ${esc(item.action)}</span><small>비교하기</small></button>`;
    });
    document.querySelectorAll('[data-duplicate-group]').forEach(button => button.addEventListener('click', () => openCenter(button.dataset.duplicateGroup)));
  }

  function renderGroupList() {
    $('#duplicateGroupList').innerHTML = state.groups.length ? state.groups.map(group => {
      const reviewed=localStorage.getItem(`savingio-duplicate-reviewed:${group.id}`)==='yes';
      return `<button type="button" data-group-id="${group.id}" class="duplicate-list-item ${reviewed?'reviewed':''}"><strong>${group.id}</strong><span>${esc(group.intent)}</span><small>${group.items.length}개 · ${reviewed?'검토 완료':'검토 필요'}</small></button>`;
    }).join('') : '<p class="content-empty">중복 그룹이 없습니다.</p>';
    document.querySelectorAll('[data-group-id]').forEach(button => button.addEventListener('click',()=>showGroup(button.dataset.groupId)));
  }

  function showGroup(id) {
    const group=state.groups.find(g=>g.id===id) || state.groups[0];
    if (!group) return;
    state.activeGroup=group;
    $('#duplicateDialogTitle').textContent=`${group.id} 중복 비교`;
    $('#duplicateDialogMeta').textContent=`검색의도 대표: ${group.intent} · ${group.items.length}개 URL`;
    $('#duplicateGroupDetail').innerHTML=`
      <div class="duplicate-recommendation"><strong>대표 유지 추천</strong><a href="${esc(group.representative.path)}" target="_blank" rel="noopener">${esc(group.representative.title)}</a><p>품질 ${group.representative.score}점 · 본문 ${group.representative.length.toLocaleString()}자 기준으로 그룹 내 가장 강한 글입니다.</p></div>
      <div class="duplicate-comparison-table"><table><thead><tr><th>추천</th><th>글</th><th>대표와 유사도</th><th>품질</th><th>본문</th><th>운영 판단</th></tr></thead><tbody>${group.items.map(item=>`<tr><td><span class="dup-action ${item.action==='대표 유지'?'keep':item.action==='통합 후보'?'merge':'delete'}">${item.action}</span></td><td><a href="${esc(item.path)}" target="_blank" rel="noopener">${esc(item.title)}</a><small>${esc(item.path)}</small></td><td>${item.match}%</td><td>${item.score}점</td><td>${item.length.toLocaleString()}자</td><td><select data-decision-path="${esc(item.path)}"><option ${item.action==='대표 유지'?'selected':''}>대표 유지</option><option ${item.action==='통합 후보'?'selected':''}>통합 후보</option><option ${item.action==='삭제 후보'?'selected':''}>삭제 후보</option><option>판단 보류</option></select></td></tr>`).join('')}</tbody></table></div>
      <div class="duplicate-impact-note"><strong>삭제 전 필수 확인</strong><span>백업 → 내부링크 점검 → 대표 URL 연결 → 사이트맵 제거 → 배포 후 URL 검증</span></div>
      <div class="dialog-actions"><button class="btn ghost" id="duplicateHoldBtn" type="button">판단 보류</button><button class="btn primary" id="duplicateReviewDoneBtn" type="button">이 그룹 검토 완료</button></div>`;
    $('#duplicateReviewDoneBtn').addEventListener('click',()=>{
      document.querySelectorAll('[data-decision-path]').forEach(select=>localStorage.setItem(`savingio-duplicate-decision:${select.dataset.decisionPath}`,select.value));
      localStorage.setItem(`savingio-duplicate-reviewed:${group.id}`,'yes');
      renderGroupList(); renderSummary(); showGroup(group.id);
    });
    $('#duplicateHoldBtn').addEventListener('click',()=>{
      localStorage.removeItem(`savingio-duplicate-reviewed:${group.id}`);
      renderGroupList(); renderSummary();
    });
  }

  function openCenter(groupId) {
    ensureDialog(); renderGroupList(); showGroup(groupId); $('#duplicateCenterDialog').showModal();
  }

  function checkNewTopic() {
    const input=$('#newTopicDuplicateInput'); const result=$('#newTopicDuplicateResult');
    const title=input?.value.trim(); if (!title) { result.textContent='검사할 새 글 주제를 입력해주세요.'; result.className='warn'; return; }
    const probe={title,path:''};
    const matches=state.articles.map(article=>({article,score:similarity(probe,article)})).filter(v=>v.score>=config.threshold).sort((a,b)=>b.score-a.score);
    if (!matches.length) { result.innerHTML='✅ <strong>신규 작성 가능</strong> · 현재 제목/검색의도 기준 중복 후보가 없습니다.'; result.className='pass'; return; }
    const best=matches[0];
    result.innerHTML=`⛔ <strong>새 글 생성 보류</strong> · 기존 대표 후보 <a href="${esc(best.article.path)}" target="_blank">${esc(best.article.title)}</a> (${best.score}% 유사). 기존 글 업데이트 또는 중복 그룹 검토가 먼저입니다.`;
    result.className='fail';
  }

  function refresh() {
    const articles=readArticles();
    if (!articles.length) return;
    state.articles=articles;
    state.groups=buildGroups(articles);
    renderSummary(); decorateRows();
  }

  const observer=new MutationObserver(()=>{ clearTimeout(observer.timer); observer.timer=setTimeout(refresh,120); });
  const start=()=>{ ensureSummary(); ensureDialog(); const body=$('#contentApprovalRows'); if (body) observer.observe(body,{childList:true,subtree:true}); refresh(); };
  document.readyState==='loading' ? document.addEventListener('DOMContentLoaded',start) : start();
})();
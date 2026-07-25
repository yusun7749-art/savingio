(() => {
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  const workboard = {
    updated: '2026-07-25',
    currentPhase: 'Phase 5 — Plugin Store',
    currentTask: '5-10 전자책·디지털 상품 Plugin',
    phases: [
      { id:'phase-1', title:'Phase 1 — Module OS Foundation', tasks:[
        ['1-01','Module Registry 구축','done'],['1-02','Module Engine 구축','done'],['1-03','Module Workspace 구축','done'],['1-04','Module Manager 구축','done'],['1-05','관리자 페이지 로딩 연결','done']
      ]},
      { id:'phase-2', title:'Phase 2 — Workflow Engine', tasks:[
        ['2-01','Workflow Engine 기반 구축','done'],['2-02','Workflow Board 기반 구축','done'],['2-03','Workflow 실제 관리자 화면 검증','done'],['2-04','단계별 담당 본부 연결 검증','done'],['2-05','단계별 산출물 연결 검증','done'],['2-06','승인 이력 연결 검증','done'],['2-07','실행 로그 연결 검증','done'],['2-08','Workflow QA 검증','done']
      ]},
      { id:'phase-3', title:'Phase 3 — Project Engine', tasks:[
        ['3-01','공통 Project Schema 검증','done'],['3-02','새 프로젝트 생성 화면 연결 검증','done'],['3-03','프로젝트와 Asset 연결 검증','done'],['3-04','프로젝트와 Workflow 연결 검증','done'],['3-05','프로젝트 상세 통합 화면 검증','done'],['3-06','프로젝트 복제·보관·복구 검증','done'],['3-07','프로젝트 검색·필터·정렬 검증','done'],['3-08','Project Engine QA 실행 검증','done']
      ]},
      { id:'phase-4', title:'Phase 4 — Automation Engine', tasks:[
        ['4-01','승인 후 GitHub 작업 생성 검증','done'],['4-02','GitHub 반영 상태 확인 검증','done'],['4-03','Cloudflare 배포 상태 확인 검증','done'],['4-04','실제 URL 검증','done'],['4-05','실패 자동 기록·재시도','done'],['4-06','다음 작업 자동 생성','done'],['4-07','전체 중지·부분 재실행','done'],['4-08','Automation Engine QA','active']
      ]},
      { id:'phase-5', title:'Phase 5 — Plugin Store', tasks:[
        ['5-01','Plugin Manifest 규격','done'],['5-02','Plugin 설치·제거','done'],['5-03','메뉴·작업판 자동 생성','done'],['5-04','권한·데이터 격리','done'],['5-05','계산기 Plugin','done'],['5-06','심리테스트 Plugin','done'],['5-07','게임 Plugin','done'],['5-08','이미지 스토어 Plugin','done'],['5-09','쿠폰·제휴 Plugin','done'],['5-10','전자책·디지털 상품 Plugin','active'],['5-11','Plugin Store QA','todo']
      ]}
    ],
    duplicateRules: ['같은 작업명','이름만 다르고 목적이 같은 작업','같은 화면·파일을 수정하는 작업','이미 완료된 작업의 재검증','기존 작업의 하위 단계']
  };

  function counts() { const tasks=workboard.phases.flatMap(phase=>phase.tasks); return {total:tasks.length,done:tasks.filter(task=>task[2]==='done').length,active:tasks.filter(task=>task[2]==='active').length,todo:tasks.filter(task=>task[2]==='todo').length}; }
  function renderTask(task) { const [id,title,status]=task; const label=status==='done'?'완료':status==='active'?'진행 중':'예정'; const mark=status==='done'?'✓':status==='active'?'●':'○'; return `<li class="workboard-task ${status}"><span class="workboard-mark">${mark}</span><span><strong>${esc(id)}</strong>${esc(title)}</span><em>${label}</em></li>`; }
  function render() { const board=$('#departmentBoard'); if(!board)return; const stat=counts(); const progress=stat.total?Math.round(stat.done/stat.total*100):0; board.innerHTML=`<section class="workboard-view"><header class="workboard-head"><div><p class="eyebrow">SAVINGIO OS WORKBOARD</p><h3>전체 작업표</h3><p>완료 항목은 지우지 않고 유지하며, 새 작업은 중복 검사 후 기존 항목에 병합하거나 새 번호로 등록합니다.</p></div><div class="workboard-current"><small>현재 작업</small><strong>${esc(workboard.currentTask)}</strong><span>${esc(workboard.currentPhase)}</span></div></header><div class="workboard-summary"><article><small>전체</small><strong>${stat.total}</strong></article><article><small>완료</small><strong>${stat.done}</strong></article><article><small>진행 중</small><strong>${stat.active}</strong></article><article><small>예정</small><strong>${stat.todo}</strong></article><article class="wide"><small>전체 진행률</small><strong>${progress}%</strong><span class="workboard-progress"><i style="width:${progress}%"></i></span></article></div><div class="workboard-layout"><main class="workboard-phases">${workboard.phases.map(phase=>`<details ${phase.tasks.some(task=>task[2]==='active')?'open':''}><summary><strong>${esc(phase.title)}</strong><span>${phase.tasks.filter(task=>task[2]==='done').length}/${phase.tasks.length}</span></summary><ul>${phase.tasks.map(renderTask).join('')}</ul></details>`).join('')}</main><aside class="workboard-side"><section><h4>중복 등록 방지</h4><p>새 요청은 아래 기준을 먼저 비교합니다.</p><ul>${workboard.duplicateRules.map(rule=>`<li>${esc(rule)}</li>`).join('')}</ul></section><section><h4>등록 판정</h4><span class="decision new">신규 등록</span><span class="decision merge">기존 항목 병합</span><span class="decision verify">완료 항목 재검증</span><span class="decision skip">중복 제외</span></section><section><h4>마지막 갱신</h4><p>${esc(workboard.updated)} KST</p></section></aside></div></section>`; }
  function shouldOpen(target){const title=target.closest('.tree-title');const child=target.closest('.tree-child');const childName=child?.dataset.child||child?.textContent.trim();return title?.dataset.dept==='command'||(child&&child.closest('.tree-group')?.querySelector('.tree-title')?.dataset.dept==='command'&&['전체 진행률','오늘 작업'].includes(childName));}
  function boot(){const link=document.createElement('link');link.rel='stylesheet';link.href='/admin/os/workboard-board.css';document.head.appendChild(link);$('#treeNav')?.addEventListener('click',event=>{if(!shouldOpen(event.target))return;event.stopImmediatePropagation();render();},true);window.SavingioWorkboard={render,data:workboard};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
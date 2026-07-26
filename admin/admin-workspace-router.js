(() => {
  'use strict';
  const data=window.SAVINGIO_ADMIN_DATA;
  const nav=document.getElementById('treeNav');
  const pageTitle=document.getElementById('pageTitle');
  const main=document.querySelector('.main');
  const securityNotice=document.getElementById('securityNotice');
  const stats=document.getElementById('stats');
  const workspaceGrid=document.querySelector('.workspace-grid');
  const contentCenter=document.getElementById('contentApprovalCenter');
  const departmentPanel=document.querySelector('.department-panel');
  const departmentBoard=document.getElementById('departmentBoard');
  const departmentTitle=document.getElementById('departmentTitle');
  if(!data||!nav||!pageTitle||!main||!stats||!workspaceGrid||!contentCenter||!departmentPanel||!departmentBoard) return;

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const routes=new Map();
  data.departments.forEach(department=>{
    routes.set(department.id,{department,child:'',title:department.name});
    department.children.forEach((child,index)=>routes.set(`${department.id}:${index}`,{department,child,title:child}));
  });

  const homeParts=[securityNotice,stats,workspaceGrid].filter(Boolean);
  const allViews=[...homeParts,contentCenter,departmentPanel];
  const childPurpose={
    command:['전체 프로젝트와 긴급 상태를 요약합니다.','오늘 처리할 작업만 확인합니다.','승인 대기 항목을 확인합니다.','오류·중지 작업을 확인합니다.','수익과 성과 요약을 확인합니다.'],
    market:['새 주제의 수요와 검색 의도를 분석합니다.','판매 가능성이 높은 제품 후보를 정리합니다.','영상과 쇼츠 소재를 분석합니다.','댓글에서 실제 질문과 불편을 찾습니다.','경쟁 강도와 제작 난도를 비교합니다.','지금 제작할 우선순위를 결정합니다.'],
    content:['신규 글 제작 대기열을 관리합니다.','기존 글 재작성과 승인 상태를 관리합니다.','검색 노출과 메타데이터를 점검합니다.','이미지 제작과 사용 상태를 확인합니다.','관련 글과 계산기 연결을 확인합니다.','계산기 제작·연결 상태를 관리합니다.','헌법·DNA·품질 검사를 실행합니다.'],
    video:['영상 주제와 목표를 정합니다.','대본 작성 상태를 관리합니다.','장면별 구성을 정리합니다.','이미지와 영상 소재를 관리합니다.','음성 제작 상태를 확인합니다.','자막 생성과 검수를 관리합니다.','완성 영상과 게시 준비 상태를 확인합니다.'],
    social:['YouTube Shorts 게시 상태를 확인합니다.','Instagram Reels 게시 상태를 확인합니다.','Threads 게시 상태를 확인합니다.','Facebook 게시 상태를 확인합니다.','Pinterest 게시 상태를 확인합니다.','예약 발행 일정을 관리합니다.'],
    product:['상품 데이터와 상태를 관리합니다.','제휴 링크 연결 상태를 확인합니다.','상품과 콘텐츠 연결을 관리합니다.','클릭 데이터를 확인합니다.','전환 데이터를 확인합니다.','수익과 정산 내역을 확인합니다.'],
    approval:['글 승인 대기열을 확인합니다.','이미지 승인 대기열을 확인합니다.','영상 승인 대기열을 확인합니다.','상품 승인 대기열을 확인합니다.','발행 최종 승인을 처리합니다.','반려와 수정 요청을 관리합니다.'],
    automation:['전체 워크플로를 관리합니다.','실행 예정 작업을 확인합니다.','실행 중 작업을 확인합니다.','완료 작업을 확인합니다.','실패 작업과 원인을 확인합니다.','재실행 대상을 관리합니다.','긴급 중지 상태를 관리합니다.'],
    analytics:['검색 유입을 확인합니다.','SNS 유입을 확인합니다.','영상 성과를 확인합니다.','상품 전환을 확인합니다.','AdSense 상태와 수익을 확인합니다.','다음 제작 주제를 결정합니다.'],
    system:['대·중·소분류를 관리합니다.','외부 API 연결 상태를 확인합니다.','Publisher ID 잠금을 확인합니다.','GitHub 반영 상태를 확인합니다.','Cloudflare 배포 상태를 확인합니다.','백업과 운영 기록을 확인합니다.']
  };

  function hideAll(){allViews.forEach(element=>{if(element)element.hidden=true;});}
  function setActive(routeId){
    nav.querySelectorAll('.tree-title,.tree-child').forEach(item=>item.classList.remove('active'));
    const route=routes.get(routeId)||routes.get('command');
    const title=nav.querySelector(`.tree-title[data-dept="${CSS.escape(route.department.id)}"]`);
    title?.classList.add('active');
    title?.closest('.tree-group')?.classList.add('open');
    if(route.child){
      const index=route.department.children.indexOf(route.child);
      nav.querySelector(`.tree-title[data-dept="${CSS.escape(route.department.id)}"]`)?.closest('.tree-group')?.querySelector(`.tree-child:nth-child(${index+1})`)?.classList.add('active');
    }
  }
  function syncUrl(routeId,replace=false){const url=new URL(location.href);url.searchParams.set('view',routeId);history[replace?'replaceState':'pushState']({view:routeId},'',url.pathname+url.search);}

  function compactProjectHome(){
    const list=document.getElementById('projectList');
    if(!list||list.dataset.compact==='true')return;
    list.classList.add('project-table-list');
    list.dataset.compact='true';
  }

  function renderDepartment(route){
    const department=route.department;
    const selectedChild=route.child;
    const rows=department.children.map((child,index)=>{
      const active=child===selectedChild;
      const purpose=childPurpose[department.id]?.[index]||`${child} 운영 화면`;
      return `<button class="workspace-row${active?' active':''}" type="button" data-workspace-route="${esc(`${department.id}:${index}`)}"><span class="workspace-row-name">${esc(child)}</span><span class="workspace-row-purpose">${esc(purpose)}</span><strong>${active?'현재 화면':'열기 →'}</strong></button>`;
    }).join('');
    departmentTitle.textContent=selectedChild||`${department.name} 전체`;
    departmentBoard.innerHTML=`<div class="workspace-heading"><p>${esc(department.name)}</p><h3>${esc(selectedChild||'업무 목록')}</h3><span>${esc(selectedChild?childPurpose[department.id]?.[department.children.indexOf(selectedChild)]||'선택한 업무 화면입니다.':'필요한 업무를 선택하면 이 영역에 해당 내용만 표시됩니다.')}</span></div><div class="workspace-list">${rows}</div>${selectedChild?`<section class="workspace-detail"><h3>${esc(selectedChild)}</h3><p>${esc(childPurpose[department.id]?.[department.children.indexOf(selectedChild)]||'선택한 업무를 관리합니다.')}</p><div class="workspace-empty-state">현재 연결된 실제 데이터가 이 표에 표시됩니다. 데이터가 없는 항목은 없는 상태 그대로 유지합니다.</div></section>`:''}`;
  }

  function mount(routeId,options={}){
    const route=routes.get(routeId)||routes.get('command');
    const resolved=[...routes.entries()].find(([,value])=>value===route)?.[0]||'command';
    hideAll();
    setActive(resolved);
    pageTitle.textContent=route.child||route.department.name;
    if(route.department.id==='command'){
      homeParts.forEach(element=>{if(element)element.hidden=false;});
      compactProjectHome();
    }else if(route.department.id==='content'&&(!route.child||['기존 글 재작성','콘텐츠 QA'].includes(route.child))){
      contentCenter.hidden=false;
      if(route.child) contentCenter.dataset.activeSection=route.child;
    }else{
      departmentPanel.hidden=false;
      renderDepartment(route);
    }
    document.documentElement.dataset.adminView=resolved;
    if(!options.noHistory)syncUrl(resolved,Boolean(options.replace));
    window.dispatchEvent(new CustomEvent('savingio:admin-view-changed',{detail:{route:resolved,department:route.department.id,child:route.child}}));
  }

  nav.addEventListener('click',event=>{
    const child=event.target.closest('.tree-child');
    const title=event.target.closest('.tree-title');
    if(!child&&!title)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(title){
      const id=title.dataset.dept;
      title.closest('.tree-group')?.classList.add('open');
      mount(id);
      return;
    }
    const group=child.closest('.tree-group');
    const departmentId=group?.querySelector('.tree-title')?.dataset.dept;
    const children=[...group.querySelectorAll('.tree-child')];
    const index=children.indexOf(child);
    mount(`${departmentId}:${index}`);
  },true);

  departmentBoard.addEventListener('click',event=>{const button=event.target.closest('[data-workspace-route]');if(button)mount(button.dataset.workspaceRoute);});
  window.addEventListener('popstate',event=>mount(event.state?.view||new URLSearchParams(location.search).get('view')||'command',{noHistory:true}));
  const initial=new URLSearchParams(location.search).get('view')||'command';
  queueMicrotask(()=>mount(initial,{replace:true}));
  Object.defineProperty(window,'SavingioAdminWorkspaceRouter',{value:Object.freeze({mount,routes:[...routes.keys()],verify(){const routeCount=routes.size;return Object.freeze({pass:routeCount===data.departments.reduce((sum,item)=>sum+item.children.length+1,0),routeCount,current:document.documentElement.dataset.adminView||''});}}),writable:false,configurable:false});
})();
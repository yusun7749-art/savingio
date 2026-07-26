(() => {
  'use strict';
  const data=window.SAVINGIO_ADMIN_DATA;
  const nav=document.getElementById('treeNav');
  const pageTitle=document.getElementById('pageTitle');
  const main=document.querySelector('.main');
  if(!data||!nav||!pageTitle||!main)return;

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const routes=new Map();
  data.departments.forEach(department=>{
    routes.set(department.id,{department,child:'',title:department.name});
    department.children.forEach((child,index)=>routes.set(`${department.id}:${index}`,{department,child,title:child}));
  });

  const purpose={
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

  let workspace=document.getElementById('adminWorkspace');
  if(!workspace){
    workspace=document.createElement('section');
    workspace.id='adminWorkspace';
    workspace.className='admin-workspace panel';
    workspace.hidden=true;
    main.appendChild(workspace);
  }

  const legacyNodes=()=>[...main.children].filter(node=>node!==workspace&&!node.matches('header.topbar'));
  function showHome(){legacyNodes().forEach(node=>node.hidden=false);workspace.hidden=true;main.dataset.routeMode='home';}
  function showWorkspace(){legacyNodes().forEach(node=>node.hidden=true);workspace.hidden=false;main.dataset.routeMode='workspace';}

  function setActive(routeId){
    nav.querySelectorAll('.tree-title,.tree-child').forEach(item=>item.classList.remove('active'));
    const route=routes.get(routeId)||routes.get('command');
    const title=nav.querySelector(`.tree-title[data-dept="${CSS.escape(route.department.id)}"]`);
    title?.classList.add('active');
    title?.closest('.tree-group')?.classList.add('open');
    if(route.child){
      const index=route.department.children.indexOf(route.child);
      title?.closest('.tree-group')?.querySelector(`.tree-child:nth-child(${index+1})`)?.classList.add('active');
    }
  }

  function projectRows(filter='all'){
    const rows=(data.projects||[]).filter(project=>filter==='all'||project.status===filter).map(project=>`<tr><td><strong>${esc(project.title)}</strong><small>${esc(project.id)} · ${esc(project.category)}</small></td><td><span class="status ${esc(project.status)}">${esc(project.statusLabel)}</span></td><td>${Number(project.progress)||0}%</td><td>${esc(project.updated)}</td><td><button class="workspace-open-btn" type="button">열기</button></td></tr>`).join('');
    return rows||'<tr><td colspan="5" class="workspace-table-empty">표시할 실제 데이터가 없습니다.</td></tr>';
  }

  function render(routeId,route){
    const department=route.department;
    const selectedIndex=route.child?department.children.indexOf(route.child):-1;
    const intro=selectedIndex>=0?(purpose[department.id]?.[selectedIndex]||'선택한 업무를 관리합니다.'):`${department.name}의 업무를 선택하세요.`;
    let body='';

    if(department.id==='command'&&route.child){
      const map={1:'running',2:'approval',3:'error'};
      if(selectedIndex===4){
        body='<div class="workspace-empty-state">실제 수익 데이터 연결 전입니다. 임의 수치는 표시하지 않습니다.</div>';
      }else{
        body=`<div class="workspace-table-wrap"><table class="workspace-table"><thead><tr><th>프로젝트</th><th>상태</th><th>진행률</th><th>최근 변경</th><th>작업</th></tr></thead><tbody>${projectRows(selectedIndex===0?'all':map[selectedIndex]||'all')}</tbody></table></div>`;
      }
    }else{
      const menu=department.children.map((child,index)=>`<button class="workspace-menu-row${index===selectedIndex?' active':''}" type="button" data-workspace-route="${esc(`${department.id}:${index}`)}"><span><strong>${esc(child)}</strong><small>${esc(purpose[department.id]?.[index]||'운영 화면')}</small></span><b>${index===selectedIndex?'현재':'열기 →'}</b></button>`).join('');
      body=`<div class="workspace-split"><aside class="workspace-subnav">${menu}</aside><section class="workspace-content"><h3>${esc(route.child||department.name)}</h3><p>${esc(intro)}</p>${route.child?'<div class="workspace-empty-state">이 영역에 해당 카테고리의 실제 표·목록·도구가 연결됩니다. 연결되지 않은 데이터는 비어 있는 상태로 표시합니다.</div>':'<div class="workspace-empty-state">왼쪽 업무 목록에서 항목을 선택하세요.</div>'}</section></div>`;
    }

    workspace.innerHTML=`<header class="workspace-top"><div><p>${esc(department.name)}</p><h2>${esc(route.child||department.name)}</h2><span>${esc(intro)}</span></div><button type="button" class="workspace-home-btn" data-workspace-home>메인으로</button></header>${body}`;
    workspace.querySelectorAll('[data-workspace-route]').forEach(button=>button.addEventListener('click',()=>mount(button.dataset.workspaceRoute)));
    workspace.querySelector('[data-workspace-home]')?.addEventListener('click',()=>mount('command'));
  }

  function syncUrl(routeId,replace=false){const url=new URL(location.href);url.searchParams.set('view',routeId);history[replace?'replaceState':'pushState']({view:routeId},'',url.pathname+url.search);}

  function mount(routeId,options={}){
    const resolved=routes.has(routeId)?routeId:'command';
    const route=routes.get(resolved);
    setActive(resolved);
    pageTitle.textContent=route.child||route.department.name;
    if(resolved==='command')showHome();
    else{showWorkspace();render(resolved,route);}
    document.documentElement.dataset.adminView=resolved;
    if(!options.noHistory)syncUrl(resolved,Boolean(options.replace));
    window.scrollTo({top:0,behavior:'auto'});
  }

  nav.addEventListener('click',event=>{
    const child=event.target.closest('.tree-child');
    const title=event.target.closest('.tree-title');
    if(!child&&!title)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(title){mount(title.dataset.dept);return;}
    const group=child.closest('.tree-group');
    const departmentId=group?.querySelector('.tree-title')?.dataset.dept;
    const index=[...group.querySelectorAll('.tree-child')].indexOf(child);
    mount(`${departmentId}:${index}`);
  },true);

  const observer=new MutationObserver(()=>{
    const current=document.documentElement.dataset.adminView||'command';
    if(current!=='command')showWorkspace();
  });
  observer.observe(main,{childList:true});
  window.addEventListener('popstate',event=>mount(event.state?.view||new URLSearchParams(location.search).get('view')||'command',{noHistory:true}));
  mount(new URLSearchParams(location.search).get('view')||'command',{replace:true});

  Object.defineProperty(window,'SavingioAdminWorkspaceRouter',{value:Object.freeze({mount,routes:[...routes.keys()],verify(){const visibleLegacy=legacyNodes().filter(node=>!node.hidden);const current=document.documentElement.dataset.adminView||'';return Object.freeze({pass:current==='command'?workspace.hidden:(!workspace.hidden&&visibleLegacy.length===0),current,workspaceVisible:!workspace.hidden,visibleLegacy:visibleLegacy.map(node=>node.id||node.className)});}}),writable:false,configurable:false});
})();
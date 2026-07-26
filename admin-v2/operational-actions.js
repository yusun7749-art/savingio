(() => {
  'use strict';
  const command=window.SavingioV2CommandCenter;
  const workspace=document.getElementById('adminWorkspace');
  if(!command||!workspace)throw new Error('Operational Actions dependencies are not loaded');
  function handle(event){
    const button=event.target.closest('[data-operational-action][data-operational-kind][data-operational-id]');
    if(!button)return;
    event.preventDefault();
    event.stopPropagation();
    try{
      command.handleOperationalAction(button.dataset.operationalAction,button.dataset.operationalKind,button.dataset.operationalId);
      alert('긴급 수정 워크플로를 생성했습니다.');
    }catch(error){alert(`긴급 수정 작업 생성 실패\n${error.message}`);}
  }
  workspace.addEventListener('click',handle,true);
  Object.defineProperty(window,'SavingioV2OperationalActions',{value:Object.freeze({verify(){return Object.freeze({pass:Boolean(command.handleOperationalAction&&workspace),workspace:Boolean(workspace)});}}),writable:false,configurable:false});
})();
(() => {
  'use strict';
  window.addEventListener('savingio:v2-center-data-changed',()=>{
    const admin=window.SavingioAdminV2;
    if(!admin||typeof admin.mount!=='function')return;
    admin.mount(admin.activeId||'command-home','replace');
  });
})();
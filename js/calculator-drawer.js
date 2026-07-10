(function(){
  const body=document.body;
  const trigger=document.querySelector('.sv-calc-trigger');
  const drawer=document.querySelector('.sv-calc-drawer');
  const backdrop=document.querySelector('.sv-calc-backdrop');
  const close=document.querySelector('.sv-drawer-close');
  if(!trigger||!drawer||!backdrop||!close)return;
  const open=()=>{body.classList.add('sv-calc-open');trigger.setAttribute('aria-expanded','true');drawer.setAttribute('aria-hidden','false');close.focus();};
  const shut=()=>{body.classList.remove('sv-calc-open');trigger.setAttribute('aria-expanded','false');drawer.setAttribute('aria-hidden','true');trigger.focus();};
  trigger.addEventListener('click',open);close.addEventListener('click',shut);backdrop.addEventListener('click',shut);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&body.classList.contains('sv-calc-open'))shut();});
})();
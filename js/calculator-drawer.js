(function(){
  const removeReleaseBadge=()=>{
    document.querySelectorAll('body *').forEach((element)=>{
      if(element.children.length)return;
      const text=(element.textContent||'').replace(/\s+/g,' ').trim();
      if(/V2\.177/i.test(text)||/RELEASE\s*READY/i.test(text))element.remove();
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',removeReleaseBadge,{once:true});
  else removeReleaseBadge();
  new MutationObserver(removeReleaseBadge).observe(document.documentElement,{childList:true,subtree:true});

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
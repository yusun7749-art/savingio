(() => {
  'use strict';

  if(window.SavingioV2GitHubReleaseStore)throw new Error('GitHub Release Store already exists');

  const STORAGE_KEY='savingio-admin-v2-github-release';
  const REPOSITORY='yusun7749-art/savingio';
  const DEFAULT_BRANCH='main';
  const CONNECTION_STATES=Object.freeze(['unknown','connected','disconnected','error']);
  const PUSH_STATES=Object.freeze(['unknown','pending','ready','pushed','failed']);
  const RELEASE_STATES=Object.freeze(['draft','ready','released','failed']);
  const clone=value=>JSON.parse(JSON.stringify(value));
  const now=()=>new Date().toISOString();
  const text=(value,max=500)=>String(value||'').trim().slice(0,max);
  const validSha=value=>/^[0-9a-f]{7,40}$/i.test(String(value||'').trim())?String(value).trim():'';

  const normalize=(value={})=>({
    repository:REPOSITORY,
    branch:DEFAULT_BRANCH,
    connectionStatus:CONNECTION_STATES.includes(value.connectionStatus)?value.connectionStatus:'unknown',
    pushStatus:PUSH_STATES.includes(value.pushStatus)?value.pushStatus:'unknown',
    releaseStatus:RELEASE_STATES.includes(value.releaseStatus)?value.releaseStatus:'draft',
    lastCommitSha:validSha(value.lastCommitSha),
    changedFiles:text(value.changedFiles,2000),
    releaseNotes:text(value.releaseNotes,4000),
    operatorNote:text(value.operatorNote,500),
    apiConnected:Boolean(value.apiConnected),
    lastChecked:text(value.lastChecked,50),
    history:Array.isArray(value.history)?value.history.slice(0,30).map(item=>({
      at:text(item.at,50),
      connectionStatus:CONNECTION_STATES.includes(item.connectionStatus)?item.connectionStatus:'unknown',
      pushStatus:PUSH_STATES.includes(item.pushStatus)?item.pushStatus:'unknown',
      releaseStatus:RELEASE_STATES.includes(item.releaseStatus)?item.releaseStatus:'draft',
      lastCommitSha:validSha(item.lastCommitSha),
      operatorNote:text(item.operatorNote,500)
    })):[]
  });

  function read(){let raw={};try{raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{}return Object.freeze(clone(normalize(raw)));}
  function write(patch={}){const current=read();const next=normalize({...current,...patch,lastChecked:now()});next.history=[{at:next.lastChecked,connectionStatus:next.connectionStatus,pushStatus:next.pushStatus,releaseStatus:next.releaseStatus,lastCommitSha:next.lastCommitSha,operatorNote:next.operatorNote},...current.history].slice(0,30);localStorage.setItem(STORAGE_KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent('savingio:v2-github-release-changed',{detail:clone(next)}));return Object.freeze(clone(next));}
  function reset(){localStorage.removeItem(STORAGE_KEY);window.dispatchEvent(new CustomEvent('savingio:v2-github-release-changed',{detail:read()}));return read();}
  function verify(){const data=read();const repositoryLock=data.repository===REPOSITORY&&data.branch===DEFAULT_BRANCH;const noFakeRelease=data.releaseStatus!=='released'||(data.apiConnected&&Boolean(data.lastCommitSha));return Object.freeze({storageKey:STORAGE_KEY,repositoryLock,noFakeRelease,history:data.history.length,pass:repositoryLock&&noFakeRelease});}

  Object.defineProperty(window,'SavingioV2GitHubReleaseStore',{value:Object.freeze({read,write,reset,verify,connectionStates:CONNECTION_STATES,pushStates:PUSH_STATES,releaseStates:RELEASE_STATES,storageKey:STORAGE_KEY,repository:REPOSITORY,branch:DEFAULT_BRANCH}),writable:false,configurable:false,enumerable:true});
})();

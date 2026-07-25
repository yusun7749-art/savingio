(() => {
  'use strict';

  const STORAGE_KEYS = {
    projects:'savingio-os-projects-v1',
    workflows:'savingio-os-workflows-v1',
    assets:'savingio-os-assets-v1',
    legacy:'savingio-admin-projects'
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const readJson = key => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return { error:error.message };
    }
  };

  function checkEngines(report) {
    const required = [
      ['SavingioProject', window.SavingioProject],
      ['SavingioWorkflow', window.SavingioWorkflow],
      ['SavingioProjectWorkflow', window.SavingioProjectWorkflow],
      ['SavingioProjectDetail', window.SavingioProjectDetail],
      ['SavingioProjectList', window.SavingioProjectList]
    ];
    required.forEach(([name,value]) => {
      if (!value) report.errors.push(`ENGINE_MISSING:${name}`);
      else report.checks.push(`ENGINE_READY:${name}`);
    });
  }

  function checkStorage(report) {
    Object.entries(STORAGE_KEYS).forEach(([name,key]) => {
      const value = readJson(key);
      if (value && !Array.isArray(value) && value.error) report.errors.push(`STORAGE_JSON_INVALID:${name}:${value.error}`);
      else report.checks.push(`STORAGE_OK:${name}:${value.length}`);
    });
  }

  function checkProjects(report) {
    if (!window.SavingioProject) return;
    const result = window.SavingioProject.validateAll();
    report.projectValidation = result;
    if (!result.valid) {
      result.results.forEach(item => item.errors.forEach(error => report.errors.push(`PROJECT_INVALID:${item.project?.id || 'unknown'}:${error}`)));
    }
    result.results.forEach(item => item.warnings.forEach(warning => report.warnings.push(`PROJECT_WARNING:${item.project?.id || 'unknown'}:${warning}`)));
    const projects = window.SavingioProject.list({ includeArchived:true });
    const ids = projects.map(item => item.id);
    const duplicates = ids.filter((id,index) => ids.indexOf(id) !== index);
    [...new Set(duplicates)].forEach(id => report.errors.push(`PROJECT_ID_DUPLICATE:${id}`));
  }

  function checkLinks(report) {
    if (!window.SavingioProjectWorkflow) return;
    const audit = window.SavingioProjectWorkflow.audit();
    report.workflowAudit = audit;
    audit.errors.forEach(error => report.errors.push(error));
    audit.warnings.forEach(warning => report.warnings.push(warning));

    if (!window.SavingioProject) return;
    const projects = window.SavingioProject.list({ includeArchived:true });
    const assets = readJson(STORAGE_KEYS.assets);
    if (!Array.isArray(assets)) return;
    const projectMap = new Map(projects.map(item => [item.id,item]));
    assets.forEach(asset => {
      if (asset.projectId && !projectMap.has(asset.projectId)) report.errors.push(`ASSET_PROJECT_BROKEN:${asset.id}`);
      const project = projectMap.get(asset.projectId);
      if (project && asset.status !== 'archived' && !project.assetIds.includes(asset.id)) report.warnings.push(`PROJECT_ASSET_STALE:${project.id}:${asset.id}`);
    });
    projects.forEach(project => project.assetIds.forEach(assetId => {
      if (!assets.some(asset => asset.id === assetId && asset.projectId === project.id && asset.status !== 'archived')) report.warnings.push(`ASSET_LINK_STALE:${project.id}:${assetId}`);
    }));
  }

  function checkUi(report) {
    const selectors = ['#projectList','#detailPanel','#projectDialog','#projectForm','#newProjectBtn'];
    selectors.forEach(selector => {
      if (!document.querySelector(selector)) report.errors.push(`UI_MISSING:${selector}`);
      else report.checks.push(`UI_READY:${selector}`);
    });
  }

  function run() {
    const report = {
      version:'3.08',
      checkedAt:new Date().toISOString(),
      valid:true,
      checks:[],
      warnings:[],
      errors:[],
      projectValidation:null,
      workflowAudit:null
    };
    checkEngines(report);
    checkStorage(report);
    checkProjects(report);
    checkLinks(report);
    checkUi(report);
    report.valid = report.errors.length === 0;
    window.dispatchEvent(new CustomEvent('savingio:project-qa-completed', { detail:clone(report) }));
    return clone(report);
  }

  function boot() {
    window.SavingioProjectQA = Object.freeze({ run });
    setTimeout(() => {
      const report = run();
      window.SAVINGIO_PROJECT_QA_LAST = report;
      console[report.valid ? 'info' : 'error']('[Savingio Project QA]', report);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

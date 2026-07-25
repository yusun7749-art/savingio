(() => {
  'use strict';

  const LEGACY_KEY = 'savingio-admin-projects';
  const $ = selector => document.querySelector(selector);
  const readLegacy = () => {
    try {
      const value = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  function tagsFrom(value) {
    return [...new Set(String(value || '').split(',').map(item => item.trim()).filter(Boolean))];
  }

  function legacyProject(project, workflow) {
    return {
      id:project.id,
      title:project.title,
      category:project.category,
      type:project.type,
      status:'running',
      statusLabel:'시장분석 중',
      progress:5,
      updated:'방금 전',
      workflowId:workflow?.id || '',
      stages:[
        ['주제 등록','done'],
        ['시장분석','active'],
        ['콘텐츠 기획','wait'],
        ['제작','wait'],
        ['QA','wait'],
        ['최종 승인','wait'],
        ['자동 배포','wait'],
        ['성과 추적','wait']
      ]
    };
  }

  function setMessage(text, type='pass') {
    const message = $('#projectCreateMessage');
    if (!message) return;
    message.textContent = text;
    message.className = `project-create-message ${type}`;
  }

  function handleSubmit(event) {
    const form = event.currentTarget;
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
    event.stopImmediatePropagation();

    if (!window.SavingioProject) {
      setMessage('Project Engine을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.', 'warn');
      return;
    }

    const data = new FormData(form);
    const title = String(data.get('title') || '').trim();
    if (!title) {
      setMessage('프로젝트명을 입력해 주세요.', 'warn');
      form.elements.title?.focus();
      return;
    }

    const project = window.SavingioProject.create({
      title,
      description:String(data.get('description') || '').trim(),
      category:String(data.get('category') || '미분류'),
      type:String(data.get('type') || '통합 프로젝트'),
      priority:String(data.get('priority') || 'normal'),
      owner:String(data.get('owner') || '선장님').trim() || '선장님',
      tags:tagsFrom(data.get('tags')),
      status:'running',
      progress:5,
      source:'admin-project-dialog'
    });

    const workflow = window.SavingioWorkflow?.create({
      projectId:project.id,
      title:project.title,
      category:project.category,
      actor:project.owner
    }) || null;

    const linked = workflow ? window.SavingioProject.setWorkflow(project.id, workflow.id) : project;
    window.SavingioProjectWorkflow?.sync?.(workflow);
    const legacy = readLegacy().filter(item => item.id !== project.id);
    legacy.unshift(legacyProject(linked, workflow));
    localStorage.setItem(LEGACY_KEY, JSON.stringify(legacy));

    setMessage(`프로젝트 ${linked.id}를 생성하고 시장분석 워크플로를 시작했습니다.`);
    window.dispatchEvent(new CustomEvent('savingio:project-created', { detail:{ project:linked, workflow } }));
    form.reset();

    setTimeout(() => {
      $('#projectDialog')?.close();
      location.reload();
    }, 450);
  }

  function loadScript(src, marker, ready) {
    if (ready() || document.querySelector(`script[${marker}]`)) return;
    const script = document.createElement('script');
    script.src = src;
    script.setAttribute(marker, 'true');
    document.body.appendChild(script);
  }

  function loadProjectModules() {
    loadScript('/admin/os/project-workflow-bridge.js', 'data-project-workflow-bridge', () => Boolean(window.SavingioProjectWorkflow));
    loadScript('/admin/os/project-detail.js', 'data-project-detail', () => Boolean(window.SavingioProjectDetail));
    loadScript('/admin/os/project-list-control.js', 'data-project-list-control', () => Boolean(window.SavingioProjectList));
    loadScript('/admin/os/project-qa.js', 'data-project-qa', () => Boolean(window.SavingioProjectQA));
    loadScript('/admin/os/automation-engine.js', 'data-automation-engine', () => Boolean(window.SavingioAutomation));
    loadScript('/admin/os/github-status-engine.js', 'data-github-status-engine', () => Boolean(window.SavingioGitHubStatus));
    loadScript('/admin/os/cloudflare-deploy-engine.js', 'data-cloudflare-deploy-engine', () => Boolean(window.SavingioCloudflareDeploy));
    loadScript('/admin/os/url-health-engine.js', 'data-url-health-engine', () => Boolean(window.SavingioUrlHealth));
    loadScript('/admin/os/retry-engine.js', 'data-retry-engine', () => Boolean(window.SavingioRetry));
    loadScript('/admin/os/next-task-engine.js', 'data-next-task-engine', () => Boolean(window.SavingioNextTask));
    loadScript('/admin/os/automation-controller.js', 'data-automation-controller', () => Boolean(window.SavingioAutomationController));
    loadScript('/admin/os/automation-qa-engine.js', 'data-automation-qa-engine', () => Boolean(window.SavingioAutomationQA));
    loadScript('/admin/os/plugin-manifest.js', 'data-plugin-manifest', () => Boolean(window.SavingioPluginManifest));
    loadScript('/admin/os/plugin-manager.js', 'data-plugin-manager', () => Boolean(window.SavingioPluginManager));
    loadScript('/admin/os/plugin-security-engine.js', 'data-plugin-security-engine', () => Boolean(window.SavingioPluginSecurity));
    loadScript('/admin/os/plugin-ui-engine.js', 'data-plugin-ui-engine', () => Boolean(window.SavingioPluginUI));
    loadScript('/admin/plugins/calculator-plugin.js', 'data-calculator-plugin', () => Boolean(window.SavingioCalculatorPlugin));
    loadScript('/admin/plugins/psychology-test-plugin.js', 'data-psychology-test-plugin', () => Boolean(window.SavingioPsychologyTestPlugin));
    loadScript('/admin/plugins/game-plugin.js', 'data-game-plugin', () => Boolean(window.SavingioGamePlugin));
    loadScript('/admin/plugins/image-store-plugin.js', 'data-image-store-plugin', () => Boolean(window.SavingioImageStorePlugin));
    loadScript('/admin/plugins/coupon-affiliate-plugin.js', 'data-coupon-affiliate-plugin', () => Boolean(window.SavingioCouponAffiliatePlugin));
    loadScript('/admin/plugins/digital-product-plugin.js', 'data-digital-product-plugin', () => Boolean(window.SavingioDigitalProductPlugin));
    loadScript('/admin/plugins/plugin-store-qa.js', 'data-plugin-store-qa', () => Boolean(window.SavingioPluginStoreQA));
    loadScript('/admin/plugins/plugin-marketplace.js', 'data-plugin-marketplace', () => Boolean(window.SavingioPluginMarketplace));
    loadScript('/admin/plugins/plugin-install-ui.js', 'data-plugin-install-ui', () => Boolean(window.SavingioPluginInstallUI));
    loadScript('/admin/plugins/plugin-settings.js', 'data-plugin-settings', () => Boolean(window.SavingioPluginSettings));
    loadScript('/admin/plugins/plugin-backup-restore.js', 'data-plugin-backup-restore', () => Boolean(window.SavingioPluginBackupRestore));
    loadScript('/admin/plugins/plugin-dependency-manager.js', 'data-plugin-dependency-manager', () => Boolean(window.SavingioPluginDependency));
  }

  function boot() {
    loadProjectModules();
    const form = $('#projectForm');
    if (!form) return;
    form.addEventListener('submit', handleSubmit, true);
    window.SavingioProjectCreate = Object.freeze({ open(){ $('#projectDialog')?.showModal(); } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
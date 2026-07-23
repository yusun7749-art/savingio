(() => {
  const state = {
    articles: [],
    filtered: [],
    loading: false,
    filter: 'all',
    query: '',
    category: 'all'
  };

  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const normalizeUrl = value => {
    try { return new URL(value, location.origin).pathname.replace(/\/$/, '') || '/'; }
    catch { return String(value || '').replace(location.origin, '').replace(/\/$/, ''); }
  };

  function textLength(doc) {
    const clone = doc.cloneNode(true);
    clone.querySelectorAll('script,style,noscript,nav,footer').forEach(node => node.remove());
    return (clone.body?.textContent || '').replace(/\s+/g, '').length;
  }

  function hasText(doc, patterns) {
    const body = doc.body?.textContent || '';
    return patterns.some(pattern => pattern.test(body));
  }

  function count(doc, selector) {
    return doc.querySelectorAll(selector).length;
  }

  function detectCategory(doc, path) {
    const breadcrumb = [...doc.querySelectorAll('.breadcrumb a,.breadcrumbs a,[aria-label="breadcrumb"] a')]
      .map(node => node.textContent.trim()).filter(Boolean);
    if (breadcrumb.length > 1) return breadcrumb[breadcrumb.length - 1];
    const meta = doc.querySelector('meta[property="article:section"],meta[name="category"]')?.content?.trim();
    if (meta) return meta;
    const first = path.split('/').filter(Boolean).pop() || '미분류';
    if (/insurance/.test(first)) return '보험';
    if (/car|vehicle|fuel|traffic/.test(first)) return '자동차';
    if (/tax|vat|hometax/.test(first)) return '세금';
    if (/electric|aircon|water|gas|fee/.test(first)) return '생활비';
    if (/health|medical|hospital/.test(first)) return '건강';
    return '미분류';
  }

  function auditArticle(doc, url) {
    const title = (doc.querySelector('h1')?.textContent || doc.title || url).trim();
    const length = textLength(doc);
    const rules = [
      ['H1', count(doc, 'h1') === 1],
      ['Lead', Boolean(doc.querySelector('.lead,.article-lead,.intro,.summary')) || length >= 5000],
      ['작성·검수', hasText(doc, [/작성\s*[·/]?\s*검수/, /검수/])],
      ['5초 결론', hasText(doc, [/5초\s*결론/, /5초 안에/])],
      ['30초 질문', hasText(doc, [/30초\s*질문/, /30초 안에/])],
      ['지금 해야 할 행동', hasText(doc, [/지금\s*해야\s*할\s*행동/, /바로\s*할\s*일/])],
      ['목차', Boolean(doc.querySelector('.toc,#toc,[class*="table-of-contents"]')) || hasText(doc, [/목차/])],
      ['본문 5,000자', length >= 5000],
      ['비교표', count(doc, 'table') >= 1],
      ['체크리스트', hasText(doc, [/체크리스트/, /내\s*상황\s*찾기/])],
      ['사례', hasText(doc, [/사례/, /예시/])],
      ['보험·제도·법률', hasText(doc, [/보험/, /제도/, /법률/, /공식기관/])],
      ['계산기·공식기관', count(doc, 'a[href*="/calculators/"],a[href*="go.kr"],a[href*="or.kr"]') >= 1],
      ['FAQ', count(doc, '.faq-item,[class*="faq"] details,details') >= 3 || hasText(doc, [/FAQ/, /자주\s*묻는\s*질문/])],
      ['관련글', count(doc, 'a[href*="/articles/"]') >= 4],
      ['오른쪽 카드 5개', count(doc, '.right-card,.side-card,.sidebar-card,.rail-card') >= 5 || count(doc, '.article-rail > *,aside .card') >= 5],
      ['Meta description', Boolean(doc.querySelector('meta[name="description"]')?.content?.trim())],
      ['Canonical', Boolean(doc.querySelector('link[rel="canonical"]')?.href)]
    ];
    const passed = rules.filter(([, ok]) => ok).length;
    const score = Math.round((passed / rules.length) * 100);
    const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';
    return {
      url,
      path: normalizeUrl(url),
      title,
      category: detectCategory(doc, normalizeUrl(url)),
      length,
      rules,
      missing: rules.filter(([, ok]) => !ok).map(([name]) => name),
      score,
      grade,
      status: localStorage.getItem(`savingio-content-status:${normalizeUrl(url)}`) || 'published'
    };
  }

  async function getArticleUrls() {
    const response = await fetch(`/sitemap.xml?adminAudit=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('사이트맵을 불러오지 못했습니다.');
    const xml = new DOMParser().parseFromString(await response.text(), 'application/xml');
    return [...xml.querySelectorAll('loc')]
      .map(node => node.textContent.trim())
      .filter(url => /\/articles\/[^/]+\/?$/.test(new URL(url, location.origin).pathname));
  }

  async function fetchAudit(url) {
    const response = await fetch(`${normalizeUrl(url)}?adminAudit=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    return auditArticle(doc, url);
  }

  async function mapWithLimit(items, limit, worker, onProgress) {
    const result = new Array(items.length);
    let cursor = 0;
    async function run() {
      while (cursor < items.length) {
        const index = cursor++;
        try { result[index] = await worker(items[index]); }
        catch (error) { result[index] = { url: items[index], path: normalizeUrl(items[index]), title: normalizeUrl(items[index]), category: '오류', length: 0, rules: [], missing: ['페이지 로드 실패'], score: 0, grade: 'D', status: 'error', error: error.message }; }
        onProgress?.(index + 1, items.length);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
    return result;
  }

  function statusLabel(status) {
    return ({ published: '공개', hold: '보류', approved: '승인', hidden: '숨김', error: '오류' })[status] || status;
  }

  function renderSummary() {
    const el = $('#contentHealthSummary');
    if (!el) return;
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    state.articles.forEach(article => counts[article.grade]++);
    const average = state.articles.length ? Math.round(state.articles.reduce((sum, item) => sum + item.score, 0) / state.articles.length) : 0;
    el.innerHTML = `
      <div><span>전체 글</span><strong>${state.articles.length}</strong></div>
      <div><span>평균 품질</span><strong>${average}점</strong></div>
      <div><span>A</span><strong>${counts.A}</strong></div>
      <div><span>B</span><strong>${counts.B}</strong></div>
      <div><span>C</span><strong>${counts.C}</strong></div>
      <div><span>D</span><strong>${counts.D}</strong></div>`;
  }

  function applyFilters() {
    const query = state.query.toLowerCase();
    state.filtered = state.articles.filter(article => {
      const matchQuery = !query || `${article.title} ${article.path} ${article.category}`.toLowerCase().includes(query);
      const matchCategory = state.category === 'all' || article.category === state.category;
      const matchFilter = state.filter === 'all' ||
        (state.filter === 'fail' && article.score < 90) ||
        (state.filter === 'duplicate' && article.duplicateRisk >= 50) ||
        article.status === state.filter;
      return matchQuery && matchCategory && matchFilter;
    });
    renderRows();
  }

  function calculateDuplicates() {
    const tokenize = value => new Set(String(value).toLowerCase().replace(/[^0-9a-z가-힣\s]/g, ' ').split(/\s+/).filter(token => token.length > 1));
    state.articles.forEach(article => {
      const a = tokenize(article.title);
      let best = 0;
      let nearest = '';
      state.articles.forEach(other => {
        if (article === other) return;
        const b = tokenize(other.title);
        const intersection = [...a].filter(token => b.has(token)).length;
        const union = new Set([...a, ...b]).size || 1;
        const score = Math.round((intersection / union) * 100);
        if (score > best) { best = score; nearest = other.title; }
      });
      article.duplicateRisk = best;
      article.nearestTitle = nearest;
    });
  }

  function renderRows() {
    const body = $('#contentApprovalRows');
    if (!body) return;
    if (state.loading) return;
    if (!state.filtered.length) {
      body.innerHTML = '<tr><td colspan="8" class="content-empty">조건에 맞는 글이 없습니다.</td></tr>';
      return;
    }
    body.innerHTML = state.filtered.map(article => `
      <tr data-path="${esc(article.path)}">
        <td><span class="quality-grade grade-${article.grade.toLowerCase()}">${article.grade}</span><strong>${article.score}</strong></td>
        <td class="content-title-cell"><a href="${esc(article.path)}" target="_blank" rel="noopener">${esc(article.title)}</a><small>${esc(article.path)}</small></td>
        <td>${esc(article.category)}</td>
        <td><button class="audit-detail-btn" data-action="detail" data-path="${esc(article.path)}">${article.missing.length ? `❌ ${article.missing.length}개` : '✅ 충족'}</button></td>
        <td><span class="duplicate-risk risk-${article.duplicateRisk >= 60 ? 'high' : article.duplicateRisk >= 35 ? 'mid' : 'low'}">${article.duplicateRisk}%</span></td>
        <td>${article.length.toLocaleString()}자</td>
        <td><span class="content-status status-${esc(article.status)}">${esc(statusLabel(article.status))}</span></td>
        <td class="content-actions">
          <button data-action="rewrite" data-path="${esc(article.path)}">헌법 자동수정</button>
          <button data-action="hold" data-path="${esc(article.path)}">보류</button>
          <button data-action="approve" data-path="${esc(article.path)}">승인</button>
          <button data-action="hide" data-path="${esc(article.path)}">숨기기</button>
          <button class="danger" data-action="delete" data-path="${esc(article.path)}">삭제</button>
        </td>
      </tr>`).join('');
  }

  function showDetail(article) {
    const dialog = $('#contentAuditDialog');
    $('#contentAuditTitle').textContent = article.title;
    $('#contentAuditMeta').textContent = `${article.score}점 · ${article.grade}등급 · ${article.length.toLocaleString()}자 · 중복위험 ${article.duplicateRisk}%`;
    $('#contentAuditRules').innerHTML = article.rules.map(([name, ok]) => `<li class="${ok ? 'pass' : 'fail'}"><span>${ok ? '✓' : '×'}</span>${esc(name)}</li>`).join('') || '<li class="fail"><span>×</span>페이지 검사 실패</li>';
    $('#contentDuplicateNote').textContent = article.nearestTitle ? `가장 비슷한 제목: ${article.nearestTitle}` : '비슷한 제목이 발견되지 않았습니다.';
    $('#contentAuditPreview').href = article.path;
    dialog.showModal();
  }

  async function requestAction(article, action) {
    if (action === 'detail') return showDetail(article);
    if (action === 'delete' && !confirm(`삭제 전 백업이 필요합니다.\n${article.title}\n삭제 요청을 등록할까요?`)) return;
    if (action === 'hide' && !confirm(`${article.title}\n사이트에서 숨김 요청을 등록할까요?`)) return;

    if (['hold', 'approve'].includes(action)) {
      article.status = action === 'hold' ? 'hold' : 'approved';
      localStorage.setItem(`savingio-content-status:${article.path}`, article.status);
      applyFilters();
    }

    const payload = {
      action,
      article: { path: article.path, title: article.title, score: article.score, missing: article.missing },
      requestedAt: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/admin/content-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || '자동화 실행 엔진이 아직 연결되지 않았습니다.');
      alert(result.message || '요청이 승인센터에 등록되었습니다.');
    } catch (error) {
      if (['hold', 'approve'].includes(action)) {
        alert(`화면 상태는 저장했지만 GitHub 자동화 연결은 아직 완료되지 않았습니다.\n${error.message}`);
      } else {
        alert(`버튼 화면과 대상 글 연결은 완료되었습니다.\n다음 단계에서 GitHub 수정·숨김·삭제 엔진을 연결합니다.\n${error.message}`);
      }
    }
  }

  async function loadContentCenter() {
    if (state.loading) return;
    state.loading = true;
    const button = $('#runContentAuditBtn');
    const body = $('#contentApprovalRows');
    if (button) { button.disabled = true; button.textContent = '전체 글 검사 중…'; }
    if (body) body.innerHTML = '<tr><td colspan="8" class="content-empty">사이트맵과 실제 글을 읽고 헌법·DNA 미달 여부를 검사하고 있습니다.</td></tr>';
    try {
      const urls = await getArticleUrls();
      let complete = 0;
      state.articles = await mapWithLimit(urls, 6, fetchAudit, () => {
        complete += 1;
        if (button) button.textContent = `검사 중 ${complete}/${urls.length}`;
      });
      calculateDuplicates();
      state.articles.sort((a, b) => a.score - b.score || b.duplicateRisk - a.duplicateRisk);
      const categories = [...new Set(state.articles.map(item => item.category))].sort();
      $('#contentCategoryFilter').innerHTML = '<option value="all">전체 카테고리</option>' + categories.map(category => `<option value="${esc(category)}">${esc(category)}</option>`).join('');
      renderSummary();
      applyFilters();
      $('#contentLastAudit').textContent = `마지막 검사 ${new Date().toLocaleString('ko-KR')}`;
    } catch (error) {
      if (body) body.innerHTML = `<tr><td colspan="8" class="content-empty error">${esc(error.message)}</td></tr>`;
    } finally {
      state.loading = false;
      if (button) { button.disabled = false; button.textContent = '전체 Doctor 검사'; }
    }
  }

  function bindContentCenter() {
    $('#runContentAuditBtn')?.addEventListener('click', loadContentCenter);
    $('#contentSearch')?.addEventListener('input', event => { state.query = event.target.value.trim(); applyFilters(); });
    $('#contentCategoryFilter')?.addEventListener('change', event => { state.category = event.target.value; applyFilters(); });
    document.querySelectorAll('[data-content-filter]').forEach(button => button.addEventListener('click', () => {
      document.querySelectorAll('[data-content-filter]').forEach(item => item.classList.remove('active'));
      button.classList.add('active'); state.filter = button.dataset.contentFilter; applyFilters();
    }));
    $('#contentApprovalRows')?.addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const article = state.articles.find(item => item.path === button.dataset.path);
      if (article) requestAction(article, button.dataset.action);
    });
    $('#contentAuditClose')?.addEventListener('click', () => $('#contentAuditDialog').close());
    document.querySelectorAll('.tree-child').forEach(button => {
      if (button.dataset.child === '글 승인' || button.dataset.child === '기존 글 재작성' || button.dataset.child === '콘텐츠 QA') {
        button.addEventListener('click', () => {
          $('#contentApprovalCenter')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (!state.articles.length) loadContentCenter();
        });
      }
    });
  }

  bindContentCenter();
})();
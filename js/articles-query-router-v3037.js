(() => {
  'use strict';

  const CATEGORY_MAP = {
    '정부지원': '정부혜택',
    '정부혜택': '정부혜택',
    '절약': '생활비 절약',
    '생활비절약': '생활비 절약',
    '생활비 절약': '생활비 절약',
    '생활정보': '생활정보',
    '금융': '금융',
    '세금': '세금·환급',
    '환급': '세금·환급',
    '급여': '직장·급여',
    '자동차': '자동차·교통',
    '교통': '자동차·교통',
    '연금': '연금·노후',
    '노후': '연금·노후',
    '아이': '아이·교육',
    '교육': '아이·교육',
    '주거': '주거'
  };

  function normalized(value) {
    return (value || '').trim().replace(/\+/g, ' ');
  }

  function triggerSearch(input, value) {
    input.value = value;
    ['input', 'change', 'keyup'].forEach(type => {
      input.dispatchEvent(new Event(type, { bubbles: true }));
    });
  }

  function applyQuery() {
    const params = new URLSearchParams(window.location.search);
    const query = normalized(params.get('q') || params.get('category'));
    if (!query) return;

    const input = document.getElementById('articleSearch');
    const targetCategory = CATEGORY_MAP[query];
    const buttons = [...document.querySelectorAll('[data-cat]')];
    const targetButton = targetCategory
      ? buttons.find(button => normalized(button.dataset.cat) === targetCategory)
      : null;

    if (targetButton) {
      targetButton.click();
      targetButton.scrollIntoView({ block: 'nearest' });
      return;
    }

    if (input) {
      triggerSearch(input, query);
      input.setAttribute('value', query);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(applyQuery, 0));
  } else {
    setTimeout(applyQuery, 0);
  }
})();

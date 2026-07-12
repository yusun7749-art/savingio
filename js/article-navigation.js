(() => {
  const explorer = document.querySelector('[data-site-explorer]');
  const tocLinks = [...document.querySelectorAll('.toc a[href^="#"]')];
  const sections = tocLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);

  async function renderExplorer() {
    if (!explorer) return;
    try {
      const response = await fetch('/data/site-navigation.json', {cache: 'no-store'});
      if (!response.ok) throw new Error('navigation load failed');
      const tree = await response.json();
      explorer.innerHTML = Object.entries(tree).map(([large, middleGroups], largeIndex) => `
        <details class="explorer-large" ${largeIndex === 0 ? 'open' : ''}>
          <summary>${large}</summary>
          ${Object.entries(middleGroups).map(([middle, items]) => `
            <div class="explorer-middle">
              <strong>${middle}</strong>
              <ul>${items.map(([label, url]) => `<li><a href="${url}">${label}</a></li>`).join('')}</ul>
            </div>`).join('')}
        </details>`).join('');
    } catch (error) {
      explorer.innerHTML = '<p class="explorer-error">탐색 메뉴를 불러오지 못했습니다.</p>';
    }
  }

  function updateActiveToc() {
    if (!sections.length) return;
    const marker = window.scrollY + 150;
    let active = sections[0];
    sections.forEach(section => {
      if (section.offsetTop <= marker) active = section;
    });
    tocLinks.forEach(link => {
      const isActive = link.getAttribute('href') === `#${active.id}`;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  document.querySelectorAll('[data-explorer-toggle]').forEach(button => {
    button.addEventListener('click', () => document.body.classList.toggle('explorer-open'));
  });
  document.querySelectorAll('[data-explorer-close]').forEach(button => {
    button.addEventListener('click', () => document.body.classList.remove('explorer-open'));
  });
  window.addEventListener('scroll', updateActiveToc, {passive: true});
  renderExplorer();
  updateActiveToc();
})();

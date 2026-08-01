import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = (process.env.BASE_URL || 'https://savingio.com').replace(/\/$/, '');
const MAX_PAGES = Number(process.env.MAX_PAGES || 260);
const OUT_DIR = path.resolve('factory/QA/playwright');
const REPORT_JSON = path.join(OUT_DIR, 'SITE_RUNTIME_AUDIT.json');
const REPORT_MD = path.join(OUT_DIR, 'SITE_RUNTIME_AUDIT.md');

const keyRoutes = [
  '/', '/search.html', '/articles/', '/categories/', '/calculators/', '/topics/electricity',
  '/about.html', '/contact.html', '/privacy.html'
];
const searchCases = [
  ['누수', '누수'], ['물샘', '누수'], ['자동차보험', '보험'], ['차보험', '보험'],
  ['환급', '환급'], ['돌려받을 돈', '환급'], ['전기세', '전기'], ['통신비', '통신']
];

function normalizeUrl(value) {
  try {
    const u = new URL(value, BASE_URL);
    if (u.origin !== new URL(BASE_URL).origin) return null;
    u.hash = '';
    return u.href;
  } catch {
    return null;
  }
}

async function urlsFromSitemap(request) {
  const candidates = [`${BASE_URL}/sitemap.xml`, `${BASE_URL}/sitemap_index.xml`];
  const found = new Set();
  for (const sitemap of candidates) {
    try {
      const response = await request.get(sitemap, { timeout: 30000 });
      if (!response.ok()) continue;
      const body = await response.text();
      for (const match of body.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)) {
        const url = normalizeUrl(match[1].trim());
        if (url) found.add(url);
      }
    } catch {}
  }
  return [...found];
}

async function auditPage(context, url) {
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  const badResponses = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('requestfailed', req => failedRequests.push({ url: req.url(), error: req.failure()?.errorText || 'failed' }));
  page.on('response', res => {
    const status = res.status();
    if (status >= 400 && normalizeUrl(res.url())) badResponses.push({ url: res.url(), status });
  });

  const result = {
    url,
    status: 0,
    title: '',
    h1Count: 0,
    canonical: '',
    hasHeader: false,
    hasFooter: false,
    hasExplorer: false,
    horizontalOverflow: false,
    emptyMain: false,
    brokenImages: [],
    consoleErrors,
    failedRequests,
    badResponses,
    error: null
  };

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    result.status = response?.status() || 0;
    await page.waitForTimeout(900);
    result.title = await page.title();
    result.h1Count = await page.locator('h1').count();
    result.canonical = await page.locator('link[rel="canonical"]').getAttribute('href').catch(() => '') || '';
    result.hasHeader = await page.locator('header, .site-header').count() > 0;
    result.hasFooter = await page.locator('footer, .site-footer, .footer').count() > 0;
    result.hasExplorer = await page.locator('.savingio-brain-navigation, .brain-navigation, [data-savingio-brain], .left-explorer').count() > 0;
    result.horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 4);
    result.emptyMain = await page.evaluate(() => {
      const main = document.querySelector('main, article, .content, .page-shell');
      return !main || (main.innerText || '').replace(/\s+/g, '').length < 80;
    });
    result.brokenImages = await page.evaluate(() => [...document.images]
      .filter(img => img.complete && img.naturalWidth === 0)
      .map(img => img.currentSrc || img.src));
  } catch (error) {
    result.error = String(error?.message || error);
  } finally {
    await page.close();
  }
  return result;
}

async function auditInteractions(context) {
  const checks = [];
  const page = await context.newPage();
  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const navTargets = [
      ['생활정보', '/search.html'], ['사이트 탐색', '/categories/'], ['계산기', '/calculators/']
    ];
    for (const [label, expected] of navTargets) {
      const link = page.getByRole('link', { name: label, exact: true }).first();
      const href = await link.getAttribute('href').catch(() => null);
      checks.push({ type: 'home-link', label, expected, actual: href, pass: href === expected });
    }

    for (const [query, expectedText] of searchCases) {
      await page.goto(`${BASE_URL}/search.html?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(1200);
      const first = page.locator('#articleGrid a, .article-grid a, .search-results a').first();
      const text = (await first.innerText().catch(() => '')).trim();
      const href = await first.getAttribute('href').catch(() => null);
      checks.push({ type: 'search', query, expectedText, firstText: text, firstHref: href, pass: Boolean(text && text.includes(expectedText)) });
    }

    const calc = `${BASE_URL}/calculators/salary.html`;
    await page.goto(calc, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(800);
    const salaryInput = page.locator('input').first();
    if (await salaryInput.count()) {
      await salaryInput.fill('3000000');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(400);
      const resultText = (await page.locator('#sv2-result, .sv2-result').innerText().catch(() => '')).trim();
      checks.push({ type: 'calculator', url: calc, pass: resultText.length > 10, resultText: resultText.slice(0, 180) });
    } else {
      checks.push({ type: 'calculator', url: calc, pass: false, resultText: 'input not found' });
    }
  } catch (error) {
    checks.push({ type: 'interaction-run', pass: false, error: String(error?.message || error) });
  } finally {
    await page.close();
  }
  return checks;
}

function isProblem(row) {
  return Boolean(row.error || row.status >= 400 || row.status === 0 || !row.title || row.h1Count !== 1 || !row.canonical || !row.hasHeader || !row.hasFooter || row.horizontalOverflow || row.emptyMain || row.brokenImages.length || row.consoleErrors.length || row.failedRequests.length || row.badResponses.length);
}

await fs.mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

const request = desktop.request;
const sitemapUrls = await urlsFromSitemap(request);
const allUrls = [...new Set([...keyRoutes.map(r => normalizeUrl(r)), ...sitemapUrls].filter(Boolean))].slice(0, MAX_PAGES);
const desktopRows = [];
for (const url of allUrls) desktopRows.push(await auditPage(desktop, url));
const mobileRoutes = [...new Set(keyRoutes.map(r => normalizeUrl(r)).filter(Boolean))];
const mobileRows = [];
for (const url of mobileRoutes) mobileRows.push(await auditPage(mobile, url));
const interactions = await auditInteractions(desktop);

await browser.close();

const problems = desktopRows.filter(isProblem);
const mobileProblems = mobileRows.filter(isProblem);
const interactionFailures = interactions.filter(row => !row.pass);
const payload = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  pagesScanned: desktopRows.length,
  pageProblems: problems.length,
  mobilePagesScanned: mobileRows.length,
  mobileProblems: mobileProblems.length,
  interactionChecks: interactions.length,
  interactionFailures: interactionFailures.length,
  pass: problems.length === 0 && mobileProblems.length === 0 && interactionFailures.length === 0,
  problems,
  mobileProblems,
  interactions,
  pages: desktopRows
};
await fs.writeFile(REPORT_JSON, JSON.stringify(payload, null, 2) + '\n');

const md = [
  '# Savingio 운영 화면 Playwright QA', '',
  `- 생성: ${payload.generatedAt}`,
  `- 운영 주소: ${BASE_URL}`,
  `- 데스크톱 검사: **${payload.pagesScanned}개**`,
  `- 데스크톱 문제: **${payload.pageProblems}개**`,
  `- 모바일 핵심 화면 검사: **${payload.mobilePagesScanned}개**`,
  `- 모바일 문제: **${payload.mobileProblems.length}개**`,
  `- 동작 검사: **${payload.interactionChecks}개**`,
  `- 동작 실패: **${payload.interactionFailures}개**`,
  `- 최종 판정: **${payload.pass ? 'PASS' : 'FAIL'}**`, '',
  '## 페이지 문제', '',
  ...problems.map(r => `- ${r.url} — status=${r.status}, h1=${r.h1Count}, overflow=${r.horizontalOverflow}, error=${r.error || '-'}, console=${r.consoleErrors.length}, failed=${r.failedRequests.length}`),
  '', '## 모바일 문제', '',
  ...mobileProblems.map(r => `- ${r.url} — status=${r.status}, overflow=${r.horizontalOverflow}, error=${r.error || '-'}`),
  '', '## 동작 검사 실패', '',
  ...interactionFailures.map(r => `- ${JSON.stringify(r)}`), ''
].join('\n');
await fs.writeFile(REPORT_MD, md);

console.log(JSON.stringify({ pass: payload.pass, pagesScanned: payload.pagesScanned, pageProblems: payload.pageProblems, mobileProblems: payload.mobileProblems, interactionFailures: payload.interactionFailures }));
if (!payload.pass) process.exitCode = 1;

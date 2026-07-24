import { getAdminDevice } from '../../_lib/admin-auth.js';

const ACTION_PREFIX = 'content-action:';
const DRAFT_PREFIX = 'content-draft:';
const PUBLISH_PREFIX = 'content-publish-queue:';
const STATUS_PREFIX = 'content-status:';
const SAFE_ID = /^[0-9]+-[a-f0-9-]{8,}$/i;
const PUBLISHER_ID = 'pub-7605193583747751';
const OWNER = 'yusun7749-art';
const REPO = 'savingio';
const BRANCH = 'main';

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(v => v.toString(16).padStart(2, '0')).join('');
}

function repoPath(articlePath) {
  const clean = String(articlePath || '').replace(/^\//, '').replace(/\?.*$/, '');
  return clean.endsWith('.html') ? clean : `${clean}.html`;
}

function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function extract(html, pattern) {
  return String(html || '').match(pattern)?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';
}

async function github(env, path, options = {}) {
  const token = env.GITHUB_TOKEN;
  if (!token) throw new Error('Cloudflare 환경변수 GITHUB_TOKEN이 연결되어 있지 않습니다.');
  const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Savingio-Admin-Publish-Engine/1.0',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `GitHub API 오류 HTTP ${response.status}`);
  return data;
}

async function verifyLive(request, articlePath, draft) {
  const url = new URL(articlePath, request.url).toString();
  const response = await fetch(url, { cache: 'no-store', headers: { 'User-Agent': 'Savingio-Admin-Deploy-Verify/1.0' } });
  const html = await response.text();
  const expectedH1 = draft.validation?.metrics?.h1 || '';
  const expectedCanonical = draft.validation?.metrics?.canonical || '';
  const actualH1 = extract(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const actualCanonical = extract(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i);
  const publisherIds = [...html.matchAll(/(?:ca-)?pub-\d+/g)].map(m => m[0].replace(/^ca-/, ''));
  const checks = {
    http200: response.ok,
    h1Matches: !expectedH1 || actualH1 === expectedH1,
    canonicalMatches: !expectedCanonical || actualCanonical === expectedCanonical,
    publisherLockPass: publisherIds.length === 0 || publisherIds.every(id => id === PUBLISHER_ID),
    deployedHashMatches: await sha256(html) === draft.htmlHash
  };
  return { pass: Object.values(checks).every(Boolean), url, status: response.status, checks, actualH1, actualCanonical };
}

export async function onRequestGet(context) {
  const device = await getAdminDevice(context.request, context.env);
  if (!device) return json({ ok: false, error: '신뢰된 관리자 기기에서만 사용할 수 있습니다.' }, 401);
  if (!context.env.ADMIN_SECURITY_KV) return json({ ok: false, error: 'ADMIN_SECURITY_KV 저장소가 연결되어 있지 않습니다.' }, 503);
  const actionId = new URL(context.request.url).searchParams.get('actionId') || '';
  if (!SAFE_ID.test(actionId)) return json({ ok: false, error: '유효한 작업 번호가 필요합니다.' }, 400);
  const queue = await context.env.ADMIN_SECURITY_KV.get(`${PUBLISH_PREFIX}${actionId}`, 'json');
  return queue ? json({ ok: true, queue }) : json({ ok: false, error: '배포 대기 작업을 찾을 수 없습니다.' }, 404);
}

export async function onRequestPost(context) {
  const device = await getAdminDevice(context.request, context.env);
  if (!device) return json({ ok: false, error: '신뢰된 관리자 기기에서만 사용할 수 있습니다.' }, 401);
  if (!context.env.ADMIN_SECURITY_KV) return json({ ok: false, error: 'ADMIN_SECURITY_KV 저장소가 연결되어 있지 않습니다.' }, 503);

  let body = {};
  try { body = await context.request.json(); } catch { return json({ ok: false, error: '요청 내용을 읽을 수 없습니다.' }, 400); }
  const actionId = String(body.actionId || '');
  const command = String(body.command || 'publish');
  if (!SAFE_ID.test(actionId)) return json({ ok: false, error: '유효한 작업 번호가 필요합니다.' }, 400);

  const store = context.env.ADMIN_SECURITY_KV;
  const record = await store.get(`${ACTION_PREFIX}${actionId}`, 'json');
  const draft = await store.get(`${DRAFT_PREFIX}${actionId}`, 'json');
  const queue = await store.get(`${PUBLISH_PREFIX}${actionId}`, 'json');
  if (!record || !draft || !queue) return json({ ok: false, error: '승인된 배포 작업 정보가 완전하지 않습니다.' }, 409);

  if (command === 'verify') {
    const verification = await verifyLive(context.request, record.article.path, draft);
    queue.verification = verification;
    queue.state = verification.pass ? 'deployed_verified' : 'deployed_verification_failed';
    queue.verifiedAt = new Date().toISOString();
    record.state = queue.state;
    record.nextStatus = queue.state;
    await Promise.all([
      store.put(`${PUBLISH_PREFIX}${actionId}`, JSON.stringify(queue), { expirationTtl: 60 * 60 * 24 * 90 }),
      store.put(`${ACTION_PREFIX}${actionId}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 90 }),
      store.put(`${STATUS_PREFIX}${record.article.path}`, record.nextStatus)
    ]);
    return json({ ok: verification.pass, record, queue, verification, message: verification.pass ? '실제 URL 배포 검증 PASS입니다.' : '배포 반영이 아직 확인되지 않았습니다.' }, verification.pass ? 200 : 202);
  }

  if (record.state !== 'approved_for_publish' || queue.state !== 'approved_for_publish') {
    return json({ ok: false, error: `현재 상태(${record.state})에서는 배포할 수 없습니다.` }, 409);
  }
  if (!draft.productionWriteAllowed || !draft.validation?.pass) return json({ ok: false, error: '최종 승인된 PASS 초안만 배포할 수 있습니다.' }, 409);
  if (await sha256(draft.html) !== draft.htmlHash) return json({ ok: false, error: '초안 해시가 변경되어 배포를 중단했습니다.' }, 409);

  const path = repoPath(record.article.path);
  let current;
  try { current = await github(context.env, `/contents/${encodeURI(path)}?ref=${BRANCH}`); }
  catch (error) { return json({ ok: false, error: `GitHub 운영 파일을 읽지 못했습니다: ${error.message}` }, 503); }

  const now = new Date().toISOString();
  queue.state = 'publishing';
  queue.startedAt = now;
  queue.github = { owner: OWNER, repo: REPO, branch: BRANCH, path, previousBlobSha: current.sha };
  await store.put(`${PUBLISH_PREFIX}${actionId}`, JSON.stringify(queue), { expirationTtl: 60 * 60 * 24 * 90 });

  try {
    const result = await github(context.env, `/contents/${encodeURI(path)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Content HQ publish ${record.article.title || path}`,
        content: toBase64(draft.html),
        sha: current.sha,
        branch: BRANCH
      })
    });
    queue.state = 'github_committed';
    queue.committedAt = new Date().toISOString();
    queue.github.commitSha = result.commit?.sha || null;
    queue.github.contentSha = result.content?.sha || null;
    queue.deploymentEngineConnected = true;
    record.state = 'github_committed';
    record.nextStatus = 'github_committed';
    record.safety = { ...record.safety, destructiveWritePerformed: true, productionWriteAllowed: true };
    await Promise.all([
      store.put(`${PUBLISH_PREFIX}${actionId}`, JSON.stringify(queue), { expirationTtl: 60 * 60 * 24 * 90 }),
      store.put(`${ACTION_PREFIX}${actionId}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 90 }),
      store.put(`${STATUS_PREFIX}${record.article.path}`, record.nextStatus)
    ]);
    return json({ ok: true, record, queue, message: 'GitHub main 반영을 완료했습니다. Cloudflare 자동배포 후 실제 URL 검증을 실행하세요.' }, 202);
  } catch (error) {
    queue.state = 'publish_failed';
    queue.error = error.message;
    queue.failedAt = new Date().toISOString();
    record.state = 'publish_failed';
    record.nextStatus = 'publish_failed';
    record.safety = { ...record.safety, destructiveWritePerformed: false };
    await Promise.all([
      store.put(`${PUBLISH_PREFIX}${actionId}`, JSON.stringify(queue), { expirationTtl: 60 * 60 * 24 * 90 }),
      store.put(`${ACTION_PREFIX}${actionId}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 90 }),
      store.put(`${STATUS_PREFIX}${record.article.path}`, record.nextStatus)
    ]);
    return json({ ok: false, record, queue, error: `GitHub 배포 실패: ${error.message}` }, 502);
  }
}

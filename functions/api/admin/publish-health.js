import { getAdminDevice } from '../../_lib/admin-auth.js';

const OWNER = 'yusun7749-art';
const REPO = 'savingio';
const BRANCH = 'main';
const TEST_PATH = '.savingio-admin-write-test.json';

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function github(token, path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Savingio-Publish-Health/1.0',
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function authenticate(context) {
  const device = await getAdminDevice(context.request, context.env);
  if (!device) return { error: json({ ok: false, error: '신뢰된 관리자 기기에서만 사용할 수 있습니다.' }, 401) };
  if (!context.env.GITHUB_TOKEN) {
    return { error: json({ ok: false, checks: { secretAvailable: false }, error: 'Cloudflare Function에서 GITHUB_TOKEN을 읽지 못했습니다.' }, 503) };
  }
  return { device, token: context.env.GITHUB_TOKEN };
}

async function readChecks(token) {
  const checks = {
    secretAvailable: true,
    githubAuthenticated: false,
    repositoryAccessible: false,
    mainBranchAccessible: false
  };

  const repoResult = await github(token, `/repos/${OWNER}/${REPO}`);
  checks.githubAuthenticated = repoResult.response.status !== 401;
  checks.repositoryAccessible = repoResult.response.ok;
  if (!repoResult.response.ok) {
    return { checks, status: repoResult.response.status, error: repoResult.body?.message || 'GitHub 저장소 접근에 실패했습니다.' };
  }

  const branchResult = await github(token, `/repos/${OWNER}/${REPO}/branches/${BRANCH}`);
  checks.mainBranchAccessible = branchResult.response.ok;
  return { checks, status: branchResult.response.status, error: branchResult.response.ok ? '' : branchResult.body?.message || 'main 브랜치 접근에 실패했습니다.' };
}

export async function onRequestGet(context) {
  const auth = await authenticate(context);
  if (auth.error) return auth.error;

  const result = await readChecks(auth.token);
  const ok = Object.values(result.checks).every(Boolean);
  return json({
    ok,
    checks: result.checks,
    repository: `${OWNER}/${REPO}`,
    branch: BRANCH,
    tokenScopeConfirmed: result.checks.repositoryAccessible && result.checks.mainBranchAccessible,
    message: ok
      ? 'Cloudflare Secret, GitHub 인증, 저장소 접근, main 브랜치 접근이 모두 정상입니다.'
      : result.error || '일부 연결 검사가 실패했습니다.'
  }, ok ? 200 : (result.status === 403 ? 403 : 502));
}

export async function onRequestPost(context) {
  const auth = await authenticate(context);
  if (auth.error) return auth.error;

  let body = {};
  try { body = await context.request.json(); } catch {}
  if (body.command !== 'write_test') return json({ ok: false, error: '지원하지 않는 진단 명령입니다.' }, 400);

  const baseChecks = await readChecks(auth.token);
  if (!Object.values(baseChecks.checks).every(Boolean)) {
    return json({ ok: false, checks: baseChecks.checks, error: baseChecks.error || '읽기 연결 검사에 실패했습니다.' }, 403);
  }

  const now = new Date().toISOString();
  const testPayload = JSON.stringify({ source: 'Savingio Admin HQ', purpose: 'GitHub write permission test', testedAt: now }, null, 2);
  const existing = await github(auth.token, `/repos/${OWNER}/${REPO}/contents/${TEST_PATH}?ref=${BRANCH}`);
  const putBody = {
    message: `Admin: verify GitHub write permission ${now}`,
    content: encodeBase64(testPayload),
    branch: BRANCH,
    ...(existing.response.ok && existing.body?.sha ? { sha: existing.body.sha } : {})
  };

  const write = await github(auth.token, `/repos/${OWNER}/${REPO}/contents/${TEST_PATH}`, {
    method: 'PUT',
    body: JSON.stringify(putBody)
  });

  if (!write.response.ok) {
    return json({
      ok: false,
      checks: { ...baseChecks.checks, writePermission: false },
      githubStatus: write.response.status,
      error: write.body?.message || 'GitHub 쓰기 권한 테스트에 실패했습니다.'
    }, write.response.status === 401 || write.response.status === 403 ? write.response.status : 502);
  }

  const createdSha = write.body?.content?.sha;
  const commitSha = write.body?.commit?.sha;
  let cleanup = { attempted: false, success: false };
  if (createdSha) {
    cleanup.attempted = true;
    const remove = await github(auth.token, `/repos/${OWNER}/${REPO}/contents/${TEST_PATH}`, {
      method: 'DELETE',
      body: JSON.stringify({
        message: `Admin: remove GitHub write permission test ${now}`,
        sha: createdSha,
        branch: BRANCH
      })
    });
    cleanup = { attempted: true, success: remove.response.ok, commitSha: remove.body?.commit?.sha || null, error: remove.response.ok ? null : remove.body?.message || '테스트 파일 삭제 실패' };
  }

  return json({
    ok: true,
    checks: { ...baseChecks.checks, writePermission: true },
    repository: `${OWNER}/${REPO}`,
    branch: BRANCH,
    testFile: TEST_PATH,
    writeCommitSha: commitSha || null,
    cleanup,
    message: cleanup.success
      ? 'GitHub main 브랜치 실제 쓰기와 테스트 파일 정리까지 성공했습니다. Cloudflare 자동 배포가 시작됩니다.'
      : 'GitHub 실제 쓰기는 성공했습니다. 테스트 파일 정리 상태를 확인하세요.'
  }, 200);
}

import { getAdminDevice } from '../../_lib/admin-auth.js';

const OWNER = 'yusun7749-art';
const REPO = 'savingio';
const BRANCH = 'main';

function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function github(token, path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'Savingio-Publish-Health/1.0'
    }
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

export async function onRequestGet(context) {
  const device = await getAdminDevice(context.request, context.env);
  if (!device) return json({ ok: false, error: '신뢰된 관리자 기기에서만 사용할 수 있습니다.' }, 401);

  const tokenPresent = Boolean(context.env.GITHUB_TOKEN);
  const checks = {
    secretAvailable: tokenPresent,
    githubAuthenticated: false,
    repositoryAccessible: false,
    mainBranchAccessible: false
  };

  if (!tokenPresent) {
    return json({ ok: false, checks, error: 'Cloudflare Function에서 GITHUB_TOKEN을 읽지 못했습니다.' }, 503);
  }

  const repoResult = await github(context.env.GITHUB_TOKEN, `/repos/${OWNER}/${REPO}`);
  checks.githubAuthenticated = repoResult.response.status !== 401;
  checks.repositoryAccessible = repoResult.response.ok;

  if (!repoResult.response.ok) {
    return json({
      ok: false,
      checks,
      githubStatus: repoResult.response.status,
      error: repoResult.body?.message || 'GitHub 저장소 접근에 실패했습니다.'
    }, repoResult.response.status === 403 ? 403 : 502);
  }

  const branchResult = await github(context.env.GITHUB_TOKEN, `/repos/${OWNER}/${REPO}/branches/${BRANCH}`);
  checks.mainBranchAccessible = branchResult.response.ok;

  return json({
    ok: Object.values(checks).every(Boolean),
    checks,
    repository: `${OWNER}/${REPO}`,
    branch: BRANCH,
    tokenScopeConfirmed: checks.repositoryAccessible && checks.mainBranchAccessible,
    message: Object.values(checks).every(Boolean)
      ? 'Cloudflare Secret, GitHub 인증, 저장소 접근, main 브랜치 접근이 모두 정상입니다.'
      : '일부 연결 검사가 실패했습니다.'
  }, Object.values(checks).every(Boolean) ? 200 : 502);
}

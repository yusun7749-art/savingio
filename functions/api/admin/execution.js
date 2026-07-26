import { getAdminDevice } from '../../_lib/admin-auth.js';

const json = (body, status = 200) => Response.json(body, {
  status,
  headers: {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8'
  }
});

function capabilities(env = {}) {
  const githubToken = Boolean(env.GITHUB_TOKEN || env.SAVINGIO_GITHUB_TOKEN);
  const githubRepository = String(env.GITHUB_REPOSITORY || env.SAVINGIO_GITHUB_REPOSITORY || 'yusun7749-art/savingio');
  const githubBranch = String(env.GITHUB_BRANCH || env.SAVINGIO_GITHUB_BRANCH || 'main');
  const cloudflareApi = Boolean(env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_PROJECT_NAME);

  return {
    bridge: true,
    github: {
      ready: githubToken,
      repository: githubRepository,
      branch: githubBranch,
      mode: githubToken ? 'contents-api' : 'token-required'
    },
    cloudflare: {
      ready: cloudflareApi || githubToken,
      mode: cloudflareApi ? 'api' : githubToken ? 'github-main-auto-deploy' : 'connection-required'
    },
    searchConsole: {
      ready: false,
      mode: 'api-not-connected'
    }
  };
}

function sanitizeJob(input = {}) {
  return {
    id: String(input.id || '').slice(0, 120),
    taskId: String(input.taskId || '').slice(0, 240),
    title: String(input.title || '운영 작업').slice(0, 240),
    note: String(input.note || '').slice(0, 1000),
    status: String(input.status || 'queued').slice(0, 40),
    approvedAt: input.approvedAt || null
  };
}

export async function onRequestGet(context) {
  const device = await getAdminDevice(context.request, context.env);
  if (!device) return json({ ok: false, error: 'UNAUTHORIZED' }, 401);

  return json({
    ok: true,
    service: 'Savingio Execution Bridge',
    device: { id: device.deviceId, name: device.name },
    capabilities: capabilities(context.env),
    checkedAt: new Date().toISOString()
  });
}

export async function onRequestPost(context) {
  const device = await getAdminDevice(context.request, context.env);
  if (!device) return json({ ok: false, error: 'UNAUTHORIZED' }, 401);

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: 'INVALID_JSON' }, 400);
  }

  const action = String(body?.action || 'preflight');
  const job = sanitizeJob(body?.job || {});
  const caps = capabilities(context.env);

  if (action === 'preflight') {
    const checks = [
      { name: '관리자 인증', ok: true, detail: device.name || device.deviceId },
      { name: '서버 실행 브리지', ok: true, detail: 'Cloudflare Pages Function 연결됨' },
      { name: 'GitHub 쓰기 엔진', ok: caps.github.ready, detail: caps.github.ready ? `${caps.github.repository}@${caps.github.branch}` : 'GitHub token 환경변수 필요' },
      { name: 'Cloudflare 배포 엔진', ok: caps.cloudflare.ready, detail: caps.cloudflare.mode },
      { name: 'Search Console 엔진', ok: caps.searchConsole.ready, detail: '추후 연결 대상' }
    ];

    return json({
      ok: true,
      action,
      job,
      capabilities: caps,
      checks,
      executable: caps.github.ready && caps.cloudflare.ready,
      checkedAt: new Date().toISOString()
    });
  }

  if (action === 'queue') {
    return json({
      ok: true,
      action,
      accepted: true,
      job: { ...job, status: 'queued-server', queuedAt: new Date().toISOString() },
      capabilities: caps,
      message: caps.github.ready
        ? '서버 실행 대기열에 등록할 준비가 되었습니다.'
        : '서버 브리지는 연결됐지만 GitHub token 설정 전이라 실제 수정은 차단됩니다.'
    }, 202);
  }

  return json({ ok: false, error: 'UNSUPPORTED_ACTION' }, 400);
}

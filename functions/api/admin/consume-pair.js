import {
  createTrustedDeviceToken,
  trustedCookie,
  verifySignedPayload,
  getAdminDeviceSecret
} from '../../_lib/admin-auth.js';

const DEVICE_INDEX_KEY = 'trusted-devices:index';

async function registerDevice(env, device) {
  if (!env.ADMIN_SECURITY_KV) return;
  let devices = [];
  try {
    devices = JSON.parse(await env.ADMIN_SECURITY_KV.get(DEVICE_INDEX_KEY) || '[]');
  } catch {}
  devices = devices.filter(item => item && item.id !== device.id);
  devices.unshift(device);
  await env.ADMIN_SECURITY_KV.put(DEVICE_INDEX_KEY, JSON.stringify(devices.slice(0, 30)));
  await env.ADMIN_SECURITY_KV.delete(`revoked-device:${device.id}`);
}

function successPage() {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>휴대폰 연결 완료</title>
  <style>
    :root{font-family:Pretendard,"Noto Sans KR",Arial,sans-serif;color:#172033;background:#eef3f9}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}
    main{width:min(430px,100%);background:#fff;border:1px solid #dce4ef;border-radius:22px;box-shadow:0 24px 70px rgba(20,45,85,.16);padding:30px;text-align:center}
    .mark{width:64px;height:64px;margin:0 auto;display:grid;place-items:center;border-radius:18px;background:#e9f8ef;font-size:32px}
    h1{margin:18px 0 10px;font-size:25px}p{margin:0;color:#6b7588;line-height:1.65}
    a{display:block;margin-top:22px;border-radius:12px;background:#246bfd;color:#fff;padding:14px 16px;text-decoration:none;font-weight:800}
  </style>
</head>
<body>
  <main>
    <div class="mark">✅</div>
    <h1>휴대폰 연결이 완료되었습니다</h1>
    <p>이 휴대폰은 신뢰된 기기로 저장되었습니다. 다음부터는 QR 없이 바로 Admin HQ에 들어갑니다.</p>
    <a id="openAdmin" href="/admin/">Admin HQ 열기</a>
  </main>
  <script>
    setTimeout(()=>location.replace('/admin/'),700);
  </script>
</body>
</html>`;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const pairing = await verifySignedPayload(token, getAdminDeviceSecret(env));

  if (!pairing || pairing.type !== 'device-pairing') {
    return new Response('QR이 만료되었거나 올바르지 않습니다. 컴퓨터 HQ에서 새 QR을 만들어주세요.', {
      status: 401,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  }

  const now = Date.now();
  const deviceId = crypto.randomUUID();
  const name = pairing.requestedName || '내 휴대폰';
  const trustedToken = await createTrustedDeviceToken(env, {
    deviceId,
    name,
    createdAt: now
  });

  await registerDevice(env, {
    id: deviceId,
    name,
    type: 'phone',
    createdAt: now,
    lastSeenAt: now
  });

  return new Response(successPage(), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': trustedCookie(trustedToken),
      'Cache-Control': 'no-store, private',
      'X-Robots-Tag': 'noindex, nofollow, noarchive'
    }
  });
}

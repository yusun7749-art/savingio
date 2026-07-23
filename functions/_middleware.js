import {
  createTrustedDeviceToken,
  getTrustedDevice,
  trustedCookie,
  verifySignedPayload
} from './_lib/admin-auth.js';

const TRUSTED_ADMIN_IPS = new Set(['61.39.35.194']);

function getClientIp(request) {
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp) return cfIp.trim();

  const forwarded = request.headers.get('X-Forwarded-For');
  if (forwarded) return forwarded.split(',')[0].trim();

  return '';
}

async function passAdminRequest(next) {
  const response = await next();
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store, private');
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function loginPage(message = '') {
  const safeMessage = String(message).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Savingio Admin Login</title><style>
:root{font-family:Pretendard,"Noto Sans KR",Arial,sans-serif;color:#172033;background:#eef3f9}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(430px,100%);background:#fff;border:1px solid #dce4ef;border-radius:22px;box-shadow:0 24px 70px rgba(20,45,85,.16);padding:28px}.mark{width:54px;height:54px;display:grid;place-items:center;border-radius:16px;background:#eaf1ff;font-size:28px}h1{margin:18px 0 8px;font-size:25px}p{margin:0 0 20px;color:#6b7588;line-height:1.6}.notice{background:#fff4d6;color:#73560d;padding:11px 12px;border-radius:10px;font-size:13px;margin-bottom:14px}label{display:grid;gap:7px;margin-bottom:13px;font-size:13px;font-weight:800}input{border:1px solid #cad5e3;border-radius:11px;padding:12px;font:inherit}button{width:100%;border:0;border-radius:11px;background:#246bfd;color:#fff;padding:12px;font:inherit;font-weight:800;cursor:pointer}.error{margin-top:12px;color:#ba3342;font-size:13px}.small{font-size:12px;margin-top:15px}
</style></head><body><main class="card"><div class="mark">🔐</div><h1>Savingio Admin HQ</h1><p>처음 접속한 기기입니다. 관리자 인증 후 이 기기를 신뢰된 기기로 등록합니다.</p>${safeMessage ? `<div class="notice">${safeMessage}</div>` : ''}<form id="loginForm"><label>기기 이름<input id="deviceName" value="내 컴퓨터" maxlength="60" required></label><label>관리자 인증코드<input id="code" type="password" autocomplete="current-password" required></label><button type="submit">인증하고 HQ 열기</button><div id="error" class="error"></div></form><p class="small">휴대폰은 신뢰된 컴퓨터의 HQ 보안센터에서 QR을 생성해 연결합니다.</p></main><script>
document.getElementById('loginForm').addEventListener('submit',async(event)=>{event.preventDefault();const error=document.getElementById('error');error.textContent='확인 중입니다…';try{const response=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:document.getElementById('code').value,deviceName:document.getElementById('deviceName').value})});const result=await response.json();if(!response.ok)throw new Error(result.error||'로그인에 실패했습니다.');location.replace(result.redirect||'/admin/')}catch(err){error.textContent=err.message}});
</script></body></html>`;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const isAdminPage = url.pathname === '/admin' || url.pathname.startsWith('/admin/');
  const isAdminApi = url.pathname.startsWith('/api/admin/');

  if (!isAdminPage && !isAdminApi) return next();

  const clientIp = getClientIp(request);
  if (TRUSTED_ADMIN_IPS.has(clientIp)) {
    return passAdminRequest(next);
  }

  if (url.pathname === '/api/admin/login') return next();

  if (isAdminPage && url.searchParams.has('pair')) {
    const pairing = await verifySignedPayload(url.searchParams.get('pair'), env.ADMIN_DEVICE_SECRET);
    const pairingKey = pairing?.pairingId ? `pairing:${pairing.pairingId}` : '';
    const storedPairing = pairingKey && env.ADMIN_SECURITY_KV ? await env.ADMIN_SECURITY_KV.get(pairingKey) : null;
    if (!pairing || pairing.type !== 'device-pairing' || !storedPairing) {
      return new Response(loginPage('QR이 이미 사용되었거나 만료되었습니다. 컴퓨터 HQ에서 새 QR을 만들어주세요.'), {
        status: 401,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    await env.ADMIN_SECURITY_KV.delete(pairingKey);
    const token = await createTrustedDeviceToken(env, { name: pairing.requestedName || '내 휴대폰' });
    const cleanUrl = new URL('/admin/', request.url);
    return new Response(null, {
      status: 302,
      headers: {
        Location: cleanUrl.toString(),
        'Set-Cookie': trustedCookie(token),
        'Cache-Control': 'no-store'
      }
    });
  }

  const device = await getTrustedDevice(request, env);
  if (device) {
    return passAdminRequest(next);
  }

  if (isAdminApi) {
    return Response.json({ ok: false, error: '관리자 인증이 필요합니다.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  return new Response(loginPage(), {
    status: 401,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive'
    }
  });
}

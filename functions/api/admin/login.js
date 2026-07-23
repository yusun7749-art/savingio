import { createTrustedDeviceToken, trustedCookie } from '../../_lib/admin-auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.ADMIN_ACCESS_CODE || !env.ADMIN_DEVICE_SECRET) {
    return Response.json({ ok: false, error: '관리자 보안 환경변수가 설정되지 않았습니다.' }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  if (!body?.code || body.code !== env.ADMIN_ACCESS_CODE) {
    return Response.json({ ok: false, error: '관리자 인증코드가 올바르지 않습니다.' }, { status: 401 });
  }

  const token = await createTrustedDeviceToken(env, {
    name: String(body.deviceName || '내 컴퓨터').slice(0, 60)
  });

  return new Response(JSON.stringify({ ok: true, redirect: '/admin/' }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': trustedCookie(token),
      'Cache-Control': 'no-store'
    }
  });
}

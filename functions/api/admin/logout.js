import { expiredTrustedCookie } from '../../_lib/admin-auth.js';

export async function onRequestPost() {
  return new Response(JSON.stringify({ ok: true, redirect: '/admin/' }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': expiredTrustedCookie(),
      'Cache-Control': 'no-store'
    }
  });
}

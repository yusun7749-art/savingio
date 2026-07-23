const encoder = new TextEncoder();
const TRUSTED_ADMIN_IPS = new Set(['61.39.35.194']);

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, ch => ch.charCodeAt(0));
}

export function base64UrlEncodeText(value) {
  return bytesToBase64Url(encoder.encode(value));
}

export function base64UrlDecodeText(value) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}

export async function signPayload(payload, secret) {
  const body = base64UrlEncodeText(JSON.stringify(payload));
  const signature = bytesToBase64Url(await hmac(secret, body));
  return `${body}.${signature}`;
}

export async function verifySignedPayload(token, secret) {
  if (!token || !secret || !token.includes('.')) return null;
  const [body, suppliedSignature] = token.split('.', 2);
  const expectedSignature = bytesToBase64Url(await hmac(secret, body));
  if (suppliedSignature.length !== expectedSignature.length) return null;
  let diff = 0;
  for (let i = 0; i < suppliedSignature.length; i += 1) {
    diff |= suppliedSignature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  if (diff !== 0) return null;
  try {
    const payload = JSON.parse(base64UrlDecodeText(body));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(request) {
  const raw = request.headers.get('Cookie') || '';
  return Object.fromEntries(raw.split(';').map(item => item.trim()).filter(Boolean).map(item => {
    const index = item.indexOf('=');
    return index < 0 ? [item, ''] : [item.slice(0, index), decodeURIComponent(item.slice(index + 1))];
  }));
}

export function trustedCookie(token, maxAgeSeconds = 60 * 60 * 24 * 180) {
  return `savingio_admin_device=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
}

export function expiredTrustedCookie() {
  return 'savingio_admin_device=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}

export function getRequestIp(request) {
  return (request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '').split(',')[0].trim();
}

export async function getTrustedDevice(request, env) {
  const ip = getRequestIp(request);
  if (TRUSTED_ADMIN_IPS.has(ip)) {
    return {
      type: 'trusted-ip',
      deviceId: `ip:${ip}`,
      name: '내 컴퓨터',
      ip,
      createdAt: 0
    };
  }

  const secret = env.ADMIN_DEVICE_SECRET;
  if (!secret) return null;
  const token = parseCookies(request).savingio_admin_device;
  const payload = await verifySignedPayload(token, secret);
  if (!payload || payload.type !== 'trusted-device') return null;
  return payload;
}

export async function createTrustedDeviceToken(env, details = {}) {
  if (!env.ADMIN_DEVICE_SECRET) throw new Error('ADMIN_DEVICE_SECRET is not configured');
  const now = Date.now();
  return signPayload({
    type: 'trusted-device',
    deviceId: details.deviceId || crypto.randomUUID(),
    name: details.name || '내 기기',
    createdAt: details.createdAt || now,
    exp: now + 1000 * 60 * 60 * 24 * 180
  }, env.ADMIN_DEVICE_SECRET);
}

export async function createPairingToken(env, requestedName = '내 휴대폰') {
  if (!env.ADMIN_DEVICE_SECRET) throw new Error('ADMIN_DEVICE_SECRET is not configured');
  const now = Date.now();
  return signPayload({
    type: 'device-pairing',
    pairingId: crypto.randomUUID(),
    requestedName,
    issuedAt: now,
    exp: now + 1000 * 60 * 5
  }, env.ADMIN_DEVICE_SECRET);
}

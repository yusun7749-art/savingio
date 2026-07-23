import { getTrustedDevice } from '../../_lib/admin-auth.js';

const DEVICE_INDEX_KEY = 'trusted-devices:index';

export async function onRequestGet(context) {
  const { request, env } = context;
  const currentDevice = await getTrustedDevice(request, env);

  if (!env.ADMIN_SECURITY_KV) {
    return Response.json({
      ok: true,
      devices: [],
      currentDeviceId: currentDevice?.deviceId || null,
      storageAvailable: false
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  let devices = [];
  try {
    devices = JSON.parse(await env.ADMIN_SECURITY_KV.get(DEVICE_INDEX_KEY) || '[]');
  } catch {}

  const activeDevices = [];
  for (const device of Array.isArray(devices) ? devices : []) {
    if (!device?.id) continue;
    const revoked = await env.ADMIN_SECURITY_KV.get(`revoked-device:${device.id}`);
    if (!revoked) activeDevices.push(device);
  }

  return Response.json({
    ok: true,
    devices: activeDevices,
    currentDeviceId: currentDevice?.deviceId || null,
    storageAvailable: true
  }, { headers: { 'Cache-Control': 'no-store' } });
}

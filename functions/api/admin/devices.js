import { getTrustedDevice } from '../../_lib/admin-auth.js';

const DEVICE_INDEX_KEY = 'trusted-devices:index';

// Cloudflare Pages bindings are attached to a deployment at build time.
export async function onRequestGet(context) {
  const { request, env } = context;
  const currentDevice = await getTrustedDevice(request, env);
  const deviceStore = env.ADMIN_SECURITY_KV;

  if (!deviceStore) {
    return Response.json({
      ok: true,
      devices: [],
      currentDeviceId: currentDevice?.deviceId || null,
      storageAvailable: false,
      error: 'ADMIN_SECURITY_KV binding is not available in this deployment.'
    }, { headers: { 'Cache-Control': 'no-store' } });
  }

  let devices = [];
  try {
    devices = JSON.parse(await deviceStore.get(DEVICE_INDEX_KEY) || '[]');
  } catch {}

  const activeDevices = [];
  for (const device of Array.isArray(devices) ? devices : []) {
    if (!device?.id) continue;
    const revoked = await deviceStore.get(`revoked-device:${device.id}`);
    if (!revoked) activeDevices.push(device);
  }

  return Response.json({
    ok: true,
    devices: activeDevices,
    currentDeviceId: currentDevice?.deviceId || null,
    storageAvailable: true
  }, { headers: { 'Cache-Control': 'no-store' } });
}

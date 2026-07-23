import { getAdminDevice } from '../../_lib/admin-auth.js';

export async function onRequestGet(context) {
  const device = await getAdminDevice(context.request, context.env);
  if (!device) {
    return Response.json({ ok: false, trusted: false }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }

  return Response.json({
    ok: true,
    trusted: true,
    device: {
      id: device.deviceId,
      name: device.name,
      createdAt: device.createdAt
    }
  }, { headers: { 'Cache-Control': 'no-store' } });
}

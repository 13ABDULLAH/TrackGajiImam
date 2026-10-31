// POST   /api/subscribe → simpan/kemas kini langganan push
// DELETE /api/subscribe → buang langganan
// Kedua-duanya perlukan kunci rahsia (SUBSCRIBE_SECRET)
import { json, kunciLangganan, semakRahsia, store } from '../lib/server.mjs';
import { WAKTU } from '../lib/jadual.mjs';

export default async (req) => {
  const body = await req.json().catch(() => ({}));
  if (!semakRahsia(body.secret)) return json({ error: 'Kunci rahsia salah' }, 401);

  const sub = body.subscription;
  let url;
  try { url = new URL(sub?.endpoint); } catch { /* diabaikan */ }
  if (!url || url.protocol !== 'https:' || !sub.keys?.p256dh || !sub.keys?.auth) {
    return json({ error: 'Langganan tidak sah' }, 400);
  }

  const key = kunciLangganan(sub.endpoint);

  if (req.method === 'DELETE') {
    await store().delete(key);
    return json({ ok: true, dipadam: true });
  }

  // Hanya simpan medan yang dijangka
  const prefs = Object.fromEntries(WAKTU.map((w) => [w.key, body.prefs?.[w.key] !== false]));
  const zon = /^[A-Z]{3}\d{2}$/.test(body.zon) ? body.zon : 'SGR01';

  await store().setJSON(key, {
    subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
    prefs,
    zon,
    dikemaskini: new Date().toISOString(),
  });
  return json({ ok: true });
};

export const config = { path: '/api/subscribe', method: ['POST', 'DELETE'] };

// POST /api/test-push → hantar notifikasi ujian ke semua peranti yang melanggan
// body: { secret, jenis?: 'ujian' | 'masuk' | 'ingat', waktu?: 'asar' }
// 'masuk' / 'ingat' meniru notifikasi sebenar dari cron (untuk uji butang ✅ Ya, tick)
import { binaPayload, tarikhMYT, WAKTU } from '../lib/jadual.mjs';
import { hantar, json, sediakanVapid, semakRahsia, senaraiLangganan } from '../lib/server.mjs';

export default async (req) => {
  const body = await req.json().catch(() => ({}));
  if (!semakRahsia(body.secret)) return json({ error: 'Kunci rahsia salah' }, 401);

  sediakanVapid();
  const now = Math.floor(Date.now() / 1000);
  const t = tarikhMYT(now);

  let payload;
  if (body.jenis === 'masuk' || body.jenis === 'ingat') {
    const waktu = WAKTU.find((w) => w.key === body.waktu) || WAKTU[2];
    payload = binaPayload({ jenis: body.jenis, waktu, masa: now, tarikh: t.ymd }, now);
    payload.tag += '-ujian';
    payload.title = `[UJIAN] ${payload.title}`;
    payload.data.ujian = true; // service worker tidak akan ubah rekod sebenar
  } else {
    payload = {
      title: '✅ Notifikasi berfungsi',
      body: 'Imam Tracker akan ingatkan anda setiap kali masuk waktu solat.',
      tag: 'ujian',
      data: { jenis: 'ujian' },
    };
  }

  const subs = await senaraiLangganan();
  const keputusan = await Promise.all(subs.map((s) => hantar(s, payload, 300)));
  return json({ peranti: subs.length, berjaya: keputusan.filter(Boolean).length });
};

export const config = { path: '/api/test-push', method: 'POST' };

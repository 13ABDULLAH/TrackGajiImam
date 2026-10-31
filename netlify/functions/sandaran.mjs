// POST /api/sandaran — sandaran awan rekod tick (PILIHAN, dimatikan secara lalai)
// body: { secret, aksi: 'simpan' | 'ambil' | 'padam', rekod? }
import { WAKTU } from '../lib/jadual.mjs';
import { json, semakRahsia, store } from '../lib/server.mjs';

const KUNCI = 'sandaran/rekod';
const KUNCI_SEBELUM = 'sandaran/rekod-sebelum';
const MAKS_SAIZ = 300_000; // ~ berpuluh tahun rekod
const KUNCI_WAKTU = new Set(WAKTU.map((w) => w.key));

function bersihkan(data) {
  const bersih = {};
  if (!data || typeof data !== 'object') return bersih;
  for (const [tarikh, hari] of Object.entries(data)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tarikh) || !hari || typeof hari !== 'object') continue;
    const h = {};
    for (const [k, v] of Object.entries(hari)) if (KUNCI_WAKTU.has(k) && v === true) h[k] = true;
    if (Object.keys(h).length) bersih[tarikh] = h;
  }
  return bersih;
}

export default async (req) => {
  const teks = await req.text();
  if (teks.length > MAKS_SAIZ) return json({ error: 'Data terlalu besar' }, 413);

  let body;
  try { body = JSON.parse(teks); } catch { return json({ error: 'JSON tidak sah' }, 400); }
  if (!semakRahsia(body.secret)) return json({ error: 'Kunci rahsia salah' }, 401);

  const s = store();

  if (body.aksi === 'ambil') {
    const data = await s.get(KUNCI, { type: 'json' });
    return json(data || { rekod: {}, dikemaskini: null });
  }

  if (body.aksi === 'padam') {
    await Promise.all([s.delete(KUNCI), s.delete(KUNCI_SEBELUM)]);
    return json({ ok: true });
  }

  if (body.aksi === 'simpan') {
    const rekod = bersihkan(body.rekod);
    const sedia = await s.get(KUNCI, { type: 'json' });
    // Simpan satu versi sebelumnya sebagai jaring keselamatan
    if (sedia) await s.setJSON(KUNCI_SEBELUM, sedia);
    const dikemaskini = new Date().toISOString();
    await s.setJSON(KUNCI, { rekod, dikemaskini });
    return json({ ok: true, dikemaskini });
  }

  return json({ error: 'Aksi tidak dikenali' }, 400);
};

export const config = { path: '/api/sandaran', method: 'POST' };

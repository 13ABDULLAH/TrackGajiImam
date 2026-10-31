// Scheduled function: berjalan setiap 5 minit (hanya pada site yang sudah di-deploy).
// Hantar "masuk waktu" (0–6 minit sebelum) dan "catat imam" (30 minit selepas).
import { acaraPerluDihantar, binaPayload, bersihkan, tarikhMYT } from '../lib/jadual.mjs';
import { hantar, sediakanVapid, senaraiLangganan, store, waktuHari } from '../lib/server.mjs';

export default async () => {
  const subs = await senaraiLangganan();
  if (!subs.length) return;

  sediakanVapid();
  const s = store();
  const now = Math.floor(Date.now() / 1000);
  const t = tarikhMYT(now);
  const sudah = bersihkan((await s.get('sudah-dihantar', { type: 'json' })) || {}, now);

  // Kumpul ikut zon (biasanya hanya SGR01)
  const ikutZon = {};
  for (const sub of subs) (ikutZon[sub.zon || 'SGR01'] ||= []).push(sub);

  let dihantar = 0;
  for (const [zon, senarai] of Object.entries(ikutZon)) {
    let waktu;
    try {
      waktu = await waktuHari(zon, t);
    } catch (err) {
      console.error(err.message);
      continue;
    }

    const sudahZon = Object.fromEntries(
      Object.entries(sudah).filter(([k]) => k.startsWith(`${zon}:`)).map(([k, v]) => [k.slice(zon.length + 1), v]),
    );

    for (const acara of acaraPerluDihantar(now, waktu, sudahZon)) {
      const payload = binaPayload(acara, now);
      const ttl = acara.jenis === 'masuk' ? 900 : 1800;
      const sasaran = senarai.filter((sub) => sub.prefs?.[acara.waktu.key] !== false);
      await Promise.all(sasaran.map((sub) => hantar(sub, payload, ttl)));
      sudah[`${zon}:${acara.id}`] = now;
      dihantar++;
      console.log(`Dihantar: ${zon} ${acara.id} → ${sasaran.length} peranti`);
    }
  }

  await s.setJSON('sudah-dihantar', sudah);
  console.log(`Selesai ${t.ymd}: ${dihantar} notifikasi`);
};

export const config = { schedule: '*/5 * * * *' };

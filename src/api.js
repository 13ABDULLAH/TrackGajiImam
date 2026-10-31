// Waktu solat dari https://api.waktusolat.app (data JAKIM e-Solat)
import { get, set } from 'idb-keyval';
import { WAKTU } from './dates.js';

const BASE = 'https://api.waktusolat.app';

/**
 * Waktu solat sebulan, dicache dalam IndexedDB.
 * @returns {Promise<Record<number, Record<string, number>> | null>}
 *   { 18: { subuh: 1792270000, zuhur: ..., ... } } (unix saat), atau null jika gagal.
 */
export async function getWaktuBulan(zon, year, month) {
  const cacheKey = `waktu-${zon}-${year}-${month + 1}`;
  const cached = await get(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${BASE}/v2/solat/${zon}?year=${year}&month=${month + 1}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const peta = {};
    for (const hari of data.prayers || []) {
      peta[hari.day] = {};
      for (const w of WAKTU) peta[hari.day][w.key] = hari[w.api];
    }
    await set(cacheKey, peta);
    return peta;
  } catch (err) {
    console.warn('Gagal ambil waktu solat:', err);
    return null; // app tetap berfungsi, cuma kunci ikut tarikh sahaja
  }
}

/**
 * Senarai zon JAKIM, contoh [{ kod: 'SGR01', negeri: 'Selangor', kawasan: 'Gombak, Petaling, ...' }]
 * Pulangkan [] jika gagal (skrin Tetapan akan guna kotak teks).
 */
export async function getSenaraiZon() {
  const cached = await get('senarai-zon');
  if (cached?.length) return cached;
  try {
    const res = await fetch(`${BASE}/zones`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const senarai = (Array.isArray(data) ? data : data.zones || [])
      .map((z) => ({
        kod: z.jakimCode || z.code || z.zone,
        negeri: z.negeri || z.state || '',
        kawasan: z.daerah || z.location || z.name || '',
      }))
      .filter((z) => /^[A-Z]{3}\d{2}$/.test(z.kod || ''));
    if (senarai.length) await set('senarai-zon', senarai);
    return senarai;
  } catch (err) {
    console.warn('Gagal ambil senarai zon:', err);
    return [];
  }
}

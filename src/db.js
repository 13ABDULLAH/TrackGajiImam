// Simpanan dalam IndexedDB (kekal dalam telefon, boleh diakses service worker nanti).
import { get, set } from 'idb-keyval';
import { adaWaktu, parseYmd, WAKTU } from './dates.js';

const KEY_REKOD = 'rekod';
const KEY_TETAPAN = 'tetapan';

export const TETAPAN_ASAL = { kadar: 10, zon: 'SGR01' };

let rekodCache = null;
let pendengarUbah = null;

/** Daftar fungsi yang dipanggil setiap kali rekod berubah (untuk sandaran awan) */
export function bilaRekodBerubah(fn) {
  pendengarUbah = fn;
}

/** Dipanggil bila service worker ubah rekod (butang ✅ dalam notifikasi) */
export function lupakanCache() {
  rekodCache = null;
}

/** { "2026-10-18": { subuh: true, ... } } */
export async function getRekod() {
  if (!rekodCache) rekodCache = (await get(KEY_REKOD)) || {};
  return rekodCache;
}

export async function setTick(tarikh, waktu, nilai) {
  const rekod = await getRekod();
  const hari = { ...(rekod[tarikh] || {}) };
  if (nilai) hari[waktu] = true;
  else delete hari[waktu];

  if (Object.keys(hari).length) rekod[tarikh] = hari;
  else delete rekod[tarikh];

  await set(KEY_REKOD, rekod);
  pendengarUbah?.();
}

/** Ganti seluruh rekod (selepas import / pulih) */
export async function simpanRekod(rekod) {
  rekodCache = rekod;
  await set(KEY_REKOD, rekod);
}

export async function getTetapan() {
  return { ...TETAPAN_ASAL, ...((await get(KEY_TETAPAN)) || {}) };
}

export async function setTetapan(baru) {
  await set(KEY_TETAPAN, { ...(await getTetapan()), ...baru });
}

/** Bilangan solat diimamkan dalam bulan tertentu (month 0-based) */
export function kiraBulan(rekod, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  let jumlah = 0;
  for (const [tarikh, hari] of Object.entries(rekod)) {
    if (!tarikh.startsWith(prefix)) continue;
    const date = parseYmd(tarikh);
    for (const w of WAKTU) {
      if (hari[w.key] && adaWaktu(date, w.key)) jumlah++;
    }
  }
  return jumlah;
}

// ---------- Kadar ikut bulan ----------
// Tukar kadar hanya berkuat kuasa mulai bulan semasa; gaji bulan lepas kekal.
// kadarSejarah: [{ mula: '2026-10', kadar: 10 }, ...]
const ym = (year, month) => `${year}-${String(month + 1).padStart(2, '0')}`;

export function kadarUntuk(tetapan, year, month) {
  const sejarah = tetapan.kadarSejarah;
  if (!sejarah?.length) return tetapan.kadar;
  const sasaran = ym(year, month);
  let kadar = sejarah[0].kadar;
  for (const s of sejarah) if (s.mula <= sasaran) kadar = s.kadar;
  return kadar;
}

export async function setKadar(kadarBaru, now = new Date()) {
  const tetapan = await getTetapan();
  const mula = ym(now.getFullYear(), now.getMonth());
  const sejarah = tetapan.kadarSejarah?.length
    ? tetapan.kadarSejarah.filter((s) => s.mula !== mula)
    : [{ mula: '0000-00', kadar: tetapan.kadar }];
  sejarah.push({ mula, kadar: kadarBaru });
  sejarah.sort((a, b) => a.mula.localeCompare(b.mula));
  await setTetapan({ kadar: kadarBaru, kadarSejarah: sejarah });
}

// ---------- Sah & gabung rekod (import / sandaran) ----------
const KUNCI_WAKTU = new Set(WAKTU.map((w) => w.key));

/** Buang apa-apa yang bukan rekod sah. Pulangkan rekod bersih. */
export function bersihkanRekod(data) {
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

/** Gabung (union) — tiada tick sedia ada akan dibuang. Pulangkan bilangan tick baru. */
export async function gabungRekod(masuk) {
  const rekod = { ...(await getRekod()) };
  let baru = 0;
  for (const [tarikh, hari] of Object.entries(bersihkanRekod(masuk))) {
    const asal = rekod[tarikh] || {};
    for (const k of Object.keys(hari)) if (!asal[k]) baru++;
    rekod[tarikh] = { ...asal, ...hari };
  }
  await simpanRekod(rekod);
  return baru;
}

export function jumlahTick(rekod) {
  return Object.values(rekod).reduce((n, h) => n + Object.keys(h).length, 0);
}

// Fungsi tarikh & minggu. Semua dalam waktu tempatan telefon (MYT).

export const HARI = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
export const BULAN = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember',
];

// key = nama dalam rekod, api = nama medan dalam api.waktusolat.app
export const WAKTU = [
  { key: 'subuh', label: 'Subuh', api: 'fajr' },
  { key: 'zuhur', label: 'Zuhur', api: 'dhuhr' },
  { key: 'asar', label: 'Asar', api: 'asr' },
  { key: 'maghrib', label: 'Maghrib', api: 'maghrib' },
  { key: 'isyak', label: 'Isyak', api: 'isha' },
];

const pad = (n) => String(n).padStart(2, '0');

/** Date → "2026-10-18" */
export function ymd(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "2026-10-18" → Date (tengah malam waktu tempatan) */
export function parseYmd(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Date → "18/10" */
export function ddmm(date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

/** Date → "18/10/2026" */
export function ddmmyyyy(date) {
  return `${ddmm(date)}/${date.getFullYear()}`;
}

/** unix (saat) → "13:05" */
export function hhmm(unix) {
  const d = new Date(unix * 1000);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Bahagikan bulan kepada minggu Ahad–Sabtu.
 * Hari separa di awal bulan (jika 1hb bukan Ahad) digabung dengan minggu penuh pertama.
 * Hari separa di hujung bulan (jika hari akhir bukan Sabtu) digabung dengan minggu sebelumnya.
 * Contoh Okt 2026: [1–10], [11–17], [18–24], [25–31]
 * Contoh Nov 2026: [1–7], [8–14], [15–21], [22–30]
 * @returns {Date[][]}
 */
export function getWeeks(year, month) {
  const n = daysInMonth(year, month);
  const weeks = [];
  let cur = [];
  for (let d = 1; d <= n; d++) {
    const date = new Date(year, month, d);
    cur.push(date);
    if (date.getDay() === 6) {
      weeks.push(cur);
      cur = [];
    }
  }
  if (cur.length) weeks.push(cur);

  // Awal bulan: hari separa digabung ke minggu penuh pertama
  const bermulaAhad = weeks[0][0].getDay() === 0;
  if (!bermulaAhad && weeks.length > 1) {
    weeks.splice(0, 2, [...weeks[0], ...weeks[1]]);
  }

  // Hujung bulan: hari separa digabung ke minggu sebelumnya
  const akhir = weeks[weeks.length - 1];
  const berakhirSabtu = akhir[akhir.length - 1].getDay() === 6;
  if (!berakhirSabtu && weeks.length > 1) {
    const separa = weeks.pop();
    weeks[weeks.length - 1].push(...separa);
  }
  return weeks;
}

/** Indeks minggu (0-based) yang mengandungi tarikh ini */
export function weekIndexOf(date) {
  const weeks = getWeeks(date.getFullYear(), date.getMonth());
  const key = ymd(date);
  return weeks.findIndex((w) => w.some((d) => ymd(d) === key));
}

/** Jumaat tiada Zuhur (surau tidak adakan solat Jumaat) */
export function adaWaktu(date, key) {
  return !(date.getDay() === 5 && key === 'zuhur');
}

export function samaHari(a, b) {
  return ymd(a) === ymd(b);
}

// Logik masa notifikasi (tiada kebergantungan luar → senang diuji)

export const WAKTU = [
  { key: 'subuh', label: 'Subuh', api: 'fajr' },
  { key: 'zuhur', label: 'Zuhur', api: 'dhuhr' },
  { key: 'asar', label: 'Asar', api: 'asr' },
  { key: 'maghrib', label: 'Maghrib', api: 'maghrib' },
  { key: 'isyak', label: 'Isyak', api: 'isha' },
];

const MYT = 8 * 3600; // GMT+8, Malaysia tiada DST

// Cron berjalan setiap 5 minit (+ sedikit lewat). Tetingkap > 5 minit supaya tiada yang terlepas;
// rekod "sudah dihantar" mengelakkan notifikasi berganda.
export const TETINGKAP = {
  masuk: { mula: -6 * 60, tamat: 10 * 60 },    // 6 minit sebelum → 10 minit selepas waktu
  ingat: { mula: 30 * 60, tamat: 50 * 60 },    // 30 → 50 minit selepas waktu
};

const pad = (n) => String(n).padStart(2, '0');

/** unix (saat) → maklumat tarikh waktu Malaysia */
export function tarikhMYT(unix) {
  const d = new Date((unix + MYT) * 1000);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const hari = d.getUTCDate();
  return { y, m, hari, dow: d.getUTCDay(), ymd: `${y}-${pad(m)}-${pad(hari)}` };
}

/** unix (saat) → "16:28" waktu Malaysia */
export function jamMYT(unix) {
  const d = new Date((unix + MYT) * 1000);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/**
 * Senarai notifikasi yang patut dihantar SEKARANG.
 * @param now     unix saat
 * @param waktu   { subuh: unix, zuhur: unix, ... } untuk hari ini (MYT)
 * @param sudah   { [id]: unix } notifikasi yang sudah dihantar
 */
export function acaraPerluDihantar(now, waktu, sudah = {}) {
  const t = tarikhMYT(now);
  const hasil = [];
  for (const w of WAKTU) {
    if (t.dow === 5 && w.key === 'zuhur') continue; // Jumaat: tiada Zuhur di surau
    const masa = waktu?.[w.key];
    if (!masa) continue;
    for (const jenis of ['masuk', 'ingat']) {
      const id = `${t.ymd}-${w.key}-${jenis}`;
      const { mula, tamat } = TETINGKAP[jenis];
      if (now >= masa + mula && now < masa + tamat && !sudah[id]) {
        hasil.push({ id, jenis, waktu: w, masa, tarikh: t.ymd });
      }
    }
  }
  return hasil;
}

/** Kandungan notifikasi (dibaca oleh service worker) */
export function binaPayload({ jenis, waktu, masa, tarikh }, now) {
  const jam = jamMYT(masa);
  if (jenis === 'masuk') {
    const belum = now < masa;
    return {
      title: `🕌 ${belum ? 'Hampir masuk' : 'Masuk'} waktu ${waktu.label} · ${jam}`,
      body: 'Bersedia untuk mengimamkan solat.',
      tag: `masuk-${tarikh}-${waktu.key}`,
      data: { jenis, tarikh, waktu: waktu.key, label: waktu.label },
    };
  }
  return {
    title: `📝 Catat Imam — ${waktu.label}`,
    body: `Adakah anda mengimamkan solat ${waktu.label} (${jam}) tadi?`,
    tag: `ingat-${tarikh}-${waktu.key}`,
    data: { jenis, tarikh, waktu: waktu.key, label: waktu.label },
  };
}

/** Buang rekod "sudah dihantar" yang lebih lama daripada 3 hari */
export function bersihkan(sudah, now) {
  const hasil = {};
  for (const [id, t] of Object.entries(sudah)) if (now - t < 3 * 86400) hasil[id] = t;
  return hasil;
}

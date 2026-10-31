// Kiraan untuk dashboard
import { adaWaktu, getWeeks, WAKTU, ymd } from './dates.js';

/** Bilangan solat diimamkan dalam senarai tarikh */
export function kiraTarikh(rekod, dates) {
  let n = 0;
  for (const date of dates) {
    const hari = rekod[ymd(date)];
    if (!hari) continue;
    for (const w of WAKTU) if (hari[w.key] && adaWaktu(date, w.key)) n++;
  }
  return n;
}

/**
 * Bilangan slot solat yang SUDAH masuk waktu (untuk kira peratus).
 * waktu = { hari: { subuh: unix, ... } } dari api.js (boleh kosong)
 */
export function slotBerlalu(dates, waktu, now = new Date()) {
  const hariIni = ymd(now);
  let n = 0;
  for (const date of dates) {
    const key = ymd(date);
    if (key > hariIni) continue;
    for (const w of WAKTU) {
      if (!adaWaktu(date, w.key)) continue;
      if (key < hariIni) { n++; continue; }
      const unix = waktu?.[date.getDate()]?.[w.key];
      if (!unix || now.getTime() >= unix * 1000) n++;
    }
  }
  return n;
}

/** Statistik setiap minggu dalam bulan */
export function statMinggu(rekod, year, month) {
  return getWeeks(year, month).map((dates, i) => {
    const jumlah = kiraTarikh(rekod, dates);
    return {
      label: `M${i + 1}`,
      julat: `${dates[0].getDate()}–${dates[dates.length - 1].getDate()}`,
      hari: dates.length,
      jumlah,
      dates,
    };
  });
}

/** Pecahan ikut waktu: berapa kali diimamkan / berapa kali waktu itu sudah masuk */
export function pecahanWaktu(rekod, dates, waktu, now = new Date()) {
  const hariIni = ymd(now);
  return WAKTU.map((w) => {
    let ada = 0;
    let diimam = 0;
    for (const date of dates) {
      if (!adaWaktu(date, w.key)) continue;
      const key = ymd(date);
      if (rekod[key]?.[w.key]) diimam++;
      if (key > hariIni) continue;
      const unix = waktu?.[date.getDate()]?.[w.key];
      if (key < hariIni || !unix || now.getTime() >= unix * 1000) ada++;
    }
    return { ...w, ada, diimam };
  });
}

export function hariDalamBulan(year, month) {
  return getWeeks(year, month).flat();
}

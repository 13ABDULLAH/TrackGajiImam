// Teks ringkasan bulanan untuk bendahari
import { BULAN } from './dates.js';

const rm = (n) => `RM${n.toLocaleString('ms-MY')}`;

export function binaRingkasan({ year, month, jumlah, kadar, pecahan, namaSurau }) {
  return [
    `*Laporan Imam — ${BULAN[month]} ${year}*`,
    ...(namaSurau ? [namaSurau] : []),
    '',
    `Jumlah solat diimamkan: *${jumlah}*`,
    `Kadar: ${rm(kadar)} sesolat`,
    `Jumlah gaji: *${rm(jumlah * kadar)}*`,
    '',
    `Pecahan: ${pecahan.map((p) => `${p.label} ${p.diimam}`).join(' · ')}`,
  ].join('\n');
}

/** Kongsi (WhatsApp dll.) jika disokong, jika tidak salin ke clipboard */
export async function kongsiAtauSalin(teks) {
  if (navigator.share) {
    try {
      await navigator.share({ text: teks });
      return 'dikongsi';
    } catch (err) {
      if (err.name === 'AbortError') return 'batal';
      // jatuh ke clipboard
    }
  }
  await navigator.clipboard.writeText(teks);
  return 'disalin';
}

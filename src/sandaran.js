// Eksport / import fail JSON, dan sandaran awan pilihan
import {
  bersihkanRekod, bilaRekodBerubah, gabungRekod, getRekod, getTetapan, jumlahTick, setTetapan,
} from './db.js';

const pad = (n) => String(n).padStart(2, '0');

// ---------- Fail ----------

export async function eksportFail() {
  const rekod = await getRekod();
  const { kadar, kadarSejarah, zon } = await getTetapan(); // kunci rahsia TIDAK dieksport
  const now = new Date();
  const data = {
    app: 'imam-tracker',
    versi: 1,
    dieksport: now.toISOString(),
    tetapan: { kadar, kadarSejarah, zon },
    rekod,
  };
  const nama = `imam-tracker-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });

  // Android: kongsi terus ke Google Drive / WhatsApp jika boleh
  const fail = new File([blob], nama, { type: 'application/json' });
  if (navigator.canShare?.({ files: [fail] })) {
    try {
      await navigator.share({ files: [fail], title: nama });
      await setTetapan({ eksportTerakhir: now.toISOString() });
      return { cara: 'dikongsi', nama, tick: jumlahTick(rekod) };
    } catch (err) {
      if (err.name === 'AbortError') return { cara: 'batal' };
    }
  }

  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: nama });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  await setTetapan({ eksportTerakhir: now.toISOString() });
  return { cara: 'dimuat turun', nama, tick: jumlahTick(rekod) };
}

export async function importFail(fail) {
  if (fail.size > 2_000_000) throw new Error('Fail terlalu besar.');
  let data;
  try {
    data = JSON.parse(await fail.text());
  } catch {
    throw new Error('Fail ini bukan JSON yang sah.');
  }
  const rekodMasuk = data?.app === 'imam-tracker' ? data.rekod : data;
  const bersih = bersihkanRekod(rekodMasuk);
  if (!Object.keys(bersih).length) throw new Error('Tiada rekod sah dalam fail ini.');
  const baru = await gabungRekod(bersih);
  return { baru, jumlahFail: jumlahTick(bersih) };
}

// ---------- Awan (pilihan) ----------

async function panggil(aksi, extra = {}) {
  const { rahsia } = await getTetapan();
  if (!rahsia) throw new Error('Kunci rahsia belum disimpan. Hidupkan notifikasi dahulu, atau masukkan kunci rahsia.');
  const res = await fetch('/api/sandaran', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: rahsia, aksi, ...extra }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Ralat pelayan (${res.status})`);
  return data;
}

/** Ambil dari awan dan gabung ke telefon */
export async function pulihDariAwan() {
  const { rekod, dikemaskini } = await panggil('ambil');
  const baru = await gabungRekod(rekod || {});
  return { baru, dikemaskini };
}

export async function hantarKeAwan() {
  const rekod = await getRekod();
  // Jangan tulis ganti sandaran dengan rekod kosong (contoh telefon baru)
  if (!jumlahTick(rekod)) return null;
  const { dikemaskini } = await panggil('simpan', { rekod });
  await setTetapan({ awanTerakhir: dikemaskini });
  return dikemaskini;
}

/** Hidupkan: ambil dulu (gabung), kemudian simpan gabungan ke awan */
export async function hidupkanAwan() {
  const { baru } = await pulihDariAwan();
  await setTetapan({ sandaranAwan: true });
  await hantarKeAwan();
  return baru;
}

export async function matikanAwan(padamData) {
  await setTetapan({ sandaranAwan: false });
  if (padamData) await panggil('padam');
}

// Auto-sandar 3 saat selepas tick terakhir (jika suis dihidupkan)
let pemasa = null;
export function initSandaranAuto() {
  const jadual = () => {
    clearTimeout(pemasa);
    pemasa = setTimeout(async () => {
      if (!(await getTetapan()).sandaranAwan) return;
      try { await hantarKeAwan(); } catch (err) { console.warn('Sandaran awan gagal:', err.message); }
    }, 3000);
  };
  bilaRekodBerubah(jadual);
  return jadual; // dipanggil juga bila app dibuka (tick dari notifikasi)
}

// Kod bersama untuk Netlify Functions
import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
import webpush from 'web-push';
import { WAKTU } from './jadual.mjs';

export const store = () => getStore('imam-push');

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

/** Bandingkan kunci rahsia tanpa bocor masa (timing-safe) */
export function semakRahsia(diberi) {
  const sebenar = process.env.SUBSCRIBE_SECRET;
  if (!sebenar || !diberi) return false;
  return crypto.timingSafeEqual(sha(diberi), sha(sebenar));
}

export function kunciLangganan(endpoint) {
  return `sub/${sha(endpoint).toString('hex').slice(0, 24)}`;
}

let vapidSedia = false;
export function sediakanVapid() {
  if (vapidSedia) return;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) throw new Error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY belum ditetapkan');
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:imam@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidSedia = true;
}

/** Semua telefon/komputer yang sudah melanggan */
export async function senaraiLangganan() {
  const s = store();
  const { blobs } = await s.list({ prefix: 'sub/' });
  const semua = await Promise.all(
    blobs.map(async (b) => ({ key: b.key, ...(await s.get(b.key, { type: 'json' })) })),
  );
  return semua.filter((x) => x.subscription?.endpoint);
}

/** Hantar satu push. Langganan yang sudah mati (404/410) dipadam. */
export async function hantar(langganan, payload, ttl = 1800) {
  try {
    await webpush.sendNotification(langganan.subscription, JSON.stringify(payload), {
      TTL: ttl,
      urgency: 'high', // bangunkan telefon Android dari mod tidur (Doze)
    });
    return true;
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) {
      await store().delete(langganan.key);
      console.log('Langganan tamat, dipadam:', langganan.key);
    } else {
      console.error('Gagal hantar push:', err.statusCode, err.body || err.message);
    }
    return false;
  }
}

/** Waktu solat hari ini (unix saat), dicache sebulan dalam Blobs */
export async function waktuHari(zon, t) {
  const s = store();
  const key = `waktu/${zon}/${t.y}-${t.m}`;
  let bulan = await s.get(key, { type: 'json' });
  if (!bulan) {
    const res = await fetch(`https://api.waktusolat.app/v2/solat/${zon}?year=${t.y}&month=${t.m}`);
    if (!res.ok) throw new Error(`API waktu solat: HTTP ${res.status}`);
    const data = await res.json();
    bulan = {};
    for (const h of data.prayers || []) {
      bulan[h.day] = Object.fromEntries(WAKTU.map((w) => [w.key, h[w.api]]));
    }
    await s.setJSON(key, bulan);
  }
  return bulan[t.hari] || {};
}

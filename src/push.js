// Langganan Web Push (bercakap dengan Netlify Functions di /api/*)
import { getTetapan, setTetapan } from './db.js';

export const pushDisokong = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

async function panggil(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Ralat pelayan (${res.status})`);
  return data;
}

function base64KeUint8(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function pendaftaran() {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) throw new Error('Service worker belum aktif. Buka app dari versi Netlify (bukan npm run dev).');
  return reg;
}

export async function langgananSemasa() {
  if (!pushDisokong()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) || null;
}

/** Minta kebenaran, langgan push, daftar di pelayan */
export async function hidupkan(secret) {
  if (!pushDisokong()) throw new Error('Browser ini tidak menyokong notifikasi push.');
  const izin = await Notification.requestPermission();
  if (izin !== 'granted') throw new Error('Kebenaran notifikasi ditolak. Benarkan dalam tetapan Chrome.');

  const { publicKey } = await panggil('/api/vapid', 'GET');
  const reg = await pendaftaran();
  const sub = (await reg.pushManager.getSubscription())
    || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64KeUint8(publicKey) }));

  const { zon, notifWaktu } = await getTetapan();
  await panggil('/api/subscribe', 'POST', { secret, subscription: sub.toJSON(), prefs: notifWaktu, zon });
  await setTetapan({ rahsia: secret });
}

/** Hantar semula pilihan waktu ke pelayan */
export async function kemasKiniPilihan() {
  const sub = await langgananSemasa();
  if (!sub) return;
  const { rahsia, zon, notifWaktu } = await getTetapan();
  await panggil('/api/subscribe', 'POST', { secret: rahsia, subscription: sub.toJSON(), prefs: notifWaktu, zon });
}

export async function matikan() {
  const sub = await langgananSemasa();
  if (!sub) return;
  const { rahsia } = await getTetapan();
  await panggil('/api/subscribe', 'DELETE', { secret: rahsia, subscription: sub.toJSON() }).catch(() => {});
  await sub.unsubscribe();
}

export async function uji(jenis = 'ujian', waktu) {
  const { rahsia } = await getTetapan();
  return panggil('/api/test-push', 'POST', { secret: rahsia, jenis, waktu });
}

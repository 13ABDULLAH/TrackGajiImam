// Service worker: cache offline + notifikasi push
import { get, set } from 'idb-keyval';
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

self.skipWaiting();
clientsClaim();

// ---------- Offline ----------
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

// ---------- Push ----------
const IKON = '/icons/icon-192.png';
const BADGE = '/icons/badge-96.png';

const ddmm = (ymd) => ymd.split('-').reverse().slice(0, 2).join('/');

async function sudahDitick(tarikh, waktu) {
  const rekod = (await get('rekod')) || {};
  return !!rekod[tarikh]?.[waktu];
}

async function tick(tarikh, waktu) {
  const rekod = (await get('rekod')) || {};
  rekod[tarikh] = { ...(rekod[tarikh] || {}), [waktu]: true };
  await set('rekod', rekod);
}

async function beritahuApp() {
  const semua = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  semua.forEach((c) => c.postMessage({ type: 'rekod-berubah' }));
}

self.addEventListener('push', (event) => {
  let msg;
  try {
    msg = event.data.json();
  } catch {
    msg = { title: 'Imam Tracker', body: event.data?.text() || '' };
  }
  const d = msg.data || {};

  event.waitUntil((async () => {
    let title = msg.title;
    const opts = {
      body: msg.body,
      tag: msg.tag,
      renotify: true,
      icon: IKON,
      badge: BADGE,
      vibrate: [200, 100, 200],
      data: d,
    };

    if (d.jenis === 'ingat') {
      if (!d.ujian && await sudahDitick(d.tarikh, d.waktu)) {
        // Sudah dicatat dari app → notifikasi senyap sahaja
        title = `✓ ${d.label} ${ddmm(d.tarikh)} sudah dicatat`;
        opts.body = 'Tiada tindakan diperlukan.';
        opts.silent = true;
        opts.renotify = false;
      } else {
        opts.actions = [
          { action: 'tick', title: '✅ Ya, tick' },
          { action: 'tidak', title: 'Tidak' },
        ];
        opts.requireInteraction = true;
      }
    }

    await self.registration.showNotification(title, opts);
  })());
});

self.addEventListener('notificationclick', (event) => {
  const d = event.notification.data || {};
  event.notification.close();

  if (event.action === 'tidak') return;

  if (event.action === 'tick' && d.ujian) {
    // Ujian: sahkan butang berfungsi tanpa ubah rekod gaji
    event.waitUntil(self.registration.showNotification('✓ Ujian berjaya', {
      body: 'Butang "Ya, tick" berfungsi. Tiada rekod diubah.',
      tag: event.notification.tag,
      icon: IKON,
      badge: BADGE,
    }));
    return;
  }

  if (event.action === 'tick' && d.tarikh && d.waktu) {
    event.waitUntil((async () => {
      await tick(d.tarikh, d.waktu);
      await beritahuApp();
      await self.registration.showNotification(`✓ ${d.label} ${ddmm(d.tarikh)} dicatat`, {
        body: 'Jumlah gaji dikemas kini.',
        tag: event.notification.tag,
        icon: IKON,
        badge: BADGE,
        silent: true,
      });
    })());
    return;
  }

  // Tekan notifikasi → buka app ke Tracker
  event.waitUntil((async () => {
    const semua = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const sedia = semua.find((c) => new URL(c.url).origin === self.location.origin);
    if (sedia) {
      await sedia.focus();
      return sedia.navigate?.('/#tracker');
    }
    return self.clients.openWindow('/#tracker');
  })());
});

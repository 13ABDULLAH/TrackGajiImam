import { lupakanCache } from './db.js';
import { initPwa } from './pwa.js';
import { initSandaranAuto } from './sandaran.js';
import { renderDashboard } from './views/dashboard.js';
import { renderTetapan } from './views/tetapan.js';
import { renderTracker } from './views/tracker.js';

const app = document.getElementById('app');

const routes = {
  tracker: renderTracker,
  dashboard: renderDashboard,
  tetapan: renderTetapan,
};

function navigasi() {
  const nama = location.hash.replace('#', '') || 'tracker';
  const render = routes[nama] || routes.tracker;
  document.querySelectorAll('.nav-bawah a').forEach((a) => {
    a.classList.toggle('aktif', a.dataset.route === nama);
  });
  render(app);
}

const sandarAuto = initSandaranAuto();

// Muat semula data bila tick dibuat dari notifikasi, atau bila app dibuka semula
function segarkan() {
  lupakanCache();
  navigasi();
  sandarAuto(); // tick dari notifikasi juga disandarkan (jika sandaran awan hidup)
}
navigator.serviceWorker?.addEventListener('message', (e) => {
  if (e.data?.type === 'rekod-berubah') segarkan();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') segarkan();
});

// ---------- Leret (swipe) kiri/kanan untuk tukar halaman ----------
const URUTAN = ['tracker', 'dashboard', 'tetapan'];
let mula = null;

app.addEventListener('touchstart', (e) => {
  // Jangan kacau bila menyentuh medan input / dropdown
  if (e.touches.length !== 1 || e.target.closest('input, select, textarea')) {
    mula = null;
    return;
  }
  const t = e.touches[0];
  mula = { x: t.clientX, y: t.clientY, masa: Date.now() };
}, { passive: true });

app.addEventListener('touchend', (e) => {
  if (!mula) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - mula.x;
  const dy = t.clientY - mula.y;
  const cepat = Date.now() - mula.masa < 700;
  mula = null;
  // Mesti leretan mendatar yang jelas (bukan scroll ke bawah)
  if (!cepat || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

  const sekarang = URUTAN.indexOf(location.hash.replace('#', '') || 'tracker');
  const seterusnya = sekarang + (dx < 0 ? 1 : -1);
  if (seterusnya < 0 || seterusnya >= URUTAN.length) return;

  app.classList.remove('masuk-kiri', 'masuk-kanan');
  void app.offsetWidth; // mula semula animasi
  app.classList.add(dx < 0 ? 'masuk-kanan' : 'masuk-kiri');
  location.hash = URUTAN[seterusnya];
  window.scrollTo(0, 0);
}, { passive: true });

window.addEventListener('hashchange', navigasi);
navigasi();
initPwa();

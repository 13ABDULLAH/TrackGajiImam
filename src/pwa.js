// Daftar service worker + butang "Pasang app"
import { registerSW } from 'virtual:pwa-register';

export function initPwa() {
  registerSW({ immediate: true });

  let promptInstall = null;
  const btn = document.getElementById('btnPasang');

  // Chrome Android akan hantar event ini jika app layak dipasang
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    promptInstall = e;
    btn.hidden = false;
  });

  btn.addEventListener('click', async () => {
    if (!promptInstall) return;
    promptInstall.prompt();
    await promptInstall.userChoice;
    promptInstall = null;
    btn.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    btn.hidden = true;
  });
}

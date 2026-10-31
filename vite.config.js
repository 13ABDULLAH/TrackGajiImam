import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    // host: true → boleh buka dari telefon dalam Wi-Fi yang sama
    host: true,
    port: 5173,
  },
  plugins: [
    VitePWA({
      // Service worker ditulis sendiri (src/sw.js) untuk sokong push notification
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: false, // kita daftar sendiri dalam main.js
      includeAssets: ['favicon.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Imam Tracker',
        short_name: 'Imam Tracker',
        description: 'Catat solat fardu yang diimamkan dan kira gaji bulanan.',
        lang: 'ms',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#14532d',
        background_color: '#f8faf7',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,webmanifest}'],
      },
      devOptions: {
        // Hidupkan untuk uji service worker semasa `npm run dev`
        enabled: false,
        type: 'module',
      },
    }),
  ],
});

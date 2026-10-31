# Panduan Imam Tracker (Bahasa Melayu)

Aplikasi web (PWA) untuk imam surau/masjid mencatat solat fardu yang diimamkan, mengira gaji bulanan, dan menerima peringatan setiap kali masuk waktu solat.

[← Kembali ke README](../README.md)

---

## Kandungan

1. [Jalankan di komputer](#1-jalankan-di-komputer)
2. [Deploy ke Netlify](#2-deploy-ke-netlify)
3. [Setup notifikasi](#3-setup-notifikasi)
4. [Pasang di telefon](#4-pasang-di-telefon)
5. [Cara guna](#5-cara-guna)
6. [Peraturan kiraan](#6-peraturan-kiraan)
7. [Kredit Netlify (pelan Free)](#7-kredit-netlify-pelan-free)
8. [Masalah biasa](#8-masalah-biasa)

---

## 1. Jalankan di komputer

Perlu **Node.js 20+** (semak dengan `node -v`).

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`. Untuk paparan telefon di komputer, tekan `F12` dan pilih ikon telefon (*Toggle device toolbar*).

**Uji di telefon dalam Wi-Fi yang sama:** buka alamat `Network` yang keluar di terminal, contohnya `http://192.168.1.23:5173`. Kalau tak boleh dibuka, benarkan Node.js dalam Windows Firewall.

**Uji PWA (offline / install):** service worker hanya aktif dalam versi build.

```bash
npm run build
npm run preview
```

Buka `http://localhost:4173`. Semak di `F12` → **Application** → *Manifest* dan *Service workers*.

> Alamat `http://192.168.x.x` **tidak boleh** memasang PWA kerana PWA perlukan HTTPS. Deploy ke Netlify dahulu.

---

## 2. Deploy ke Netlify

Notifikasi perlukan **Netlify Functions**. Jadi deploy mesti melalui **GitHub** atau **Netlify CLI**. *Netlify Drop* (drag-and-drop) tidak memuat naik functions.

### Cara A: GitHub (disyorkan)

1. Fork repo ini, atau push ke repo GitHub anda sendiri.
2. Di app.netlify.com, pilih **Add new project → Import an existing project → GitHub** dan pilih repo itu.
3. Tetapan build dibaca dari `netlify.toml`, jadi terus tekan **Deploy**.
4. Selepas itu, setiap push ke branch utama akan deploy secara automatik.

### Cara B: Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify deploy --build --prod
```

---

## 3. Setup notifikasi

### 3.1 Jana kunci

```bash
npx web-push generate-vapid-keys
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Arahan pertama memberi **Public Key** dan **Private Key**. Arahan kedua memberi **kunci rahsia** anda.

### 3.2 Masukkan dalam Netlify

Pergi ke **Project configuration → Environment variables → Add a variable**:

| Key | Value | Contains secret values? |
|---|---|---|
| `VAPID_PUBLIC_KEY` | Public Key | Tidak |
| `VAPID_PRIVATE_KEY` | Private Key | **Ya**, isi untuk *Production* sahaja |
| `VAPID_SUBJECT` | `mailto:emel-anda@contoh.com` | Tidak |
| `SUBSCRIBE_SECRET` | kunci rahsia | **Ya**, isi untuk *Production* sahaja |

Bila ditanda *secret*, Netlify meminta nilai mengikut konteks deploy. Isi kotak **Production** sahaja dan biarkan yang lain kosong.

Kemudian deploy semula: **Deploys → Trigger deploy → Deploy project**.

> ⚠️ **Jangan** letak kunci-kunci ini dalam kod atau commit ke GitHub. Simpan Private Key dan kunci rahsia dalam password manager.

### 3.3 Semak

- Buka `https://nama-app-anda.netlify.app/api/vapid`. Kalau keluar `{"publicKey":"B..."}`, functions berfungsi.
- Di Netlify, **Cloud compute → Functions** patut menyenaraikan `vapid`, `subscribe`, `test-push`, `sandaran` dan `prayer-cron` (*Scheduled*).

### Bila notifikasi dihantar

| Notifikasi | Masa |
|---|---|
| 🕌 Masuk waktu | 0–6 minit **sebelum** waktu (tidak pernah lewat) |
| 📝 Catat Imam + butang ✅ | Lebih kurang 30–36 minit selepas waktu. Senyap jika sudah ditick |
| Jumaat | Tiada notifikasi Zuhur |

---

## 4. Pasang di telefon

1. Buka alamat Netlify di **Chrome**.
2. Tekan butang hijau **⬇ Pasang app**, atau menu ⋮ → **Add to Home screen** → **Install**.
3. Buka app, pergi ke **Tetapan**, dan isi **nama surau**, **zon** dan **kadar**.
4. Tampal **kunci rahsia**, tekan **Hidupkan notifikasi**, kemudian **Hantar ujian**.

### Tetapan bateri Android

Sesetengah telefon (Xiaomi/HyperOS, Oppo, Vivo, Huawei, Samsung) menahan notifikasi Chrome bila skrin tertutup. Di **Settings → Apps → Chrome**:

- **Battery saver → No restrictions** (atau *Unrestricted*)
- **Autostart → Hidup** (jika ada)
- **Notifications → Benarkan**, termasuk *Lock screen* dan *Floating notifications*

Tetapan ini berkuat kuasa sepanjang masa, bukan hanya semasa mod jimat bateri dihidupkan.

---

## 5. Cara guna

| Ciri | Di mana |
|---|---|
| Tick solat | **Tracker**. Kotak dibuka bila masuk waktu, dan hari lepas boleh ditick bila-bila masa |
| Tukar minggu / halaman | Butang ◀ ▶, atau leret kiri/kanan untuk tukar tab |
| Lihat gaji bulan lepas | **Tracker** (dropdown bulan) atau **Dashboard** (◀) |
| Ringkasan untuk bendahari | **Dashboard** → pilih bulan → **📋 Hantar ringkasan kepada bendahari** |
| Nama surau, kadar, zon | **Tetapan → Surau, gaji & zon** |
| Eksport sandaran | **Tetapan → Eksport fail** → simpan ke Google Drive (disyorkan sebulan sekali) |
| Import / tukar telefon | **Tetapan → Import fail**. Rekod digabung, tiada yang dibuang |
| Sandaran awan (pilihan) | **Tetapan → Sandaran awan automatik**. Mati secara lalai |

**Di mana data disimpan?** Rekod tick hanya disimpan dalam telefon anda (IndexedDB). Setiap peranti ada data sendiri. Netlify hanya menyimpan langganan notifikasi, cache waktu solat, dan sandaran awan (jika anda hidupkan).

**Sandaran awan:** dihantar 3 saat selepas tick terakhir, dan bila app dibuka. Hidupkan pada **satu peranti utama sahaja**, kerana peranti yang menghantar terakhir akan menimpa salinan di awan.

---

## 6. Peraturan kiraan

- Minggu bermula **Ahad hingga Sabtu**. Hari separa di awal bulan digabung ke minggu pertama, dan hari separa di hujung bulan digabung ke minggu terakhir. Contoh Okt 2026: 1–10, 11–17, 18–24, 25–31.
- Kotak dikunci sehingga masuk waktu.
- **Jumaat: tiada kotak Zuhur**, kerana surau tidak mengadakan solat Jumaat.
- Gaji = jumlah tick dalam bulan × kadar bulan itu (lalai RM10).
- Perubahan kadar berkuat kuasa **mulai bulan semasa**. Gaji bulan lepas kekal dengan kadar lama.

---

## 7. Kredit Netlify (pelan Free)

Pelan Free memberi 300 kredit sebulan. Kalau habis, **semua projek dijeda** sehingga bulan seterusnya.

| Penggunaan | Anggaran |
|---|---|
| Cron 5 minit + notifikasi + sandaran | ~15–25 kredit/bulan |
| **Setiap production deploy** | **15 kredit** |

Tip: uji dahulu dengan `npm run build && npm run preview`, kumpul beberapa perubahan dalam satu commit, dan semak di **Team → Usage & billing**.

---

## 8. Masalah biasa

| Gejala | Punca biasa |
|---|---|
| Build gagal di Netlify | `package-lock.json` tidak dikemas kini. Jalankan `npm install` dan commit semula |
| "Kunci rahsia salah" | Ada ruang kosong semasa tampal, atau `SUBSCRIBE_SECRET` belum disimpan |
| "VAPID_PUBLIC_KEY belum ditetapkan" | Env var ditambah selepas deploy. Trigger deploy semula |
| "Service worker belum aktif" | Tutup dan buka semula app |
| Ujian berjaya tetapi notifikasi waktu sebenar tak sampai | Tetapan bateri Android (lihat bahagian 4) |
| Waktu solat tidak keluar | Tiada internet. App tetap berfungsi, kotak dibuka ikut tarikh sahaja |

import { getSenaraiZon } from '../api.js';
import { getTetapan, kadarUntuk, setKadar, setTetapan } from '../db.js';
import { BULAN, WAKTU } from '../dates.js';
import {
  eksportFail, hantarKeAwan, hidupkanAwan, importFail, matikanAwan, pulihDariAwan,
} from '../sandaran.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function tarikhMasa(iso) {
  if (!iso) return 'belum pernah';
  const d = new Date(iso);
  const hari = Math.floor((Date.now() - d.getTime()) / 86400000);
  const teks = d.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
  return hari === 0 ? `hari ini, ${d.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}`
    : `${teks} (${hari} hari lalu)`;
}
import {
  hidupkan, kemasKiniPilihan, langgananSemasa, matikan, pushDisokong, uji,
} from '../push.js';

export async function renderTetapan(el) {
  const tetapan = await getTetapan();
  const notifWaktu = tetapan.notifWaktu || {};
  const sub = await langgananSemasa();
  const izin = 'Notification' in window ? Notification.permission : 'tiada';
  const aktif = !!sub && izin === 'granted';
  const now = new Date();
  const kadarKini = kadarUntuk(tetapan, now.getFullYear(), now.getMonth());
  const senaraiZon = await getSenaraiZon();
  const hariSejakEksport = tetapan.eksportTerakhir
    ? Math.floor((Date.now() - new Date(tetapan.eksportTerakhir).getTime()) / 86400000) : Infinity;

  el.innerHTML = `
    <h1 class="tajuk-skrin">Tetapan</h1>

    <section class="panel">
      <h2>🔔 Notifikasi waktu solat</h2>
      <p class="panel-sub">Peringatan bila masuk waktu, dan 30 minit selepas itu untuk catat imam.</p>

      <div class="status ${aktif ? 'hidup' : 'mati'}">
        ${aktif ? '● Aktif pada peranti ini' : izin === 'denied' ? '● Disekat — benarkan notifikasi dalam tetapan Chrome' : '● Belum diaktifkan'}
      </div>

      ${!pushDisokong() ? '<p class="amaran">Browser ini tidak menyokong notifikasi push. Guna Chrome dan pasang app ke home screen.</p>' : ''}

      ${aktif ? `
        <div class="butang-baris">
          <button class="btn" id="btnUji">Hantar ujian</button>
          <button class="btn" id="btnUjiTick">Uji "Catat Imam"</button>
        </div>
        <button class="btn btn-garis" id="btnMatikan">Matikan notifikasi</button>
      ` : `
        <label class="medan">
          <span>Kunci rahsia</span>
          <input type="password" id="rahsia" autocomplete="off"
            placeholder="SUBSCRIBE_SECRET dari Netlify" />
        </label>
        <button class="btn btn-utama" id="btnHidupkan" ${pushDisokong() ? '' : 'disabled'}>Hidupkan notifikasi</button>
      `}

      <p class="mesej" id="mesej" role="status"></p>
    </section>

    <section class="panel">
      <h2>Waktu yang diberi notifikasi</h2>
      <ul class="suis-senarai">
        ${WAKTU.map((w) => `
          <li>
            <label>
              <span>${w.label}${w.key === 'zuhur' ? ' <small>(kecuali Jumaat)</small>' : ''}</span>
              <input type="checkbox" class="suis" data-waktu="${w.key}" ${notifWaktu[w.key] !== false ? 'checked' : ''} />
            </label>
          </li>`).join('')}
      </ul>
    </section>

    <section class="panel">
      <h2>💰 Surau, gaji & zon</h2>
      <label class="medan">
        <span>Nama surau / masjid</span>
        <input type="text" id="namaSurau" maxlength="80" autocomplete="off"
          placeholder="contoh: Surau Al-Hidayah, Taman Contoh" />
      </label>
      <p class="panel-sub">Dipaparkan dalam ringkasan untuk bendahari.</p>

      <label class="medan">
        <span>Kadar sesolat (RM)</span>
        <div class="baris-input">
          <input type="number" id="kadar" min="0" step="0.5" inputmode="decimal" value="${kadarKini}" />
          <button class="btn btn-kecil" id="btnKadar">Simpan</button>
        </div>
      </label>
      <p class="panel-sub">Perubahan kadar berkuat kuasa mulai ${BULAN[now.getMonth()]} ${now.getFullYear()}. Gaji bulan-bulan lepas kekal dengan kadar lama.</p>

      <label class="medan">
        <span>Zon waktu solat</span>
        ${senaraiZon.length ? `
          <select id="zon">
            ${[...new Set(senaraiZon.map((z) => z.negeri))].map((negeri) => `
              <optgroup label="${esc(negeri)}">
                ${senaraiZon.filter((z) => z.negeri === negeri).map((z) => `
                  <option value="${esc(z.kod)}" ${z.kod === tetapan.zon ? 'selected' : ''}>${esc(z.kod)} — ${esc(z.kawasan)}</option>`).join('')}
              </optgroup>`).join('')}
          </select>` : `
          <input type="text" id="zon" value="${esc(tetapan.zon)}" maxlength="5" pattern="[A-Z]{3}[0-9]{2}"
            autocapitalize="characters" placeholder="contoh SGR01" />`}
      </label>
      <p class="panel-sub">Zon JAKIM ikut daerah. Contoh: SGR01 = Gombak, Petaling, Sepang, Hulu Langat, Hulu Selangor, Shah Alam.</p>
      <p class="mesej" id="mesejGaji" role="status"></p>
    </section>

    <section class="panel">
      <h2>💾 Sandaran data</h2>
      <p class="panel-sub">Rekod tick hanya disimpan dalam telefon ini. Buat sandaran supaya tidak hilang jika tukar telefon atau padam data Chrome.</p>

      ${hariSejakEksport > 30 ? `<p class="amaran">Eksport terakhir: ${tarikhMasa(tetapan.eksportTerakhir)}. Disyorkan eksport sekurang-kurangnya sebulan sekali.</p>`
        : `<p class="panel-sub">Eksport terakhir: ${tarikhMasa(tetapan.eksportTerakhir)}</p>`}

      <div class="butang-baris">
        <button class="btn" id="btnEksport">⬆ Eksport fail</button>
        <label class="btn btn-fail">⬇ Import fail
          <input type="file" id="failImport" accept="application/json,.json" hidden />
        </label>
      </div>
      <p class="panel-sub kecil">Import akan <b>menggabungkan</b> rekod — tiada tick sedia ada akan dibuang.</p>

      <hr class="pemisah" />

      <label class="suis-baris">
        <span>
          <b>Sandaran awan automatik</b><br />
          <small>Salin rekod ke Netlify (dilindungi kunci rahsia) setiap kali tick.</small>
        </span>
        <input type="checkbox" class="suis" id="suisAwan" ${tetapan.sandaranAwan ? 'checked' : ''} />
      </label>
      ${tetapan.sandaranAwan ? `
        <p class="panel-sub">Disandarkan: ${tarikhMasa(tetapan.awanTerakhir)}</p>
        <div class="butang-baris">
          <button class="btn" id="btnSandarKini">Sandar sekarang</button>
          <button class="btn" id="btnPulih">Pulih dari awan</button>
        </div>` : ''}
      <p class="mesej" id="mesejSandaran" role="status"></p>
    </section>

    <section class="panel">
      <h2>Maklumat</h2>
      <dl class="info">
        <dt>Surau</dt><dd>${esc(tetapan.namaSurau || '—')}</dd>
        <dt>Zon</dt><dd>${esc(tetapan.zon)}</dd>
        <dt>Kadar semasa</dt><dd>RM${kadarKini} sesolat</dd>
      </dl>
    </section>
  `;

  // Set nilai melalui JS (bukan dalam HTML) supaya teks pengguna tidak boleh menyuntik markup
  el.querySelector('#namaSurau').value = tetapan.namaSurau || '';

  const inputRahsia = el.querySelector('#rahsia');
  if (inputRahsia) inputRahsia.value = tetapan.rahsia || '';

  const mesej = el.querySelector('#mesej');
  const papar = (teks, ralat = false) => {
    mesej.textContent = teks;
    mesej.classList.toggle('ralat', ralat);
  };

  async function cuba(btn, kerja, berjaya) {
    btn.disabled = true;
    papar('Sila tunggu…');
    try {
      const hasil = await kerja();
      papar(berjaya(hasil));
      return true;
    } catch (err) {
      papar(err.message, true);
      return false;
    } finally {
      btn.disabled = false;
    }
  }

  el.querySelector('#btnHidupkan')?.addEventListener('click', async (e) => {
    const rahsia = el.querySelector('#rahsia').value.trim();
    if (!rahsia) return papar('Masukkan kunci rahsia dahulu.', true);
    const ok = await cuba(e.target, () => hidupkan(rahsia), () => 'Notifikasi diaktifkan ✓');
    if (ok) renderTetapan(el);
  });

  el.querySelector('#btnUji')?.addEventListener('click', (e) => {
    cuba(e.target, () => uji('ujian'), (r) => `Dihantar ke ${r.berjaya}/${r.peranti} peranti. Semak bar notifikasi.`);
  });

  el.querySelector('#btnUjiTick')?.addEventListener('click', (e) => {
    cuba(e.target, () => uji('ingat', 'asar'),
      () => 'Dihantar. Tekan "✅ Ya, tick" pada notifikasi untuk uji butang (rekod sebenar tidak diubah).');
  });

  el.querySelector('#btnMatikan')?.addEventListener('click', async (e) => {
    const ok = await cuba(e.target, () => matikan(), () => 'Notifikasi dimatikan.');
    if (ok) renderTetapan(el);
  });

  el.querySelectorAll('.suis').forEach((cb) => {
    cb.addEventListener('change', async () => {
      const pilihan = { ...((await getTetapan()).notifWaktu || {}), [cb.dataset.waktu]: cb.checked };
      await setTetapan({ notifWaktu: pilihan });
      try {
        await kemasKiniPilihan();
        papar('Pilihan disimpan ✓');
      } catch (err) {
        papar(err.message, true);
      }
    });
  });

  // ---------- Gaji & zon ----------
  const mesejGaji = el.querySelector('#mesejGaji');
  const paparGaji = (t, ralat = false) => { mesejGaji.textContent = t; mesejGaji.classList.toggle('ralat', ralat); };

  el.querySelector('#btnKadar').addEventListener('click', async () => {
    const nilai = Number(el.querySelector('#kadar').value);
    if (!Number.isFinite(nilai) || nilai < 0 || nilai > 1000) return paparGaji('Kadar tidak sah.', true);
    await setKadar(nilai);
    paparGaji(`Kadar RM${nilai} disimpan mulai ${BULAN[now.getMonth()]} ✓`);
  });

  el.querySelector('#namaSurau').addEventListener('change', async (e) => {
    const namaSurau = e.target.value.trim().slice(0, 80);
    await setTetapan({ namaSurau });
    paparGaji(namaSurau ? `Nama surau disimpan ✓` : 'Nama surau dikosongkan.');
  });

  el.querySelector('#zon').addEventListener('change', async (e) => {
    const zon = e.target.value.trim().toUpperCase();
    if (!/^[A-Z]{3}\d{2}$/.test(zon)) return paparGaji('Kod zon mesti seperti SGR01.', true);
    await setTetapan({ zon });
    try {
      await kemasKiniPilihan(); // notifikasi ikut zon baru
      paparGaji(`Zon ${zon} disimpan ✓`);
    } catch (err) {
      paparGaji(`Zon disimpan, tetapi notifikasi gagal dikemas kini: ${err.message}`, true);
    }
  });

  // ---------- Sandaran ----------
  const mesejS = el.querySelector('#mesejSandaran');
  const paparS = (t, ralat = false) => { mesejS.textContent = t; mesejS.classList.toggle('ralat', ralat); };
  const cubaS = async (kerja) => {
    paparS('Sila tunggu…');
    try { return await kerja(); } catch (err) { paparS(err.message, true); return null; }
  };

  el.querySelector('#btnEksport').addEventListener('click', async () => {
    const h = await cubaS(eksportFail);
    if (!h || h.cara === 'batal') return paparS('');
    renderTetapan(el).then(() => {
      el.querySelector('#mesejSandaran').textContent = `✓ ${h.tick} tick ${h.cara} sebagai ${h.nama}`;
    });
  });

  el.querySelector('#failImport').addEventListener('change', async (e) => {
    const fail = e.target.files?.[0];
    e.target.value = '';
    if (!fail) return;
    const h = await cubaS(() => importFail(fail));
    if (h) paparS(`✓ Import selesai: ${h.baru} tick baru ditambah (fail mengandungi ${h.jumlahFail}).`);
  });

  el.querySelector('#suisAwan').addEventListener('change', async (e) => {
    if (e.target.checked) {
      const baru = await cubaS(hidupkanAwan);
      if (baru === null) { e.target.checked = false; return; }
      await renderTetapan(el);
      el.querySelector('#mesejSandaran').textContent = `✓ Sandaran awan dihidupkan${baru ? ` (${baru} tick dipulihkan)` : ''}.`;
    } else {
      const padam = confirm('Sandaran awan dimatikan.\n\nPadam juga salinan rekod yang ada di Netlify?');
      await cubaS(() => matikanAwan(padam));
      await renderTetapan(el);
      el.querySelector('#mesejSandaran').textContent = padam ? 'Dimatikan & salinan di Netlify dipadam.' : 'Dimatikan. Salinan lama masih di Netlify.';
    }
  });

  el.querySelector('#btnSandarKini')?.addEventListener('click', async () => {
    const t = await cubaS(hantarKeAwan);
    if (t !== null) paparS(t ? '✓ Disandarkan ke awan.' : 'Tiada rekod untuk disandarkan.');
  });

  el.querySelector('#btnPulih')?.addEventListener('click', async () => {
    const h = await cubaS(pulihDariAwan);
    if (h) paparS(`✓ ${h.baru} tick dipulihkan dari sandaran ${tarikhMasa(h.dikemaskini)}.`);
  });
}

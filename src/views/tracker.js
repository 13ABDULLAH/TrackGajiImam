import { getWaktuBulan } from '../api.js';
import { getRekod, getTetapan, kadarUntuk, kiraBulan, setTick } from '../db.js';
import {
  adaWaktu, BULAN, ddmm, ddmmyyyy, getWeeks, HARI, hhmm,
  samaHari, WAKTU, weekIndexOf, ymd,
} from '../dates.js';

// Keadaan skrin (kekal semasa bertukar tab)
const today = new Date();
const state = {
  year: today.getFullYear(),
  month: today.getMonth(),
  week: weekIndexOf(today),
  pilih: today, // tarikh yang diserlahkan
};

let root = null;
let timer = null;

export async function renderTracker(el) {
  root = el;
  await lukis();
  clearInterval(timer);
  // Lukis semula setiap minit supaya kotak terbuka bila masuk waktu
  timer = setInterval(() => root?.isConnected && lukis(), 60_000);
}

function pergiKe(date, serlah = true) {
  state.year = date.getFullYear();
  state.month = date.getMonth();
  state.week = weekIndexOf(date);
  const hariIni = getWeeks(state.year, state.month)[state.week]
    .find((d) => samaHari(d, new Date()));
  // Serlah tarikh yang dipilih; jika tiada, serlah hari ini jika ada dalam minggu itu
  state.pilih = serlah ? date : hariIni || null;
  lukis();
}

function tukarMinggu(arah) {
  const weeks = getWeeks(state.year, state.month);
  let w = state.week + arah;
  if (w < 0) {
    // ke minggu terakhir bulan sebelum
    return pergiKe(new Date(state.year, state.month, 0), false);
  }
  if (w >= weeks.length) {
    return pergiKe(new Date(state.year, state.month + 1, 1), false);
  }
  state.week = w;
  // Serlahan kuning hanya kekal jika hari ini ada dalam minggu tersebut
  state.pilih = weeks[w].find((d) => samaHari(d, new Date())) || null;
  lukis();
}

/** Boleh tick? Hanya selepas masuk waktu. Hari lepas sentiasa boleh. */
function terbuka(date, unix, now) {
  if (unix) return now >= unix * 1000;
  // Tiada data API: buka untuk hari ini & sebelumnya
  return ymd(date) <= ymd(now);
}

async function lukis() {
  const now = new Date();
  const tetapan = await getTetapan();
  const { zon } = tetapan;
  const kadar = kadarUntuk(tetapan, state.year, state.month);
  const rekod = await getRekod();
  const waktu = (await getWaktuBulan(zon, state.year, state.month)) || {};
  const weeks = getWeeks(state.year, state.month);
  if (state.week < 0 || state.week >= weeks.length) state.week = 0;
  const hariMinggu = weeks[state.week];

  const jumlah = kiraBulan(rekod, state.year, state.month);
  const tiadaApi = Object.keys(waktu).length === 0;

  root.innerHTML = `
    <header class="kepala">
      <div class="kawalan">
        <label class="pilih bulan">
          <select id="pilihBulan" aria-label="Bulan">
            ${BULAN.map((b, i) => `<option value="${i}" ${i === state.month ? 'selected' : ''}>${b} ${state.year}</option>`).join('')}
          </select>
        </label>
        <label class="pilih">
          <span>Tarikh</span>
          <input type="date" id="pilihTarikh" value="${ymd(state.pilih || hariMinggu[0])}" />
        </label>
        <label class="pilih">
          <span>Minggu</span>
          <select id="pilihMinggu">
            ${weeks.map((w, i) => `<option value="${i}" ${i === state.week ? 'selected' : ''}>Minggu ${i + 1}</option>`).join('')}
          </select>
        </label>
      </div>

      <div class="kad-gaji">
        <div class="kad-label">Jumlah Solat: <b>${jumlah}</b></div>
        <div class="kad-gaji-label">Gaji</div>
        <div class="kad-gaji-nilai">RM${(jumlah * kadar).toLocaleString('ms-MY')}</div>
        <div class="kad-label kecil">${BULAN[state.month]} ${state.year}</div>
      </div>
    </header>

    ${tiadaApi ? `<p class="amaran">Waktu solat tidak dapat dimuatkan (luar talian?). Kotak dibuka ikut tarikh sahaja.</p>` : ''}

    <section class="jadual-wrap">
      <button class="anak-panah kiri" id="mingguLepas" aria-label="Minggu sebelum">◀</button>

      <table class="jadual">
        <thead>
          <tr>
            <th></th>
            ${WAKTU.map((w) => `<th>${w.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${hariMinggu.map((date) => baris(date, rekod, waktu, now)).join('')}
        </tbody>
      </table>

      <button class="anak-panah kanan" id="mingguDepan" aria-label="Minggu seterusnya">▶</button>
    </section>

    <p class="nota">Hari ini: ${HARI[now.getDay()]}, ${ddmmyyyy(now)} · Zon ${zon}</p>
  `;

  pasangEvent();
}

function baris(date, rekod, waktu, now) {
  const key = ymd(date);
  const hari = rekod[key] || {};
  const masa = waktu[date.getDate()] || {};
  const kelas = [
    state.pilih && samaHari(date, state.pilih) ? 'dipilih' : '',
    samaHari(date, now) ? 'hari-ini' : '',
  ].join(' ');

  const sel = WAKTU.map((w) => {
    if (!adaWaktu(date, w.key)) {
      return `<td><span class="tiada" title="Tiada solat Zuhur berjemaah hari Jumaat">—</span></td>`;
    }
    const ditick = !!hari[w.key];
    const buka = terbuka(date, masa[w.key], now);
    return `
      <td>
        <button class="kotak ${ditick ? 'ditick' : ''}"
          data-tarikh="${key}" data-waktu="${w.key}"
          aria-pressed="${ditick}" aria-label="${w.label} ${ddmm(date)}"
          ${buka ? '' : 'disabled'}>${ditick ? '✓' : ''}</button>
        ${masa[w.key] ? `<small>${hhmm(masa[w.key])}</small>` : ''}
      </td>`;
  }).join('');

  return `
    <tr class="${kelas}">
      <th scope="row" class="nama-hari">${HARI[date.getDay()]}<br><span>(${ddmm(date)})</span></th>
      ${sel}
    </tr>`;
}

function pasangEvent() {
  root.querySelector('#pilihBulan').addEventListener('change', (e) => {
    const m = Number(e.target.value);
    const d = new Date();
    const bulanIni = d.getFullYear() === state.year && d.getMonth() === m;
    // Bulan ini → terus ke hari ini; bulan lain → minggu pertama tanpa serlahan
    pergiKe(bulanIni ? d : new Date(state.year, m, 1), bulanIni);
  });

  root.querySelector('#pilihTarikh').addEventListener('change', (e) => {
    if (!e.target.value) return;
    const [y, m, d] = e.target.value.split('-').map(Number);
    pergiKe(new Date(y, m - 1, d));
  });

  root.querySelector('#pilihMinggu').addEventListener('change', (e) => {
    state.week = Number(e.target.value);
    state.week = Math.max(0, state.week);
    tukarMinggu(0);
  });

  root.querySelector('#mingguLepas').addEventListener('click', () => tukarMinggu(-1));
  root.querySelector('#mingguDepan').addEventListener('click', () => tukarMinggu(1));

  root.querySelectorAll('.kotak').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const nilai = btn.getAttribute('aria-pressed') !== 'true';
      navigator.vibrate?.(15);
      await setTick(btn.dataset.tarikh, btn.dataset.waktu, nilai);
      lukis();
    });
  });
}

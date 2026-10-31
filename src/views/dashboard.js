import {
  BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip,
} from 'chart.js';
import { getWaktuBulan } from '../api.js';
import { getRekod, getTetapan, kadarUntuk, kiraBulan } from '../db.js';
import { BULAN, getWeeks, samaHari } from '../dates.js';
import { binaRingkasan, kongsiAtauSalin } from '../ringkasan.js';
import {
  hariDalamBulan, kiraTarikh, pecahanWaktu, slotBerlalu, statMinggu,
} from '../statistik.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

// Warna: satu warna untuk yang diserlahkan, kelabu untuk yang lain (emphasis)
const HIJAU = '#166534';
const KELABU = '#cbd5d1';
const TEKS = '#6b7280';
const GRID = '#eef0ee';

const now = new Date();
const state = { year: now.getFullYear(), month: now.getMonth() };
let carta = [];

const rm = (n, kadar) => `RM${(n * kadar).toLocaleString('ms-MY')}`;

export async function renderDashboard(el) {
  carta.forEach((c) => c.destroy());
  carta = [];

  const tetapan = await getTetapan();
  const { zon } = tetapan;
  const rekod = await getRekod();
  const { year, month } = state;
  const kadar = kadarUntuk(tetapan, year, month);
  const kadarKini = kadarUntuk(tetapan, now.getFullYear(), now.getMonth());
  const bulanIni = year === now.getFullYear() && month === now.getMonth();

  // --- Data ---
  const minggu = statMinggu(rekod, year, month);
  const idxMingguIni = bulanIni
    ? minggu.findIndex((m) => m.dates.some((d) => samaHari(d, now)))
    : -1;
  const jumlahBulan = kiraBulan(rekod, year, month);

  const waktu = (await getWaktuBulan(zon, year, month)) || {};
  const semuaHari = hariDalamBulan(year, month);
  const berlalu = slotBerlalu(semuaHari, waktu, now);
  const peratus = berlalu ? Math.round((jumlahBulan / berlalu) * 100) : 0;

  // Minggu ini (sentiasa minggu sebenar hari ini)
  const mingguSebenar = getWeeks(now.getFullYear(), now.getMonth())
    .find((w) => w.some((d) => samaHari(d, now)));
  const jumlahMingguIni = kiraTarikh(rekod, mingguSebenar);

  // 6 bulan berakhir pada bulan dipilih
  const trend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - i, 1);
    trend.push({
      label: BULAN[d.getMonth()].slice(0, 3),
      penuh: `${BULAN[d.getMonth()]} ${d.getFullYear()}`,
      jumlah: kiraBulan(rekod, d.getFullYear(), d.getMonth()),
      kadar: kadarUntuk(tetapan, d.getFullYear(), d.getMonth()),
    });
  }

  const pecahan = pecahanWaktu(rekod, semuaHari, waktu, now);

  // --- Paparan ---
  el.innerHTML = `
    <header class="dash-kepala">
      <button class="anak-panah" id="bulanLepas" aria-label="Bulan sebelum">◀</button>
      <h1>${BULAN[month]} ${year}</h1>
      <button class="anak-panah" id="bulanDepan" aria-label="Bulan seterusnya">▶</button>
    </header>

    <section class="tiles">
      <div class="tile utama">
        <div class="tile-label">Gaji ${BULAN[month]}</div>
        <div class="tile-nilai">${rm(jumlahBulan, kadar)}</div>
        <div class="tile-sub">${jumlahBulan} solat diimamkan</div>
        <button class="btn-ringkasan" id="btnRingkasan">📋 Hantar ringkasan kepada bendahari</button>
      </div>
      <div class="tile">
        <div class="tile-label">Minggu ini</div>
        <div class="tile-nilai">${jumlahMingguIni}</div>
        <div class="tile-sub">${rm(jumlahMingguIni, kadarKini)}</div>
      </div>
      <div class="tile">
        <div class="tile-label">Kehadiran</div>
        <div class="tile-nilai">${peratus}%</div>
        <div class="tile-sub">${jumlahBulan} / ${berlalu} waktu</div>
      </div>
    </section>

    <section class="panel">
      <h2>Mingguan — ${BULAN[month]}</h2>
      <p class="panel-sub">${bulanIni ? 'Hijau = minggu ini' : 'Bilangan solat setiap minggu'}</p>
      <div class="carta-wrap"><canvas id="cartaMinggu" aria-label="Graf bar solat setiap minggu"></canvas></div>
      <details>
        <summary>Lihat jadual</summary>
        <table class="jadual-data">
          <tr><th>Minggu</th><th>Tarikh</th><th>Solat</th><th>Purata/hari</th></tr>
          ${minggu.map((m) => `<tr><td>${m.label}</td><td>${m.julat}</td><td>${m.jumlah}</td><td>${(m.jumlah / m.hari).toFixed(1)}</td></tr>`).join('')}
        </table>
      </details>
    </section>

    <section class="panel">
      <h2>Trend 6 bulan</h2>
      <p class="panel-sub">Hijau = ${BULAN[month]}</p>
      <div class="carta-wrap"><canvas id="cartaBulan" aria-label="Graf bar solat setiap bulan"></canvas></div>
      <details>
        <summary>Lihat jadual</summary>
        <table class="jadual-data">
          <tr><th>Bulan</th><th>Solat</th><th>Gaji</th></tr>
          ${trend.map((t) => `<tr><td>${t.penuh}</td><td>${t.jumlah}</td><td>${rm(t.jumlah, t.kadar)}</td></tr>`).join('')}
        </table>
      </details>
    </section>

    <section class="panel">
      <h2>Ikut waktu — ${BULAN[month]}</h2>
      <ul class="pecahan">
        ${pecahan.map((p) => {
          const pc = p.ada ? Math.min(100, Math.round((p.diimam / p.ada) * 100)) : 0;
          return `<li>
            <span class="pecahan-nama">${p.label}</span>
            <span class="pecahan-bar"><span style="width:${pc}%"></span></span>
            <span class="pecahan-nilai">${p.diimam}<small>/${p.ada}</small></span>
          </li>`;
        }).join('')}
      </ul>
    </section>
  `;

  // --- Carta ---
  carta.push(cartaBar(el.querySelector('#cartaMinggu'), {
    labels: minggu.map((m) => [m.label, m.julat]),
    data: minggu.map((m) => m.jumlah),
    serlah: idxMingguIni,
    tooltip: (i) => {
      const m = minggu[i];
      return [`${m.julat} ${BULAN[month]}`, `${m.jumlah} solat · ${rm(m.jumlah, kadar)}`, `Purata ${(m.jumlah / m.hari).toFixed(1)} sehari`];
    },
  }));

  carta.push(cartaBar(el.querySelector('#cartaBulan'), {
    labels: trend.map((t) => t.label),
    data: trend.map((t) => t.jumlah),
    serlah: trend.length - 1,
    tooltip: (i) => [trend[i].penuh, `${trend[i].jumlah} solat · ${rm(trend[i].jumlah, trend[i].kadar)}`],
  }));

  el.querySelector('#btnRingkasan').addEventListener('click', async (e) => {
    const teks = binaRingkasan({
      year, month, jumlah: jumlahBulan, kadar, pecahan, namaSurau: tetapan.namaSurau,
    });
    const btn = e.currentTarget;
    const asal = btn.textContent;
    try {
      const hasil = await kongsiAtauSalin(teks);
      if (hasil === 'disalin') btn.textContent = '✓ Disalin — tampal dalam WhatsApp';
    } catch {
      btn.textContent = 'Gagal salin';
    }
    setTimeout(() => { btn.textContent = asal; }, 2500);
  });

  el.querySelector('#bulanLepas').addEventListener('click', () => tukarBulan(el, -1));
  el.querySelector('#bulanDepan').addEventListener('click', () => tukarBulan(el, 1));
}

function tukarBulan(el, arah) {
  const d = new Date(state.year, state.month + arah, 1);
  state.year = d.getFullYear();
  state.month = d.getMonth();
  renderDashboard(el);
}

function cartaBar(canvas, { labels, data, serlah, tooltip }) {
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: data.map((_, i) => (i === serlah ? HIJAU : KELABU)),
        hoverBackgroundColor: data.map((_, i) => (i === serlah ? HIJAU : '#a7b3ae')),
        borderRadius: { topLeft: 4, topRight: 4 },
        borderSkipped: 'bottom',
        maxBarThickness: 36,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          backgroundColor: '#1f2937',
          padding: 10,
          callbacks: {
            title: () => '',
            label: (ctx) => tooltip(ctx.dataIndex),
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: TEKS } },
        y: {
          beginAtZero: true,
          ticks: { color: TEKS, precision: 0 },
          grid: { color: GRID },
          border: { display: false },
        },
      },
    },
  });
}

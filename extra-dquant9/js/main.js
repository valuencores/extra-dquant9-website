// ==========================================
//   DQ9 자산투여금액 조견표 - 메인 스크립트 (DB 기반)
//   v2 - 전체 초기화를 DOMContentLoaded 안으로 통합
// ==========================================

// ── 카테고리 분류 ────────────────────────────
function getCategory(note) {
  if (!note) return '기타';
  if (note.startsWith('당근')) return '당근마켓';
  if (note.includes('AI') || note.includes('강의') || note.includes('자문')) return 'AI·강의';
  if (note.includes('환급') || note.includes('환불') || note.includes('환율') || note.includes('범칙금')) return '환급·환불';
  if (note.includes('주식') || note.includes('업비트') || note.includes('카카오주식')) return '주식·투자';
  if (note.includes('알바')) return '알바';
  if (note.includes('잔액') || note.includes('이체')) return '잔액이체';
  if (note.includes('중고나라') || note.includes('번개장터')) return '중고나라·번개';
  if (note.includes('수익') || note.includes('자문료') || note.includes('기획')) return '기타수익';
  return '기타';
}

const CAT_CLASS = {
  '당근마켓':      'cat-당근',
  'AI·강의':       'cat-AI강의',
  '환급·환불':     'cat-환급금',
  '주식·투자':     'cat-주식',
  '알바':          'cat-알바',
  '잔액이체':      'cat-잔액이체',
  '중고나라·번개': 'cat-중고나라',
  '기타수익':      'cat-기타수익',
  '기타':          'cat-일시',
};

const CAT_COLORS = [
  '#0072ff','#CC0000','#1a7a4a','#B8860B',
  '#5B2DA0','#AA2020','#2e7d52','#7a4a00','#1a4a80',
];

// ── 숫자 포맷 ────────────────────────────────
function fmt(n) { return Number(n).toLocaleString('ko-KR') + '원'; }
function fmtShort(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + '백만원';
  if (n >= 10000)   return Math.round(n / 10000) + '만원';
  return Number(n).toLocaleString('ko-KR') + '원';
}

function animateNumber(el, target) {
  if (!el) return;
  const duration = 900;
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(eased * target).toLocaleString('ko-KR') + '원';
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── DB 데이터 로드 ───────────────────────────
async function loadDBRecords() {
  // sort 파라미터 제거 → API 버그 회피, JS에서 직접 정렬
  const res  = await fetch('tables/asset_records?limit=500');
  const json = await res.json();
  let rows = (json.data || [])
    .filter(r => r.id !== 'seed-01' && Number(r.total_asset) > 0);

  // total > 500이면 추가 페이지 로드
  if ((json.total || 0) > 500) {
    const res2 = await fetch('tables/asset_records?limit=500&page=2');
    const json2 = await res2.json();
    rows = rows.concat((json2.data || []).filter(r => r.id !== 'seed-01' && Number(r.total_asset) > 0));
  }

  return rows.sort((a, b) => {
    if (a.record_date < b.record_date) return -1;
    if (a.record_date > b.record_date) return 1;
    return (a.created_at || 0) - (b.created_at || 0);
  });
}

// ── KPI ─────────────────────────────────────
function renderKPI(records) {
  const grandTotal   = records.reduce((s, r) => s + Number(r.total_asset), 0);
  const lumpTotal    = records
    .filter(r => (r.title || '').includes('일시투여') || (r.account || '').includes('개인계좌'))
    .reduce((s, r) => s + Number(r.total_asset), 0);
  const regularTotal = grandTotal - lumpTotal;
  const count        = records.filter(r => !(r.title || '').includes('일시투여')).length;

  animateNumber(document.getElementById('kpiTotal'),   grandTotal);
  animateNumber(document.getElementById('kpiRegular'), regularTotal);
  animateNumber(document.getElementById('kpiLump'),    lumpTotal);
  const kpiCount = document.getElementById('kpiCount');
  if (kpiCount) kpiCount.textContent = count + '건';
}

// ── 일별 차트 ────────────────────────────────
let dailyChartInstance = null;

function renderDailyChart(records, filterMonth) {
  filterMonth = filterMonth || 'all';
  let txs = filterMonth === 'all'
    ? records
    : records.filter(r => (r.record_date || '').slice(5, 7) === filterMonth);

  const map = {};
  txs.forEach(r => {
    const label = (r.record_date || '').slice(5).replace('-', '.');
    if (!map[label]) map[label] = 0;
    map[label] += Number(r.total_asset);
  });

  const sorted = Object.entries(map).sort((a, b) => {
    const [am, ad] = a[0].split('.').map(Number);
    const [bm, bd] = b[0].split('.').map(Number);
    return am !== bm ? am - bm : ad - bd;
  });

  const labels = sorted.map(e => e[0]);
  const values = sorted.map(e => e[1]);
  const maxVal = Math.max(...values, 1);
  const backgroundColors = values.map(v =>
    `rgba(0,114,255,${(0.35 + (v / maxVal) * 0.55).toFixed(2)})`
  );

  const canvas = document.getElementById('dailyChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (dailyChartInstance) { dailyChartInstance.destroy(); dailyChartInstance = null; }

  dailyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '입금액',
        data: values,
        backgroundColor: backgroundColors,
        borderRadius: 2,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: c => fmt(c.parsed.y) },
          backgroundColor: 'rgba(10,22,40,0.95)',
          borderColor: 'rgba(0,198,255,0.4)',
          borderWidth: 1,
          titleColor: '#00c6ff',
          bodyColor: '#8ab4d4',
          padding: 10,
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,198,255,0.05)' },
          ticks: { color: '#4a7090', font: { size: 10, family: "'Noto Sans KR'" }, maxRotation: 45 },
        },
        y: {
          grid: { color: 'rgba(0,198,255,0.05)' },
          ticks: { color: '#4a7090', font: { size: 10 }, callback: v => fmtShort(v) },
          beginAtZero: true,
        },
      },
    },
  });
}

// ── 카테고리 도넛 차트 ───────────────────────
let categoryChartInstance = null;

function renderCategoryChart(records) {
  const catMap = {};
  records.forEach(r => {
    const cat = getCategory(r.title || '');
    catMap[cat] = (catMap[cat] || 0) + Number(r.total_asset);
  });

  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const labels = sorted.map(e => e[0]);
  const values = sorted.map(e => e[1]);
  const total  = values.reduce((s, v) => s + v, 0);
  const colors = labels.map((_, i) => CAT_COLORS[i % CAT_COLORS.length]);

  const canvas = document.getElementById('categoryChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (categoryChartInstance) { categoryChartInstance.destroy(); categoryChartInstance = null; }

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: 'rgba(0,198,255,0.2)',
        borderWidth: 2,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => {
              const pct = ((c.parsed / total) * 100).toFixed(1);
              return ` ${fmt(c.parsed)} (${pct}%)`;
            },
          },
          backgroundColor: 'rgba(10,22,40,0.95)',
          borderColor: 'rgba(0,198,255,0.4)',
          borderWidth: 1,
          titleColor: '#00c6ff',
          bodyColor: '#8ab4d4',
          padding: 10,
        },
      },
    },
  });

  const legendEl = document.getElementById('categoryLegend');
  if (legendEl) {
    legendEl.innerHTML = sorted.map(([cat, amt], i) => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${colors[i]}"></span>
        <span class="legend-name">${cat}</span>
        <span class="legend-pct">${fmt(amt)}</span>
      </div>
    `).join('');
  }
}

// ── 월별 카드 ────────────────────────────────
function renderMonthlyCards(records) {
  const months = {}, counts = {};
  records.forEach(r => {
    const m = (r.record_date || '').slice(5, 7);
    if (!months[m]) { months[m] = 0; counts[m] = 0; }
    months[m] += Number(r.total_asset);
    counts[m]++;
  });

  const allMonths = Object.keys(months).sort();
  const maxAmt = Math.max(...Object.values(months), 1);
  const monthName = m => ({'01':'1월','02':'2월','03':'3월','04':'4월','05':'5월','06':'6월',
    '07':'7월','08':'8월','09':'9월','10':'10월','11':'11월','12':'12월'}[m] || m+'월');

  const grid = document.getElementById('monthlyGrid');
  if (!grid) return;
  grid.innerHTML = allMonths.map(m => `
    <div class="monthly-card">
      <div class="monthly-title"><i class="fas fa-calendar"></i> ${monthName(m)}</div>
      <div class="monthly-amount">${fmt(months[m])}</div>
      <div class="monthly-sub">${counts[m]}건 입금</div>
      <div class="monthly-bar-bg">
        <div class="monthly-bar-fill" style="width:${(months[m]/maxAmt*100).toFixed(1)}%"></div>
      </div>
    </div>
  `).join('');
}

// ── 거래 테이블 ──────────────────────────────
const PAGE_SIZE = 20;
let currentPage  = 1;
let filteredData = [];

function renderTable(records) {
  filteredData = [...records].sort((a, b) => {
    if (a.record_date > b.record_date) return -1;
    if (a.record_date < b.record_date) return 1;
    return (b.created_at || 0) - (a.created_at || 0);
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = 1;

  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageData = filteredData.slice(startIdx, startIdx + PAGE_SIZE);

  const tbody = document.getElementById('tableBody');
  if (!tbody) return;

  if (pageData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted);">
      <i class="fas fa-search" style="font-size:1.5rem;display:block;margin-bottom:8px;"></i>
      데이터가 없습니다.</td></tr>`;
  } else {
    tbody.innerHTML = pageData.map(r => {
      const cat = getCategory(r.title || '');
      const cls = CAT_CLASS[cat] || 'cat-일시';
      const dateLabel = (r.record_date || '').slice(5).replace('-', '.');
      const acct = (r.account || '').replace('계좌', '');
      const memo = r.memo || r.title || '-';
      return `
        <tr>
          <td class="date-col"><i class="fas fa-calendar-day" style="margin-right:5px;font-size:0.7rem;"></i>${dateLabel}</td>
          <td class="note-col">${r.title || '-'}</td>
          <td class="amount-col">${fmt(r.total_asset)}</td>
          <td><span class="cat-badge ${cls}">${cat}</span></td>
          <td class="account-col">${acct}</td>
          <td class="memo-col">${memo}</td>
        </tr>`;
    }).join('');
  }

  const infoEl = document.getElementById('tableInfo');
  if (infoEl) infoEl.textContent =
    `총 ${filteredData.length}건 중 ${startIdx+1}~${Math.min(startIdx+PAGE_SIZE, filteredData.length)}건 표시`;

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const pg = document.getElementById('pagination');
  if (!pg) return;
  if (totalPages <= 1) { pg.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="goPage(${currentPage-1})" ${currentPage===1?'disabled':''}><i class="fas fa-chevron-left"></i></button>`;
  const range = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i===1 || i===totalPages || (i>=currentPage-range && i<=currentPage+range)) {
      html += `<button class="page-btn ${i===currentPage?'active':''}" onclick="goPage(${i})">${i}</button>`;
    } else if (i===currentPage-range-1 || i===currentPage+range+1) {
      html += `<button class="page-btn" disabled>…</button>`;
    }
  }
  html += `<button class="page-btn" onclick="goPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}><i class="fas fa-chevron-right"></i></button>`;
  pg.innerHTML = html;
}

window.goPage = function(n) {
  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
  if (n < 1 || n > totalPages) return;
  currentPage = n;
  renderTable(window._dbRecords || []);
  const ts = document.querySelector('.table-section');
  if (ts) ts.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ── 날짜 표시 ────────────────────────────────
function setDates() {
  const today = new Date();
  const options = { year:'numeric', month:'long', day:'numeric', weekday:'long' };
  const str = today.toLocaleDateString('ko-KR', options);
  const hd = document.getElementById('headerDate');
  const fd = document.getElementById('footerDate');
  if (hd) hd.textContent = '기준일: ' + str;
  if (fd) fd.textContent = str;
}

// ── 전체 초기화 ───────────────────────────────
window._dbRecords = [];

window.addEventListener('DOMContentLoaded', async () => {
  setDates();

  // 필터 버튼 이벤트 — DOMContentLoaded 안에서 등록
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderDailyChart(window._dbRecords, btn.dataset.filter);
    });
  });

  try {
    const records = await loadDBRecords();
    window._dbRecords = records;
    console.log('[DQ9] DB 로드 완료:', records.length, '건');

    renderKPI(records);
    renderMonthlyCards(records);
    renderDailyChart(records, 'all');
    renderTable(records);
    renderCategoryChart(records);

  } catch (e) {
    console.error('[DQ9] DB 로드 실패, 폴백 사용:', e);
    const fallback = (typeof RAW_TRANSACTIONS !== 'undefined')
      ? RAW_TRANSACTIONS.map(t => ({
          record_date: '2026-' + t.date.replace('.', '-'),
          title: t.note,
          total_asset: t.amount,
          account: t.account,
          memo: t.note,
          dq9_amount: 0,
        }))
      : [];
    window._dbRecords = fallback;
    renderKPI(fallback);
    renderMonthlyCards(fallback);
    renderDailyChart(fallback, 'all');
    renderTable(fallback);
    renderCategoryChart(fallback);
  }
});

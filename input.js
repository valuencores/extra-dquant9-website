// ==========================================
//  DQ9 자산 입력 관리자 - 메인 스크립트 (루트 위치)
// ==========================================

// ── 인증 설정 ────────────────────────────────
const AUTH = { id: 'valuencores', pw: '@vnc1201' };
const SESSION_KEY = 'dq9_admin_auth';

// ── API Base URL (페이지 위치와 무관하게 항상 루트 tables/ 사용) ──
// admin/ 서브폴더에서 실행 시에도 올바른 경로로 접근
const _isInSubDir = window.location.pathname.includes('/admin/');
const API_BASE    = _isInSubDir ? '../tables/' : 'tables/';

// ── 페이지 초기화 ────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  if (isLoggedIn()) {
    showApp();
  } else {
    document.getElementById('loginScreen').classList.remove('hidden');
  }

  // 로그인 폼
  document.getElementById('loginForm').addEventListener('submit', handleLogin);

  // 탭 전환
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 투여금액 입력 시 즉시 DQ9 누적금액 자동계산
  document.getElementById('inputTotal').addEventListener('input', e => {
    formatAmountInput(e, 'totalPreview');
    calcDQ9Auto();
  });

  // 날짜 필드: 사용자가 직접 변경하면 자동갱신 중지 플래그 설정
  document.getElementById('inputDate').addEventListener('change', function() {
    const today = getTodayStr();
    if (this.value !== today) {
      this.dataset.userEdited = 'true';  // 오늘 날짜가 아닌 다른 날 선택 → 자동갱신 중지
    } else {
      delete this.dataset.userEdited;    // 오늘 날짜로 돌아오면 자동갱신 재개
    }
  });

  // 추천 키워드 태그 - 기존 텍스트 우측에 한 칸 떼고 추가
  document.querySelectorAll('.quick-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      const memoEl  = document.getElementById('inputMemo');
      const current = memoEl.value.trim();
      const keyword = btn.dataset.memo;
      memoEl.value  = current ? current + ' ' + keyword : keyword;
      memoEl.focus();
    });
  });

  // 자산 입력 폼 제출
  document.getElementById('assetForm').addEventListener('submit', handleAssetSubmit);

  // 히스토리 range 변경
  document.getElementById('historyRange').addEventListener('change', loadHistory);

  // 기간 버튼
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTrendChart(btn.dataset.period);
    });
  });

  // 오늘 날짜 기본값 설정 + 자정 자동 갱신
  syncDateField();
  setInterval(syncDateField, 60000); // 매 1분마다 날짜 체크
});

// ── 인증 ────────────────────────────────────
function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}

function handleLogin(e) {
  e.preventDefault();
  const rawId = document.getElementById('loginId').value.trim();
  const pw    = document.getElementById('loginPw').value;
  const errEl = document.getElementById('loginError');

  // 이메일 형식 허용: @ 앞부분만 추출
  const id     = rawId.includes('@') ? rawId.split('@')[0].toLowerCase() : rawId.toLowerCase();
  const validId = AUTH.id.toLowerCase();

  if (id === validId && pw === AUTH.pw) {
    sessionStorage.setItem(SESSION_KEY, 'true');
    errEl.classList.add('hidden');
    showApp();
  } else {
    errEl.classList.remove('hidden');
    document.getElementById('loginPw').value = '';
    if (pw === AUTH.pw && id !== validId) {
      errEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> 아이디를 확인해주세요.';
    } else {
      errEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> 아이디 또는 패스워드가 올바르지 않습니다.';
    }
  }
}

function doLogout() {
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
}

function showApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('adminApp').classList.remove('hidden');
  switchTab('input');
  loadHistory();
  loadStats();
  // 페이지 진입 즉시 DB 누적값 조회 → preview에만 표시 (입력 칸은 비움)
  _fetchDQ9Base().then(base => {
    const dq9Input = document.getElementById('inputDQ9');
    const preview  = document.getElementById('dq9Preview');
    if (!dq9Input) return;
    dq9Input.value      = '';   // 입력 칸은 비워둠
    preview.textContent = base > 0 ? `현재 DB 누적: ${fmt(base)}` : '아직 기록 없음';
  });
}

function togglePw() {
  const input = document.getElementById('loginPw');
  const icon  = document.getElementById('pwEyeIcon');
  if (input.type === 'password') {
    input.type       = 'text';
    icon.className   = 'fas fa-eye-slash';
  } else {
    input.type       = 'password';
    icon.className   = 'fas fa-eye';
  }
}

// ── 탭 전환 ─────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${name}`));
  if (name === 'history') loadHistory();
  if (name === 'stats')   loadStats();
}

// ── 날짜 유틸 ────────────────────────────────
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

// 날짜 필드를 오늘 날짜로 동기화 (사용자가 직접 바꾸지 않은 경우에만)
function syncDateField() {
  const el    = document.getElementById('inputDate');
  if (!el) return;
  const today = getTodayStr();
  // 사용자가 직접 수정한 경우에는 덮어쓰지 않음
  // data-auto 속성이 'true'이거나 값이 비어 있을 때만 갱신
  if (!el.dataset.userEdited) {
    el.value = today;
  }
}


function getWeekLabel(dateStr) {
  const d           = new Date(dateStr);
  const year        = d.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const week        = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function getMonthLabel(dateStr) {
  return dateStr.substring(0, 7);
}

// ── 금액 포맷 ────────────────────────────────
function formatAmountInput(e, previewId) {
  const raw = e.target.value.replace(/[^0-9]/g, '');
  if (raw) {
    e.target.value = Number(raw).toLocaleString('ko-KR');
    document.getElementById(previewId).textContent = '≈ ' + Number(raw).toLocaleString('ko-KR') + '원';
  } else {
    e.target.value = '';
    document.getElementById(previewId).textContent = '';
  }
}

function parseAmount(str) {
  return Number((str || '').replace(/[^0-9]/g, '')) || 0;
}

function fmt(n) {
  if (n == null || isNaN(n)) return '-';
  return n.toLocaleString('ko-KR') + '원';
}

function fmtDiff(n) {
  if (n == null || isNaN(n)) return '-';
  const sign = n > 0 ? '+' : '';
  return sign + n.toLocaleString('ko-KR') + '원';
}

// ── DQ9 누적금액 자동계산 (입력 즉시) ──────────
let _cachedDQ9Base    = null;
let _dq9FetchPromise  = null;

async function _fetchDQ9Base() {
  // 이미 캐시된 값이 있으면 즉시 반환
  if (_cachedDQ9Base !== null) return _cachedDQ9Base;
  if (_dq9FetchPromise) return _dq9FetchPromise;
  _dq9FetchPromise = fetch(API_BASE + 'asset_records?limit=500')
    .then(r => r.json())
    .then(json => {
      // seed 제외 후 dq9_amount 최댓값 = 현재까지의 정확한 총 누적값
      const records = (json.data || []).filter(r => r.id !== 'seed-01');
      // dq9_amount 중 최대값 사용 (같은 날짜 여러 건 입력 시 순서 무관하게 정확)
      const maxDQ9 = records.reduce((max, r) => {
        const v = Number(r.dq9_amount) || 0;
        return v > max ? v : max;
      }, 0);
      _cachedDQ9Base   = maxDQ9;
      _dq9FetchPromise = null;
      return _cachedDQ9Base;
    })
    .catch(() => { _dq9FetchPromise = null; _cachedDQ9Base = 0; return 0; });
  return _dq9FetchPromise;
}

async function calcDQ9Auto() {
  const totalVal = parseAmount(document.getElementById('inputTotal').value);
  const preview  = document.getElementById('dq9Preview');
  const dq9Input = document.getElementById('inputDQ9');

  try {
    const base     = _cachedDQ9Base !== null ? _cachedDQ9Base : await _fetchDQ9Base();
    if (totalVal > 0) {
      // 금액 입력됨: 합산값을 칸에 표시 + 수식 안내
      const newTotal      = base + totalVal;
      dq9Input.value      = newTotal.toLocaleString('ko-KR');
      preview.textContent = `기존 ${fmt(base)} + 금일 ${fmt(totalVal)} = ${fmt(newTotal)}`;
    } else {
      // 금액 미입력: 칸 비우고 DB 누적만 preview에 표시
      dq9Input.value      = '';
      preview.textContent = base > 0 ? `현재 DB 누적: ${fmt(base)}` : '아직 기록 없음';
    }
  } catch (err) {
    preview.textContent = '누적값 조회 실패';
  }
}

// ── 폼 초기화 ────────────────────────────────
function resetForm() {
  document.getElementById('assetForm').reset();
  // 날짜 필드: userEdited 플래그 초기화 후 오늘 날짜로 복원
  const dateEl = document.getElementById('inputDate');
  delete dateEl.dataset.userEdited;
  dateEl.value = getTodayStr();
  document.getElementById('totalPreview').textContent = '';
  document.getElementById('formMsg').classList.add('hidden');
  // 캐시는 유지 (저장 후 캐시에 최신 누적값이 반영됨)
  // 리셋 후 DQ9 필드에 현재 DB 누적값 재표시
  const base     = _cachedDQ9Base;
  const dq9Input = document.getElementById('inputDQ9');
  const preview  = document.getElementById('dq9Preview');
  dq9Input.value      = '';   // 리셋 후 칸은 비워둠
  preview.textContent = (base !== null && base > 0) ? `현재 DB 누적: ${fmt(base)}` : '아직 기록 없음';
  // 송금계좌 기본값 복원
  document.getElementById('inputAccount').value = 'DQ9신한계좌';
}

// ── 자산 저장 ────────────────────────────────
async function handleAssetSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  btn.disabled  = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 저장 중...';

  const dateVal    = document.getElementById('inputDate').value;
  const titleVal   = (document.getElementById('inputTitle').value || '').trim();
  const totalVal   = parseAmount(document.getElementById('inputTotal').value);
  const accountVal = (document.getElementById('inputAccount').value || '').trim();
  const memoVal    = (document.getElementById('inputMemo').value || '').trim();

  if (!dateVal || !totalVal) {
    showMsg('날짜와 투여금액은 필수입니다.', 'error');
    btn.disabled  = false;
    btn.innerHTML = '<i class="fas fa-save"></i> 저장하기';
    return;
  }

  try {
    // ① 기존 누적값 최신 조회 — dq9_amount 최댓값 사용 (같은 날짜 여러 건도 정확)
    const histRes  = await fetch(API_BASE + 'asset_records?limit=500');
    const histJson = await histRes.json();
    const records  = (histJson.data || []).filter(r => r.id !== 'seed-01');
    const prevDQ9  = records.reduce((max, r) => {
      const v = Number(r.dq9_amount) || 0;
      return v > max ? v : max;
    }, 0);
    const newDQ9  = prevDQ9 + totalVal;

    // ② 저장
    const payload = {
      record_date: dateVal,
      title:       titleVal,
      total_asset: totalVal,
      account:     accountVal,
      dq9_amount:  newDQ9,
      memo:        memoVal,
      week_label:  getWeekLabel(dateVal),
      month_label: getMonthLabel(dateVal),
    };

    const res = await fetch(API_BASE + 'asset_records', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('저장 실패 ' + res.status);

    const saved = await res.json();
    showMsg(`✅ 저장 완료! 투여금액: ${fmt(totalVal)} | DQ9 누적: ${fmt(newDQ9)}`, 'success');
    _cachedDQ9Base = newDQ9;   // 캐시 갱신 (prevDQ9 + 방금 저장한 totalVal)
    updateTodaySummary(saved, prevDQ9, totalVal);
    resetForm();
    loadHistory();

  } catch (err) {
    console.error('저장 오류:', err);
    showMsg(`저장 중 오류가 발생했습니다. (${err.message})`, 'error');
  } finally {
    btn.disabled  = false;
    btn.innerHTML = '<i class="fas fa-save"></i> 저장하기';
  }
}

function showMsg(text, type) {
  const el      = document.getElementById('formMsg');
  el.className  = `form-msg ${type}`;
  el.innerHTML  = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${text}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 6000);
}

function updateTodaySummary(record, prevDQ9, todayAmount) {
  const summary = document.getElementById('todaySummary');
  const grid    = document.getElementById('summaryGrid');
  summary.style.display = 'block';
  grid.innerHTML = `
    <div class="summary-item">
      <div class="summary-item-label">기록 날짜</div>
      <div class="summary-item-value">${record.record_date}</div>
    </div>
    <div class="summary-item">
      <div class="summary-item-label">제목</div>
      <div class="summary-item-value">${record.title || '-'}</div>
    </div>
    <div class="summary-item">
      <div class="summary-item-label">금일 투여금액</div>
      <div class="summary-item-value" style="color:var(--accent)">${fmt(todayAmount)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-item-label">이전 DQ9 누적</div>
      <div class="summary-item-value" style="color:var(--text-secondary);font-size:0.9rem">${fmt(prevDQ9)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-item-label">DQ9 투여 누적금액</div>
      <div class="summary-item-value" style="color:var(--primary);font-weight:700">${fmt(record.dq9_amount)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-item-label">메모</div>
      <div class="summary-item-value" style="font-size:0.85rem;color:var(--text-secondary)">${record.memo || '-'}</div>
    </div>
  `;
}

// ── 이력 불러오기 ────────────────────────────
let allRecords = [];

async function loadHistory() {
  const tbody = document.getElementById('historyTableBody');
  tbody.innerHTML = '<tr><td colspan="6" class="loading-row"><i class="fas fa-spinner fa-spin"></i> 불러오는 중...</td></tr>';

  try {
    const res  = await fetch(API_BASE + 'asset_records?limit=300');
    const json = await res.json();
    allRecords = (json.data || []).filter(r => r.id !== 'seed-01');
    allRecords.sort((a, b) => b.record_date.localeCompare(a.record_date));

    const range   = parseInt(document.getElementById('historyRange').value);
    let display   = allRecords;

    if (!isNaN(range)) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - range);
      display = allRecords.filter(r => new Date(r.record_date) >= cutoff);
    }

    if (display.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="loading-row" style="color:var(--text-muted)"><i class="fas fa-inbox"></i> 기록이 없습니다.</td></tr>';
      document.getElementById('historyInfo').textContent = '';
      return;
    }

    tbody.innerHTML = display.map((r) => {
      return `
        <tr>
          <td class="date-col"><i class="fas fa-calendar-day" style="margin-right:5px;font-size:0.65rem;"></i>${r.record_date}</td>
          <td style="color:var(--text-primary);font-size:0.82rem;">${r.title || '-'}</td>
          <td class="amount-col">${fmt(r.total_asset)}</td>
          <td class="amount-col" style="color:var(--text-secondary)">${r.dq9_amount ? fmt(r.dq9_amount) : '-'}</td>
          <td style="color:var(--text-muted);font-size:0.8rem;">${r.memo || '-'}</td>
          <td>
            <button class="btn-icon-sm danger" title="삭제" onclick="openDeleteModal('${r.id}','${r.record_date}')">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    document.getElementById('historyInfo').textContent = `총 ${display.length}건 표시`;
  } catch (err) {
    console.error('이력 로드 오류:', err);
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row" style="color:var(--red-light)"><i class="fas fa-exclamation-circle"></i> 불러오기 실패</td></tr>';
  }
}

// ── 삭제 ────────────────────────────────────
let pendingDeleteId = null;

function openDeleteModal(id, date) {
  pendingDeleteId = id;
  document.getElementById('deleteModalDesc').textContent = `${date} 기록을 영구 삭제합니다.`;
  document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
  pendingDeleteId = null;
  document.getElementById('deleteModal').classList.add('hidden');
}

async function confirmDelete() {
  if (!pendingDeleteId) return;
  try {
    await fetch(API_BASE + `asset_records/${pendingDeleteId}`, { method: 'DELETE' });
    closeDeleteModal();
    loadHistory();
    _cachedDQ9Base = null; // 삭제 후 누적값 캐시 초기화
    if (document.getElementById('tab-stats').classList.contains('active')) loadStats();
  } catch (err) {
    alert('삭제 중 오류가 발생했습니다.');
  }
}

// ── 통계 / 차트 ──────────────────────────────
let trendChartInst = null;
let deltaChartInst = null;

async function loadStats() {
  try {
    const res  = await fetch(API_BASE + 'asset_records?limit=300');
    const json = await res.json();
    let records = (json.data || [])
      .filter(r => r.id !== 'seed-01')
      .sort((a, b) => a.record_date.localeCompare(b.record_date));

    if (records.length === 0) {
      ['statLatest','statDayChange','statWeekChange','statMonthChange'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = '-'; el.className = 'stats-kpi-value neutral'; }
      });
      return;
    }

    const latest = records[records.length - 1];
    document.getElementById('statLatest').textContent = fmt(latest.dq9_amount || 0);

    if (records.length >= 2) {
      const prev = records[records.length - 2];
      const diff = latest.total_asset - prev.total_asset;
      const el   = document.getElementById('statDayChange');
      el.textContent = fmtDiff(diff);
      el.className   = 'stats-kpi-value ' + (diff > 0 ? 'pos' : diff < 0 ? 'neg' : 'neutral');
    }

    const weekAgo    = new Date(latest.record_date);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekRecord = findClosestBefore(records, weekAgo);
    if (weekRecord) {
      const diff = latest.dq9_amount - (weekRecord.dq9_amount || 0);
      const el   = document.getElementById('statWeekChange');
      el.textContent = fmtDiff(diff);
      el.className   = 'stats-kpi-value ' + (diff > 0 ? 'pos' : diff < 0 ? 'neg' : 'neutral');
    }

    const monthAgo    = new Date(latest.record_date);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthRecord = findClosestBefore(records, monthAgo);
    if (monthRecord) {
      const diff = latest.dq9_amount - (monthRecord.dq9_amount || 0);
      const el   = document.getElementById('statMonthChange');
      el.textContent = fmtDiff(diff);
      el.className   = 'stats-kpi-value ' + (diff > 0 ? 'pos' : diff < 0 ? 'neg' : 'neutral');
    }

    renderTrendChart('weekly', records);
    renderDeltaChart(records);

  } catch (err) {
    console.error('통계 로드 오류:', err);
  }
}

function findClosestBefore(records, targetDate) {
  const filtered = records.filter(r => new Date(r.record_date) <= targetDate);
  return filtered.length > 0 ? filtered[filtered.length - 1] : null;
}

function renderTrendChart(period, records) {
  if (!records) {
    fetch(API_BASE + 'asset_records?limit=300')
      .then(r => r.json())
      .then(json => {
        const recs = (json.data || [])
          .filter(r => r.id !== 'seed-01')
          .sort((a, b) => a.record_date.localeCompare(b.record_date));
        _renderTrendChart(period, recs);
      });
  } else {
    _renderTrendChart(period, records);
  }
}

function _renderTrendChart(period, records) {
  let filtered = [...records];
  if (period === 'weekly') {
    const cut = new Date(); cut.setDate(cut.getDate() - 14);
    filtered  = filtered.filter(r => new Date(r.record_date) >= cut);
  } else if (period === 'monthly') {
    const cut = new Date(); cut.setDate(cut.getDate() - 60);
    filtered  = filtered.filter(r => new Date(r.record_date) >= cut);
  }

  const labels = filtered.map(r => r.record_date.substring(5));
  const values = filtered.map(r => r.dq9_amount || 0);

  const ctx = document.getElementById('trendChart').getContext('2d');
  if (trendChartInst) trendChartInst.destroy();

  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(0,51,102,0.18)');
  gradient.addColorStop(1, 'rgba(0,51,102,0.0)');

  trendChartInst = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{
      label: 'DQ9 투여 누적',
      data: values,
      borderColor: '#003366',
      backgroundColor: gradient,
      borderWidth: 2,
      pointBackgroundColor: '#003366',
      pointRadius: filtered.length > 30 ? 2 : 4,
      pointHoverRadius: 6,
      tension: 0.3,
      fill: true,
    }]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => fmt(ctx.parsed.y) },
          backgroundColor: '#ffffff', borderColor: '#D0D0CB', borderWidth: 1,
          titleColor: '#003366', bodyColor: '#707068', padding: 10,
        },
      },
      scales: {
        x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#A8A8A0', font: { size: 10 }, maxRotation: 45 } },
        y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: {
          color: '#A8A8A0', font: { size: 10 },
          callback: v => v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 10000 ? Math.round(v/10000)+'만' : v.toLocaleString()
        }},
      },
    },
  });
}

function renderDeltaChart(records) {
  if (records.length < 2) return;
  const recent = records.slice(-30);
  const labels = [], values = [];
  for (let i = 1; i < recent.length; i++) {
    labels.push(recent[i].record_date.substring(5));
    values.push(recent[i].total_asset - recent[i-1].total_asset);
  }
  const colors = values.map(v =>
    v > 0 ? 'rgba(26,122,74,0.75)' : v < 0 ? 'rgba(204,0,0,0.65)' : 'rgba(168,168,160,0.45)'
  );

  const ctx = document.getElementById('deltaChart').getContext('2d');
  if (deltaChartInst) deltaChartInst.destroy();
  deltaChartInst = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{
      label: '전일 대비 증감', data: values,
      backgroundColor: colors, borderRadius: 2, borderSkipped: false,
    }]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => fmtDiff(ctx.parsed.y) },
          backgroundColor: '#ffffff', borderColor: '#D0D0CB', borderWidth: 1,
          titleColor: '#003366', bodyColor: '#707068', padding: 10,
        },
      },
      scales: {
        x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#A8A8A0', font: { size: 10 }, maxRotation: 45 } },
        y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: {
          color: '#A8A8A0', font: { size: 10 },
          callback: v => { const s = v>0?'+':''; return Math.abs(v)>=10000 ? s+Math.round(v/10000)+'만' : s+v.toLocaleString(); }
        }},
      },
    },
  });
}

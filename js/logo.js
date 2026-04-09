// ── D.Quant9 로고 Canvas 렌더러 ──────────────────────────────
// 사용법: drawDQ9Logo(canvasElement)
function drawDQ9Logo(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width  = 100;
  canvas.height = 80;
  const W = 100, H = 80;

  // 배경
  ctx.fillStyle = '#0d1b2a';
  ctx.fillRect(0, 0, W, H);

  // 주식 캔들스틱 차트 (배경 레이어)
  const chartData = [
    {o:52,h:58,l:48,c:56},{o:56,h:62,l:53,c:60},
    {o:60,h:66,l:57,c:58},{o:58,h:63,l:54,c:62},
    {o:62,h:68,l:59,c:67},{o:67,h:72,l:64,c:65},
    {o:65,h:70,l:61,c:69},{o:69,h:74,l:66,c:73},
    {o:73,h:78,l:70,c:71},{o:71,h:77,l:68,c:75},
  ];
  const cw = W / chartData.length;
  const scaleY = v => H - (v - 44) * (H / 38);

  ctx.globalAlpha = 0.22;
  chartData.forEach((d, i) => {
    const x   = i * cw + cw * 0.5;
    const up  = d.c >= d.o;
    const col = up ? '#52d68a' : '#e05470';
    // 심지
    ctx.strokeStyle = col; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(x, scaleY(d.h)); ctx.lineTo(x, scaleY(d.l)); ctx.stroke();
    // 몸통
    ctx.fillStyle = col;
    const top = scaleY(Math.max(d.o, d.c));
    const ht  = Math.max(1.2, Math.abs(scaleY(d.o) - scaleY(d.c)));
    ctx.fillRect(x - cw * 0.28, top, cw * 0.56, ht);
  });
  ctx.globalAlpha = 1;

  // 상승 추세선 (골드)
  ctx.strokeStyle = '#f0c040'; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.78);
  ctx.bezierCurveTo(W * 0.3, H * 0.65, W * 0.65, H * 0.38, W, H * 0.15);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // "D" — 골드 대문자 (글로우)
  ctx.shadowColor  = '#f0c040';
  ctx.shadowBlur   = 8;
  ctx.fillStyle    = '#f0c040';
  ctx.font         = 'bold 34px Georgia, "Times New Roman", serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('D', 3, H * 0.47);

  // "." — 골드 점
  ctx.font      = 'bold 28px Georgia, "Times New Roman", serif';
  ctx.fillText('.', 22, H * 0.47);

  // "Quant" — 흰색
  ctx.shadowBlur = 0;
  ctx.fillStyle  = '#ffffff';
  ctx.font       = 'bold 15px Arial, sans-serif';
  ctx.fillText('Quant', 33, H * 0.42);

  // "9" — 골드
  ctx.fillStyle = '#f0c040';
  ctx.font      = 'bold 15px Arial, sans-serif';
  ctx.fillText('9', 80, H * 0.42);

  // 하단 구분선 (골드)
  ctx.strokeStyle = '#f0c040'; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.moveTo(5, H * 0.68); ctx.lineTo(95, H * 0.68); ctx.stroke();
  ctx.globalAlpha = 1;
}

// DOM 로드 후 자동 렌더링
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('canvas.dq9-logo').forEach(drawDQ9Logo);
});

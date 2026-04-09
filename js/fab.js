// ==========================================
//  DQ9 메인 - 플로팅 FAB 메뉴
// ==========================================

let fabOpen = false;

function toggleFab() {
  fabOpen = !fabOpen;
  const menu = document.getElementById('fabMenu');
  const icon = document.getElementById('fabIcon');
  const btn  = document.getElementById('fabMain');

  if (fabOpen) {
    menu.classList.add('open');
    btn.classList.add('active');
    icon.className = 'fas fa-times';
  } else {
    menu.classList.remove('open');
    btn.classList.remove('active');
    icon.className = 'fas fa-dragon';
  }
}

function scrollToTop(e) {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (fabOpen) toggleFab();
}

// 외부 클릭 시 닫기
document.addEventListener('click', (e) => {
  const container = document.getElementById('fabContainer');
  if (fabOpen && container && !container.contains(e.target)) {
    toggleFab();
  }
});

// 스크롤 시 FAB 살짝 축소
window.addEventListener('scroll', () => {
  const btn = document.getElementById('fabMain');
  if (!btn) return;
  if (window.scrollY > 200) {
    btn.style.transform = fabOpen ? 'rotate(45deg) scale(1)' : 'scale(0.88)';
  } else {
    btn.style.transform = fabOpen ? 'rotate(45deg) scale(1)' : 'scale(1)';
  }
});

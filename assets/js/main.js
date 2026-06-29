const YEAR_COLORS = { 1: '#6366f1', 2: '#7c3aed', 3: '#8b5cf6' };
const YEAR_LABELS = { 1: 'NĂM 1', 2: 'NĂM 2', 3: 'NĂM 3' };

let allCourses = [];
let fuse = null;
let activeYear = 'all';

function countFiles(course) {
  return (course.groups || []).reduce((sum, g) => sum + (g.files || []).length, 0);
}

function renderCards(courses) {
  const grid = document.getElementById('courses-grid');
  document.getElementById('count').textContent = courses.length;

  if (!courses.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3>Không tìm thấy môn học</h3>
        <p>Thử từ khóa khác hoặc chọn tab năm học khác</p>
      </div>`;
    return;
  }

  grid.innerHTML = courses.map(c => {
    const color = YEAR_COLORS[c.year];
    const totalFiles = countFiles(c);
    const groupCount = (c.groups || []).length;
    const hasMaterials = totalFiles > 0;

    return `<a href="course.html?id=${encodeURIComponent(c.id)}" class="course-card"
        style="--card-accent:${color}"
        role="article"
        aria-label="${c.name}">
        <div class="card-top">
          <span class="year-badge" style="background:${color}20;color:${color};border:1px solid ${color}40">${YEAR_LABELS[c.year]}</span>
          <span class="card-id">${c.id}</span>
        </div>
        <p class="card-name">${c.name}</p>
        <div class="card-footer">
          <span class="card-meta">${hasMaterials ? `${totalFiles} tài liệu · ${groupCount} nhóm` : 'Chưa có tài liệu'}</span>
          <span class="card-arrow">→</span>
        </div>
      </a>`;
  }).join('');
}

function getFilteredCourses(query) {
  let list = allCourses;
  if (activeYear !== 'all') {
    list = list.filter(c => c.year === parseInt(activeYear, 10));
  }
  if (query && fuse) {
    list = fuse.search(query).map(r => r.item).filter(c => activeYear === 'all' || c.year === parseInt(activeYear, 10));
  }
  return list;
}

async function init() {
  const res = await fetch('data/courses.json');
  const data = await res.json();
  allCourses = data.courses;

  fuse = new Fuse(allCourses, {
    keys: ['name', 'description', 'lecturer'],
    threshold: 0.35,
  });

  renderCards(allCourses);

  // Search
  document.getElementById('search-input').addEventListener('input', function () {
    renderCards(getFilteredCourses(this.value.trim()));
  });

  // Year tabs
  document.getElementById('year-tabs').addEventListener('click', function (e) {
    const btn = e.target.closest('.year-tab');
    if (!btn) return;
    document.querySelectorAll('.year-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeYear = btn.dataset.year;
    renderCards(getFilteredCourses(document.getElementById('search-input').value.trim()));
  });
}

init();

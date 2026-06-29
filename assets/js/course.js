const YEAR_COLORS = { 1: '#6366f1', 2: '#7c3aed', 3: '#8b5cf6' };
const YEAR_LABELS = { 1: 'NĂM 1', 2: 'NĂM 2', 3: 'NĂM 3' };

const TYPE_ICONS = {
  pdf:  { icon: '📄', cls: 'icon-pdf',  label: 'PDF'  },
  docx: { icon: '📝', cls: 'icon-docx', label: 'DOCX' },
  doc:  { icon: '📝', cls: 'icon-doc',  label: 'DOC'  },
  xlsx: { icon: '📊', cls: 'icon-xlsx', label: 'XLSX' },
  pptx: { icon: '📋', cls: 'icon-pptx', label: 'PPTX' },
  ppt:  { icon: '📋', cls: 'icon-ppt',  label: 'PPT'  },
  exe:  { icon: '⚙️', cls: 'icon-other', label: 'EXE' },
  zip:  { icon: '🗜️', cls: 'icon-other', label: 'ZIP' },
};

function getTypeInfo(type) {
  return TYPE_ICONS[type?.toLowerCase()] || { icon: '📁', cls: 'icon-other', label: (type || '').toUpperCase() };
}

function encodePath(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return path.split('/').map(encodeURIComponent).join('/');
}

// ── Render course page ──
function renderPage(course) {
  const color = YEAR_COLORS[course.year];
  document.title = `${course.name} — MAC Docs`;
  document.documentElement.style.setProperty('--course-accent', color);

  const badge = document.getElementById('course-year-badge');
  badge.textContent = YEAR_LABELS[course.year];
  badge.style.cssText = `background:${color}20;color:${color};border:1px solid ${color}40`;

  document.getElementById('course-id').textContent = course.id;
  document.getElementById('course-name').textContent = course.name;
  document.getElementById('course-desc').textContent = course.description || '';

  const lecEl = document.getElementById('course-lecturer-wrap');
  if (course.lecturer) {
    lecEl.classList.remove('hidden');
    document.getElementById('course-lecturer').textContent = course.lecturer;
  }

  renderFilesTab(course);
}

function renderFilesTab(course) {
  const container = document.getElementById('files-content');
  const groups = course.groups || [];

  if (!groups.length) {
    container.innerHTML = `<div class="empty-group">Chưa có tài liệu nào. Nội dung sẽ được cập nhật sớm.</div>`;
    return;
  }

  const totalFiles = groups.reduce((sum, g) => sum + (g.files || []).length, 0);
  if (!totalFiles) {
    container.innerHTML = `<div class="empty-group">Chưa có tài liệu nào. Nội dung sẽ được cập nhật sớm.</div>`;
    return;
  }

  container.innerHTML = groups.map(group => {
    if (!group.files?.length) return '';
    const filesHtml = group.files.map(f => {
      const info = getTypeInfo(f.type);
      const href = encodePath(f.path);
      const isPdf = f.type === 'pdf';
      return `<div class="file-item">
          <div class="file-type-icon ${info.cls}">${info.icon}</div>
          <div class="file-info">
            <span class="file-name" title="${f.name}">${f.name}</span>
            <span class="file-ext">${info.label}</span>
          </div>
          <div class="file-actions">
            ${isPdf ? `<a class="btn-preview" href="${href}" target="_blank" rel="noopener">Mở</a>` : ''}
            <a class="btn-download" href="${href}" download="${f.name}" title="Tải về">↓ Tải</a>
          </div>
        </div>`;
    }).join('');

    return `<div class="group-section">
        <div class="group-title">
          📁 ${group.name}
          <span class="group-count">${group.files.length}</span>
        </div>
        ${filesHtml}
      </div>`;
  }).join('');
}

// ── Init ──
async function init() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    showError('Không tìm thấy mã môn học trong URL.');
    return;
  }

  try {
    const res = await fetch('data/courses.json');
    const data = await res.json();
    const course = data.courses.find(c => c.id === id);

    if (!course) {
      showError(`Môn học "${id}" không tồn tại.`);
      return;
    }

    renderPage(course);
  } catch (err) {
    showError('Lỗi tải dữ liệu: ' + err.message);
  }
}

function showError(msg) {
  document.getElementById('course-content').innerHTML = `
    <div class="course-error">
      <div style="font-size:2.5rem">⚠️</div>
      <h3>${msg}</h3>
      <a href="index.html" class="btn-home">← Quay lại trang chủ</a>
    </div>`;
}

init();

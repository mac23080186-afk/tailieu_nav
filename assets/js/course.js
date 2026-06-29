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
  return path.split('/').map(encodeURIComponent).join('/');
}

// ── PDF state ──
let pdfDoc = null;
let pdfPage = 1;
let pdfScale = null; // null = auto-fit
let lastRenderScale = 1;
let currentPath = null;
let renderBusy = false;

async function renderPdfPage(num) {
  if (renderBusy || !pdfDoc) return;
  renderBusy = true;
  try {
    const page = await pdfDoc.getPage(num);
    const canvas = document.getElementById('pdf-canvas');
    const container = canvas.parentElement;
    const maxW = container.clientWidth - 32;
    const baseViewport = page.getViewport({ scale: 1 });
    const autoScale = Math.min(maxW / baseViewport.width, 2.5);
    const scale = pdfScale ?? autoScale;
    lastRenderScale = scale;
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    pdfPage = num;
    document.getElementById('pdf-page-num').textContent = num;
    document.getElementById('pdf-btn-prev').disabled = num <= 1;
    document.getElementById('pdf-btn-next').disabled = num >= pdfDoc.numPages;
    const zoomLabel = document.getElementById('pdf-zoom-label');
    if (zoomLabel) zoomLabel.textContent = pdfScale === null ? 'Vừa khít' : `${Math.round(scale * 100)}%`;
  } finally {
    renderBusy = false;
  }
}

async function openPdf(path, itemEl) {
  const viewer = document.getElementById('pdf-viewer');
  const status = document.getElementById('pdf-status');
  const canvas = document.getElementById('pdf-canvas');

  if (currentPath === path && !viewer.classList.contains('hidden')) {
    viewer.classList.add('hidden');
    document.querySelectorAll('.file-item').forEach(el => el.classList.remove('preview-active'));
    currentPath = null;
    pdfDoc = null;
    return;
  }

  document.querySelectorAll('.file-item').forEach(el => el.classList.remove('preview-active'));
  if (itemEl) itemEl.classList.add('preview-active');

  pdfScale = null;
  viewer.classList.remove('hidden');
  status.classList.remove('hidden');
  status.textContent = 'Đang tải PDF...';
  canvas.classList.add('hidden');
  document.getElementById('pdf-toolbar').classList.add('hidden');

  viewer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  try {
    if (typeof pdfjsLib === 'undefined') throw new Error('PDF.js chưa sẵn sàng.');
    currentPath = path;
    pdfDoc = await pdfjsLib.getDocument(encodePath(path)).promise;
    document.getElementById('pdf-total').textContent = pdfDoc.numPages;
    pdfPage = 1;

    status.classList.add('hidden');
    canvas.classList.remove('hidden');
    document.getElementById('pdf-toolbar').classList.remove('hidden');
    await renderPdfPage(1);
  } catch (err) {
    status.innerHTML = `<span style="color:var(--warning)">Không thể tải PDF: ${err.message}</span>`;
  }
}

// ── Render course page ──
function renderPage(course) {
  const color = YEAR_COLORS[course.year];
  document.title = `${course.name} — MAC Docs`;
  document.documentElement.style.setProperty('--course-accent', color);

  // Header
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

  // Files tab
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
      const isPdf = f.type === 'pdf';
      return `<div class="file-item" data-path="${f.path}" data-pdf="${isPdf}">
          <div class="file-type-icon ${info.cls}">${info.icon}</div>
          <div class="file-info">
            <span class="file-name" title="${f.name}">${f.name}</span>
            <span class="file-ext">${info.label}</span>
          </div>
          <div class="file-actions">
            ${isPdf ? `<button class="btn-preview" onclick="handlePreviewClick(this)">Xem</button>` : ''}
            <a class="btn-download" href="${encodePath(f.path)}" download title="Tải về">↓ Tải</a>
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

  // PDF viewer container (appended after all groups)
  const viewerHtml = `
    <div id="pdf-viewer" class="pdf-viewer hidden">
      <div id="pdf-toolbar" class="pdf-toolbar hidden">
        <button id="pdf-btn-prev" onclick="navigatePdf(-1)" disabled>← Trước</button>
        <span class="pdf-page-info">Trang <strong id="pdf-page-num">1</strong> / <strong id="pdf-total">1</strong></span>
        <button id="pdf-btn-next" onclick="navigatePdf(1)">Tiếp →</button>
        <span style="flex:1"></span>
        <div class="pdf-zoom-controls">
          <button onclick="zoomPdf(-0.25)" title="Thu nhỏ" class="pdf-zoom-btn">−</button>
          <span id="pdf-zoom-label" class="pdf-zoom-label">Vừa khít</span>
          <button onclick="zoomPdf(0.25)" title="Phóng to" class="pdf-zoom-btn">+</button>
          <button onclick="resetZoom()" title="Khớp chiều rộng" class="pdf-zoom-reset">Khít</button>
        </div>
        <button onclick="closePdfViewer()" style="color:var(--text-muted)">✕ Đóng</button>
      </div>
      <div class="pdf-canvas-area">
        <p id="pdf-status" class="pdf-status">Đang tải PDF...</p>
        <canvas id="pdf-canvas" class="hidden"></canvas>
      </div>
    </div>`;
  container.insertAdjacentHTML('beforeend', viewerHtml);
}

function handlePreviewClick(btn) {
  const item = btn.closest('.file-item');
  const path = item.dataset.path;
  openPdf(path, item);
}

function navigatePdf(delta) {
  if (!pdfDoc) return;
  const next = pdfPage + delta;
  if (next >= 1 && next <= pdfDoc.numPages) renderPdfPage(next);
}

function closePdfViewer() {
  const viewer = document.getElementById('pdf-viewer');
  if (viewer) viewer.classList.add('hidden');
  document.querySelectorAll('.file-item').forEach(el => el.classList.remove('preview-active'));
  currentPath = null;
  pdfDoc = null;
  pdfScale = null;
}

function zoomPdf(delta) {
  if (!pdfDoc) return;
  if (pdfScale === null) pdfScale = lastRenderScale;
  pdfScale = Math.max(0.5, Math.min(3.0, pdfScale + delta));
  renderPdfPage(pdfPage);
}

function resetZoom() {
  if (!pdfDoc) return;
  pdfScale = null;
  renderPdfPage(pdfPage);
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

    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
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

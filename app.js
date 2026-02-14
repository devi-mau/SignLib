/* ═══════════════════════════════════════════════
   SignLib — Sign Language Video Library
   app.js
═══════════════════════════════════════════════ */

// ── STATE ──────────────────────────────────────────────────────────────────
let videos        = [];
let favorites     = new Set();
let folderFiles   = {};        // filename → File (linked folder)
let folderPending = [];        // File[] staged before link
let bulkPending   = [];        // File[] staged before bulk import
let singleFile    = null;
let currentCat    = 'all';
let currentSearch = '';
let sortMode      = 'newest';
let viewMode      = 'grid';
let playingId     = null;
let activeTab     = 'single';

const SK = 'signlib_v4';
const FK = 'signlib_favs_v1';

// ── AUTO-CATEGORY ──────────────────────────────────────────────────────────
const CAT_KW = {
  'Greetings':    ['hello','hi','bye','goodbye','thank','please','sorry','welcome','good morning','good night','nice to meet'],
  'Numbers':      ['one','two','three','four','five','six','seven','eight','nine','ten','zero','number','count','digit'],
  'Alphabet':     ['letter','alpha','fingerspell','abc',...'abcdefghijklmnopqrstuvwxyz'.split('')],
  'Emotions':     ['happy','sad','angry','fear','surprise','love','hate','emotion','feel','scared','excited','bored','proud'],
  'Family':       ['mother','father','mom','dad','sister','brother','son','daughter','baby','family','grandma','grandpa','uncle','aunt','cousin','husband','wife'],
  'Food & Drink': ['eat','food','drink','water','juice','milk','coffee','tea','bread','rice','meat','fruit','vegetable','pizza','hungry','thirsty'],
  'Colors':       ['red','blue','green','yellow','orange','purple','pink','black','white','brown','color','grey','gray'],
  'Questions':    ['what','who','where','when','why','how','question','ask'],
  'Actions':      ['run','walk','jump','sit','stand','go','come','stop','play','work','sleep','write','read','help','want','need'],
};

function guessCategory(name) {
  const n = name.toLowerCase();
  for (const [cat, kws] of Object.entries(CAT_KW)) {
    if (kws.some(kw => n.includes(kw))) return cat;
  }
  return 'Other';
}

function cleanTitle(filename) {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

// ── INIT ───────────────────────────────────────────────────────────────────
function init() {
  try { const s = localStorage.getItem(SK); if (s) videos = JSON.parse(s); } catch(e) { videos = []; }
  try { const f = localStorage.getItem(FK); if (f) favorites = new Set(JSON.parse(f)); } catch(e) {}
  if (!videos.length) seedDemo();
  renderSidebar();
  renderGrid();
}

function seedDemo() {
  videos = [
    { id:'d1', title:'Hello',    category:'Greetings',    tags:['basic','beginner'],  filePath:null, source:'demo', createdAt:Date.now()-86400000 },
    { id:'d2', title:'Thank You',category:'Greetings',    tags:['basic','polite'],    filePath:null, source:'demo', createdAt:Date.now()-80000000 },
    { id:'d3', title:'One',      category:'Numbers',      tags:['number','counting'], filePath:null, source:'demo', createdAt:Date.now()-70000000 },
    { id:'d4', title:'Happy',    category:'Emotions',     tags:['feeling'],           filePath:null, source:'demo', createdAt:Date.now()-60000000 },
    { id:'d5', title:'A',        category:'Alphabet',     tags:['fingerspelling'],    filePath:null, source:'demo', createdAt:Date.now()-50000000 },
    { id:'d6', title:'Water',    category:'Food & Drink', tags:['basic'],             filePath:null, source:'demo', createdAt:Date.now()-40000000 },
  ];
  save();
}

function save() {
  try {
    localStorage.setItem(SK, JSON.stringify(videos));
    localStorage.setItem(FK, JSON.stringify([...favorites]));
  } catch(e) {
    toast('Storage almost full — large video files may not save', 'warn');
  }
}

// ── FOLDER MODAL ───────────────────────────────────────────────────────────
function openFolderModal() {
  document.getElementById('folder-modal').classList.add('open');
}

function closeFolderModal() {
  document.getElementById('folder-modal').classList.remove('open');
  folderPending = [];
  document.getElementById('folder-preview-wrap').style.display = 'none';
  document.getElementById('folder-preview').innerHTML = '';
  document.getElementById('folder-link-btn').disabled = true;
  document.getElementById('folder-chosen').textContent = '';
}

function onFolderSelect(e) {
  folderPending = [...e.target.files].filter(f => f.type.startsWith('video/'));
  if (!folderPending.length) { toast('No video files found in that folder', 'warn'); return; }

  const fname = folderPending[0].webkitRelativePath.split('/')[0] || 'Folder';
  document.getElementById('folder-chosen').textContent = `📁 ${fname} — ${folderPending.length} video${folderPending.length !== 1 ? 's' : ''}`;
  document.getElementById('folder-link-btn').disabled = false;

  const preview = document.getElementById('folder-preview');
  const label   = document.getElementById('folder-preview-label');
  label.textContent = `${folderPending.length} video file${folderPending.length !== 1 ? 's' : ''} detected`;

  const show = folderPending.slice(0, 8);
  preview.innerHTML = show.map(f => {
    const t = cleanTitle(f.name), c = guessCategory(f.name);
    return `<div class="preview-item"><span>🎬</span><span class="pi-name">${esc(t)}</span><span class="pi-cat">${esc(c)}</span></div>`;
  }).join('') + (folderPending.length > 8 ? `<div class="preview-more">… and ${folderPending.length - 8} more</div>` : '');

  document.getElementById('folder-preview-wrap').style.display = 'block';
}

function linkFolder() {
  if (!folderPending.length) return;
  const defCat  = document.getElementById('f-cat').value;
  const defTags = document.getElementById('f-tags').value.split(',').map(t => t.trim()).filter(Boolean);
  const fname   = folderPending[0].webkitRelativePath.split('/')[0] || 'Folder';

  folderFiles = {};
  folderPending.forEach(f => { folderFiles[f.name] = f; });

  videos = videos.filter(v => v.source !== 'folder');
  folderPending.forEach((f, i) => {
    const title = cleanTitle(f.name);
    const cat   = defCat || guessCategory(f.name);
    const id    = 'fl_' + Date.now() + '_' + i;
    videos.push({ id, title, category: cat, tags: [...defTags], filePath: null, fileName: f.name, source: 'folder', createdAt: Date.now() - i });
  });

  save(); renderSidebar(); renderGrid();
  closeFolderModal();

  document.getElementById('folder-banner-name').textContent = `${fname} · ${folderPending.length} videos`;
  document.getElementById('folder-banner').classList.add('visible');
  toast(`Linked ${folderPending.length} videos from "${fname}" ✓`, 'success');
}

// ── ADD MODAL ──────────────────────────────────────────────────────────────
function openAddModal() {
  document.getElementById('add-modal').classList.add('open');
  switchTab(activeTab);
}

function closeAddModal() {
  document.getElementById('add-modal').classList.remove('open');
  ['s-title', 's-tags'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('s-cat').value = '';
  document.getElementById('single-file').value = '';
  document.getElementById('single-name').textContent = '';
  singleFile = null;
  clearBulk();
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.modal-tab').forEach((b, i) =>
    b.classList.toggle('active', (i === 0 && tab === 'single') || (i === 1 && tab === 'bulk'))
  );
  document.getElementById('tab-single').classList.toggle('active', tab === 'single');
  document.getElementById('tab-bulk').classList.toggle('active', tab === 'bulk');
}

// ── SINGLE UPLOAD ──────────────────────────────────────────────────────────
function onSingleFile(e) {
  const f = e.target.files[0];
  if (!f) return;
  singleFile = f;
  document.getElementById('single-name').textContent = '📎 ' + f.name;
  if (!document.getElementById('s-title').value) document.getElementById('s-title').value = cleanTitle(f.name);
  if (!document.getElementById('s-cat').value)   document.getElementById('s-cat').value   = guessCategory(f.name);
}

function saveSingle() {
  const title = document.getElementById('s-title').value.trim();
  const cat   = document.getElementById('s-cat').value;
  const tags  = document.getElementById('s-tags').value.split(',').map(t => t.trim()).filter(Boolean);
  if (!title) { toast('Please enter a title', 'info'); return; }

  const id = 'v_' + Date.now();
  if (singleFile) {
    const r = new FileReader();
    r.onload = e2 => {
      videos.unshift({ id, title, category: cat, tags, filePath: e2.target.result, source: 'upload', createdAt: Date.now() });
      save(); renderSidebar(); renderGrid(); closeAddModal();
      toast(`"${title}" added!`, 'success');
    };
    r.readAsDataURL(singleFile);
  } else {
    videos.unshift({ id, title, category: cat, tags, filePath: null, source: 'manual', createdAt: Date.now() });
    save(); renderSidebar(); renderGrid(); closeAddModal();
    toast(`"${title}" saved (no file attached)`, 'info');
  }
}

// ── BULK UPLOAD ────────────────────────────────────────────────────────────
function onBulkFiles(e) {
  bulkPending = [...e.target.files].filter(f => f.type.startsWith('video/'));
  if (!bulkPending.length) return;
  renderBulkPreview();
}

function renderBulkPreview() {
  const defCat = document.getElementById('b-cat').value;
  document.getElementById('bulk-name').textContent = `${bulkPending.length} file${bulkPending.length !== 1 ? 's' : ''} selected`;
  document.getElementById('bulk-preview-label').textContent = `Preview (${bulkPending.length} files)`;
  document.getElementById('bulk-preview').innerHTML = bulkPending.map((f, i) => {
    const t = cleanTitle(f.name), c = defCat || guessCategory(f.name);
    return `<div class="preview-item" id="bp${i}">
      <span>🎬</span>
      <span class="pi-name">${esc(t)}</span>
      <span class="pi-cat">${esc(c)}</span>
      <button class="pi-remove" onclick="removeBulk(${i})" title="Remove">✕</button>
    </div>`;
  }).join('');
  document.getElementById('bulk-preview-wrap').style.display = 'block';
  document.getElementById('bulk-save-btn').disabled = bulkPending.length === 0;
}

function removeBulk(i) {
  bulkPending.splice(i, 1);
  if (!bulkPending.length) clearBulk(); else renderBulkPreview();
}

function clearBulk() {
  bulkPending = [];
  document.getElementById('bulk-files').value = '';
  document.getElementById('bulk-name').textContent = '';
  document.getElementById('bulk-preview-wrap').style.display = 'none';
  document.getElementById('bulk-preview').innerHTML = '';
  document.getElementById('bulk-save-btn').disabled = true;
  document.getElementById('bulk-progress').style.display = 'none';
}

async function saveBulk() {
  if (!bulkPending.length) return;
  const defCat  = document.getElementById('b-cat').value;
  const defTags = document.getElementById('b-tags').value.split(',').map(t => t.trim()).filter(Boolean);

  document.getElementById('bulk-save-btn').disabled = true;
  document.getElementById('bulk-preview-wrap').style.display = 'none';
  document.getElementById('bulk-progress').style.display = 'block';

  const total   = bulkPending.length;
  const newVids = [];

  for (let i = 0; i < total; i++) {
    const f = bulkPending[i];
    document.getElementById('prog-bar').style.width = Math.round((i / total) * 100) + '%';
    document.getElementById('prog-text').textContent = `Importing ${i + 1} of ${total}…`;
    const dataUrl = await toDataURL(f);
    const id = 'b_' + Date.now() + '_' + i;
    newVids.push({ id, title: cleanTitle(f.name), category: defCat || guessCategory(f.name), tags: [...defTags], filePath: dataUrl, source: 'upload', createdAt: Date.now() - i });
    await tick();
  }

  document.getElementById('prog-bar').style.width = '100%';
  document.getElementById('prog-text').textContent = 'Done! Saving…';

  videos = [...newVids, ...videos];
  save(); renderSidebar(); renderGrid();
  closeAddModal();
  toast(`${total} video${total !== 1 ? 's' : ''} imported ✓`, 'success');
}

function toDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function tick() { return new Promise(r => setTimeout(r, 0)); }

// ── FILTER / SORT ──────────────────────────────────────────────────────────
function getList() {
  let list = [...videos];

  if (currentCat === 'favorites')      list = list.filter(v => favorites.has(v.id));
  else if (currentCat !== 'all')       list = list.filter(v => v.category === currentCat);

  if (currentSearch.trim()) {
    const q = currentSearch.toLowerCase();
    list = list.filter(v =>
      v.title.toLowerCase().includes(q) ||
      (v.category || '').toLowerCase().includes(q) ||
      (v.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  switch (sortMode) {
    case 'oldest': list.sort((a, b) => a.createdAt - b.createdAt); break;
    case 'az':     list.sort((a, b) => a.title.localeCompare(b.title)); break;
    case 'za':     list.sort((a, b) => b.title.localeCompare(a.title)); break;
    default:       list.sort((a, b) => b.createdAt - a.createdAt);
  }
  return list;
}

function filterCategory(cat) {
  currentCat = cat;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  (document.getElementById('nav-' + cat) || document.querySelector(`[data-cat="${cat}"]`))?.classList.add('active');
  renderGrid();
}

function handleSearch() { currentSearch = document.getElementById('search-input').value; renderGrid(); }
function handleSort(v)  { sortMode = v; renderGrid(); }

function setView(m) {
  viewMode = m;
  document.getElementById('grid-btn').classList.toggle('active', m === 'grid');
  document.getElementById('list-btn').classList.toggle('active', m === 'list');
  renderGrid();
}

// ── RENDER ─────────────────────────────────────────────────────────────────
function renderSidebar() {
  const cats = [...new Set(videos.map(v => v.category).filter(Boolean))].sort();
  document.getElementById('count-all').textContent      = videos.length;
  document.getElementById('count-favorites').textContent = favorites.size;
  document.getElementById('cat-nav').innerHTML = cats.map(cat => {
    const cnt = videos.filter(v => v.category === cat).length;
    const act = currentCat === cat ? 'active' : '';
    return `<div class="nav-item ${act}" onclick="filterCategory('${esc(cat)}')" data-cat="${esc(cat)}">
      <span class="nav-icon">📂</span> ${esc(cat)}
      <span class="count">${cnt}</span>
    </div>`;
  }).join('');
}

function renderGrid() {
  const list = getList();
  const grid = document.getElementById('video-grid');

  document.getElementById('page-title').textContent =
    currentCat === 'all' ? 'All Videos' :
    currentCat === 'favorites' ? '♥ Favorites' : currentCat;

  document.getElementById('result-count').textContent = currentSearch
    ? `${list.length} result${list.length !== 1 ? 's' : ''} for "${currentSearch}"`
    : `${list.length} video${list.length !== 1 ? 's' : ''}`;

  if (!list.length) {
    const isFav = currentCat === 'favorites';
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="emoji">${isFav ? '♡' : currentSearch ? '🔍' : '🎬'}</div>
      <h3>${currentSearch ? 'No results found' : isFav ? 'No favorites yet' : 'No videos here'}</h3>
      <p>${currentSearch ? 'Try a different keyword, tag, or category.' : 'Add your videos using the sidebar buttons.'}</p>
      ${!currentSearch ? `<div class="empty-actions">
        <button class="btn btn-primary" onclick="openAddModal()">＋ Add Video(s)</button>
        <button class="btn btn-warn" onclick="openFolderModal()">📁 Link Folder</button>
      </div>` : ''}
    </div>`;
    return;
  }

  if (viewMode === 'list') grid.classList.add('list-view');
  else grid.classList.remove('list-view');

  grid.innerHTML = list.map(cardHTML).join('');

  if (viewMode === 'list') {
    grid.querySelectorAll('.card-delete-list').forEach(btn => btn.style.display = 'flex');
  }
}

function getSrc(v) {
  if (v.source === 'folder' && v.fileName && folderFiles[v.fileName]) {
    return URL.createObjectURL(folderFiles[v.fileName]);
  }
  return v.filePath || null;
}

function cardHTML(v) {
  const isFav = favorites.has(v.id);
  const tags  = (v.tags || []).join(', ');
  const src   = getSrc(v);
  const badge =
    v.source === 'folder' ? `<span class="source-badge folder-src">📁 folder</span>` :
    v.source === 'upload' ? `<span class="source-badge">⬆ uploaded</span>` :
    v.source === 'demo'   ? `<span class="source-badge">demo</span>` : '';
  const thumb = src
    ? `<video src="${esc(src)}" preload="metadata" muted></video>`
    : `<div class="no-preview"><div class="play-icon">▶</div><small>${v.source === 'folder' ? 'Re-link folder' : 'No file'}</small></div>`;

  return `<div class="video-card" onclick="openPlayer('${v.id}')">
    <div class="card-thumb">
      ${thumb}${badge}
      <div class="play-overlay"><div class="play-btn">▶</div></div>
      <button class="card-fav ${isFav ? 'active' : ''}" onclick="toggleFav(event,'${v.id}')">${isFav ? '♥' : '♡'}</button>
      <button class="card-delete" onclick="confirmDeleteCard(event,'${v.id}')" title="Remove">🗑</button>
    </div>
    <div class="card-body">
      <div class="card-body-text">
        <div class="card-title">${esc(v.title)}</div>
        <div class="card-meta">
          <span class="card-category">${esc(v.category || 'Uncategorized')}</span>
          ${tags ? `<span class="card-tags">${esc(tags)}</span>` : ''}
        </div>
      </div>
      <button class="card-delete-list"
        style="display:none;width:30px;height:30px;background:transparent;border:none;border-radius:8px;color:var(--text-muted);cursor:pointer;font-size:0.85rem;align-items:center;justify-content:center;transition:all 0.15s;flex-shrink:0"
        onmouseover="this.style.background='rgba(255,107,138,0.15)';this.style.color='var(--danger)'"
        onmouseout="this.style.background='transparent';this.style.color='var(--text-muted)'"
        onclick="confirmDeleteCard(event,'${v.id}')" title="Remove">🗑</button>
    </div>
  </div>`;
}

// ── FAVORITES ──────────────────────────────────────────────────────────────
function toggleFav(e, id) {
  e.stopPropagation();
  if (favorites.has(id)) { favorites.delete(id); toast('Removed from favorites', 'info'); }
  else                   { favorites.add(id);    toast('Added to favorites ♥', 'success'); }
  save(); renderSidebar(); renderGrid();
}

function toggleFavPlayer() {
  if (!playingId) return;
  toggleFav({ stopPropagation: () => {} }, playingId);
  updateFavBtn();
}

function updateFavBtn() {
  const on = favorites.has(playingId);
  document.getElementById('player-fav-btn').classList.toggle('active', on);
  document.getElementById('pfav-icon').textContent = on ? '♥' : '♡';
  document.getElementById('pfav-text').textContent = on ? 'In Favorites' : 'Add to Favorites';
}

// ── PLAYER ─────────────────────────────────────────────────────────────────
function openPlayer(id) {
  const v = videos.find(v => v.id === id);
  if (!v) return;
  playingId = id;

  document.getElementById('player-title').textContent = v.title;
  document.getElementById('player-cat').textContent   = v.category || '';
  document.getElementById('player-tags').innerHTML    = (v.tags || []).map(t => `<span class="tag-pill">${esc(t)}</span>`).join('');

  const vid = document.getElementById('player-video');
  const src = getSrc(v);
  if (src) { vid.src = src; vid.play().catch(() => {}); }
  else {
    vid.removeAttribute('src');
    if (v.source === 'folder') toast('Re-link your folder to watch this video', 'warn');
  }

  updateFavBtn();
  document.getElementById('player-modal').classList.add('open');
}

function closePlayer() {
  const vid = document.getElementById('player-video');
  vid.pause(); vid.src = '';
  document.getElementById('player-modal').classList.remove('open');
  playingId = null;
}

// ── CONFIRM DIALOG ────────────────────────────────────────────────────────
let confirmCallback = null;

function openConfirm({ icon = '🗑', title = 'Are you sure?', msg = 'This cannot be undone.', okLabel = 'Remove', onOk }) {
  document.getElementById('confirm-icon').textContent    = icon;
  document.getElementById('confirm-title').textContent   = title;
  document.getElementById('confirm-msg').textContent     = msg;
  document.getElementById('confirm-ok-btn').textContent  = okLabel;
  confirmCallback = onOk;
  document.getElementById('confirm-backdrop').classList.add('open');
}

function closeConfirm() {
  document.getElementById('confirm-backdrop').classList.remove('open');
  confirmCallback = null;
}

function confirmOk() {
  if (confirmCallback) confirmCallback();
  closeConfirm();
}

// ── DELETE (from card) ────────────────────────────────────────────────────
function confirmDeleteCard(e, id) {
  e.stopPropagation();
  const v = videos.find(v => v.id === id);
  if (!v) return;
  openConfirm({
    icon: '🗑',
    title: `Remove "${v.title}"?`,
    msg: 'This removes the video from SignLib. Your original file on disk is not affected.',
    okLabel: 'Remove',
    onOk: () => deleteVideo(id),
  });
}

// ── DELETE (from player) ──────────────────────────────────────────────────
function confirmDeletePlaying() {
  if (!playingId) return;
  const v = videos.find(v => v.id === playingId);
  if (!v) return;
  openConfirm({
    icon: '🗑',
    title: `Remove "${v.title}"?`,
    msg: 'This removes the video from SignLib. Your original file on disk is not affected.',
    okLabel: 'Remove',
    onOk: () => { closePlayer(); deleteVideo(v.id); },
  });
}

// ── CLEAR ALL ─────────────────────────────────────────────────────────────
function confirmClearAll() {
  openConfirm({
    icon: '⚠️',
    title: 'Clear all videos?',
    msg: `This will permanently remove all ${videos.length} videos from SignLib. Your original files on disk are not affected.`,
    okLabel: 'Clear All',
    onOk: () => {
      videos = [];
      favorites.clear();
      folderFiles = {};
      document.getElementById('folder-banner').classList.remove('visible');
      save(); renderSidebar(); renderGrid();
      toast('All videos removed', 'info');
    },
  });
}

// ── DELETE VIDEO ──────────────────────────────────────────────────────────
function deleteVideo(id) {
  const v = videos.find(v => v.id === id);
  const title = v ? v.title : 'Video';
  videos = videos.filter(v => v.id !== id);
  favorites.delete(id);
  if (v?.source === 'folder' && v.fileName) delete folderFiles[v.fileName];
  save(); renderSidebar(); renderGrid();
  toast(`"${title}" removed`, 'info');
}

// ── TOAST ──────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className  = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ── UTIL ───────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── EVENT LISTENERS ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Close modals on backdrop click
  ['add-modal', 'player-modal', 'folder-modal'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
      if (e.target !== e.currentTarget) return;
      if (id === 'player-modal') closePlayer();
      else if (id === 'folder-modal') closeFolderModal();
      else closeAddModal();
    });
  });
  document.getElementById('confirm-backdrop').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeConfirm();
  });

  // ESC key closes any open modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closePlayer(); closeAddModal(); closeFolderModal(); closeConfirm(); }
  });

  // Drag-and-drop highlight helpers
  function makeDraggable(dropId, handler) {
    const el = document.getElementById(dropId);
    el.addEventListener('dragover',  e => { e.preventDefault(); el.classList.add('over'); });
    el.addEventListener('dragleave', ()  => el.classList.remove('over'));
    el.addEventListener('drop', e => {
      e.preventDefault(); el.classList.remove('over');
      if (handler) handler(e);
    });
  }

  makeDraggable('drop-single', e => {
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('video/')) {
      singleFile = f;
      document.getElementById('single-name').textContent = '📎 ' + f.name;
      if (!document.getElementById('s-title').value) document.getElementById('s-title').value = cleanTitle(f.name);
      if (!document.getElementById('s-cat').value)   document.getElementById('s-cat').value   = guessCategory(f.name);
    }
  });

  makeDraggable('drop-bulk', e => {
    bulkPending = [...e.dataTransfer.files].filter(f => f.type.startsWith('video/'));
    if (bulkPending.length) renderBulkPreview();
  });

  makeDraggable('drop-folder', null);

  // Boot
  init();
});

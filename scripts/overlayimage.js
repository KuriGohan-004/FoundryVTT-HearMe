/* Image Overlay Toggle – v1.5.4 */

const POS_KEY   = 'controlPos';    // per‑client panel position
const STATE_KEY = 'overlayState';  // world‑level overlay { path, visible }

Hooks.once('init', () => {
  injectStyles();

  // Per‑client saved position (harmless for players)
  game.settings.register('image-overlay-toggle', POS_KEY, {
    scope: 'client', config: false, type: Object,
    default: { x: 12, y: window.innerHeight - 60 }
  });

  // World‑scope shared overlay state
  game.settings.register('image-overlay-toggle', STATE_KEY, {
    scope: 'world', config: false, type: Object,
    default: { path: null, visible: false }
  });
});

Hooks.once('ready', () => {
  // Apply current state immediately
  const state = game.settings.get('image-overlay-toggle', STATE_KEY);
  applyOverlay(state.path, state.visible);

  // Listen for future changes (Foundry V11 signature)
  Hooks.on('updateSetting', setting => {
    if (setting.namespace === 'image-overlay-toggle' && setting.key === STATE_KEY) {
      applyOverlay(setting.value.path, setting.value.visible);
      if (game.user.isGM) refreshGMUI(setting.value);
    }
  });

  // GM gets control panel
  if (game.user.isGM) createOverlayUI();
});

/* ------------------------------------------------------------- */
//   GM CONTROL PANEL
/* ------------------------------------------------------------- */
let uiBox, thumbImg, toggleBtn;

function createOverlayUI() {
  if (document.getElementById('image-overlay-controls')) return; // avoid duplicates

  uiBox = document.createElement('div');
  uiBox.id = 'image-overlay-controls';

  const pos = game.settings.get('image-overlay-toggle', POS_KEY);
  Object.assign(uiBox.style, {
    position: 'fixed', left: `${pos.x}px`, top: `${pos.y}px`,
    display: 'flex', gap: '4px', zIndex: 80,
    background: 'rgba(0,0,0,0.6)', padding: '4px',
    border: '1px solid #555', borderRadius: '6px'
  });

  // Thumbnail preview
  thumbImg = Object.assign(document.createElement('img'), {
    id: 'io-thumb', width: 32, height: 32
  });
  Object.assign(thumbImg.style, { objectFit: 'cover', border: '1px solid #333' });

  // Pick button
  const pickBtn = makeBtn('Pick', 'Choose an image');
  pickBtn.addEventListener('click', () => {
    new FilePicker({ type: 'image', callback: path => updateState({ path }) }).browse();
  });

  // Toggle button
  toggleBtn = makeBtn('Show', 'Show/Hide overlay');
  toggleBtn.addEventListener('click', () => {
    const st = game.settings.get('image-overlay-toggle', STATE_KEY);
    if (!st.path) return ui.notifications.warn('No image selected.');
    updateState({ visible: !st.visible });
  });

  const state = game.settings.get('image-overlay-toggle', STATE_KEY);
  refreshGMUI(state);

  uiBox.append(thumbImg, pickBtn, toggleBtn);
  document.body.appendChild(uiBox);
  makeDraggable(uiBox);
}

function refreshGMUI(st) {
  if (!toggleBtn || !thumbImg) return;
  toggleBtn.textContent = st.visible ? 'Hide' : 'Show';
  thumbImg.src = st.path ?? '';
}

function makeBtn(label, title) {
  const b = document.createElement('button');
  b.className = 'io-btn'; b.textContent = label; b.title = title; return b;
}

function makeDraggable(el) {
  let drag = false, offX = 0, offY = 0;
  el.addEventListener('mousedown', e => { drag = true; offX = e.clientX - el.offsetLeft; offY = e.clientY - el.offsetTop; e.preventDefault(); });
  window.addEventListener('mousemove', e => {
    if (!drag) return;
    const x = Math.min(window.innerWidth  - el.offsetWidth,  Math.max(0, e.clientX - offX));
    const y = Math.min(window.innerHeight - el.offsetHeight, Math.max(0, e.clientY - offY));
    el.style.left = `${x}px`; el.style.top = `${y}px`;
  });
  window.addEventListener('mouseup', () => {
    if (!drag) return; drag = false;
    game.settings.set('image-overlay-toggle', POS_KEY, { x: el.offsetLeft, y: el.offsetTop });
  });
}

/* ------------------------------------------------------------- */
//   STATE MANAGEMENT
/* ------------------------------------------------------------- */
function updateState(partial) {
  const cur = game.settings.get('image-overlay-toggle', STATE_KEY);
  game.settings.set('image-overlay-toggle', STATE_KEY, { ...cur, ...partial });
}

/* ------------------------------------------------------------- */
//   OVERLAY RENDERING
/* ------------------------------------------------------------- */
let overlayImg, hoverHandler, escHandler;

function applyOverlay(path, visible) {
  if (!visible || !path) {
    if (overlayImg) {
      overlayImg.remove(); overlayImg = null; removeHover(); removeEsc();
    }
    return;
  }

  if (!overlayImg) {
    overlayImg = document.createElement('img');
    overlayImg.id = 'image-overlay-display';
    Object.assign(overlayImg.style, {
      position: 'fixed', left: '40%', top: '50%', transform: 'translate(-50%, -50%)',
      zIndex: 20, opacity: 1, maxWidth: '90%', userSelect: 'none', pointerEvents: 'none',
      boxShadow: '0 0 0 9999px rgba(0,0,0,1)', transition: 'opacity 150ms ease'
    });
    document.body.appendChild(overlayImg);
    addHover(); addEsc();
  }

  overlayImg.src = path;
  overlayImg.style.maxHeight = `${window.innerHeight * 0.9}px`;
}

/* ------------------------------------------------------------- */
function injectStyles() {
  if (document.getElementById('io-shared-style')) return;
  const s = document.createElement('style'); s.id = 'io-shared-style';
  s.textContent = `#image-overlay-controls .io-btn{padding:4px 6px;border:1px solid #666;border-radius:4px;background:rgba(30,30,30,.9);color:#fff;font-size:12px;cursor:pointer}`;
  document.head.appendChild(s);
}

/* ------------------------------------------------------------- */
//   Hover fade & ESC‑key hide
/* ------------------------------------------------------------- */
function addHover() {
  if (hoverHandler) return;
  let moveStart = 0, lx = 0, ly = 0;
  hoverHandler = e => {
    if (!overlayImg) return;
    const r = overlayImg.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) { overlayImg.style.opacity = 1; moveStart = 0; return; }
    const moved = (e.clientX !== lx) || (e.clientY !== ly);
    if (moved) { lx = e.clientX; ly = e.clientY; moveStart = moveStart || performance.now(); }
    overlayImg.style.opacity = (performance.now() - moveStart > 500) ? 0.35 : 1;
  };
  window.addEventListener('pointermove', hoverHandler);
}
function removeHover() { if (!hoverHandler) return; window.removeEventListener('pointermove', hoverHandler); hoverHandler = null; }

function addEsc() {
  if (escHandler) return;
  escHandler = e => { if (e.key === 'Escape') updateState({ visible: false }); };
  window.addEventListener('keydown', escHandler);
}
function removeEsc() { if (!escHandler) return; window.removeEventListener('keydown', escHandler); escHandler = null; }

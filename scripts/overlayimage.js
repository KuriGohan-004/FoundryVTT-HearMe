/* Image Overlay Toggle – v1.5.3 */

const POS_KEY   = 'controlPos';    // per‑client position
const STATE_KEY = 'overlayState';  // world‑level overlay data { path, visible }

Hooks.once('init', () => {
  injectStyles();
  game.settings.register('image-overlay-toggle', POS_KEY, {
    scope: 'client', config: false, type: Object,
    default: { x: 12, y: window.innerHeight - 60 }
  });
  game.settings.register('image-overlay-toggle', STATE_KEY, {
    scope: 'world', config: false, type: Object,
    default: { path: null, visible: false }
  });
});

Hooks.once('ready', () => {
  const cur = game.settings.get('image-overlay-toggle', STATE_KEY);
  applyOverlay(cur.path, cur.visible);
  Hooks.on('updateSetting', (namespace, key, value) => {
    if (namespace === 'image-overlay-toggle' && key === STATE_KEY) {
      applyOverlay(value.path, value.visible);
      if (game.user.isGM) refreshGMUI(value);
    }
  });
  if (game.user.isGM) createOverlayUI();
});

let uiBox, thumbImg, toggleBtn;

function createOverlayUI() {
  if (document.getElementById('image-overlay-controls')) return;
  uiBox = document.createElement('div');
  uiBox.id = 'image-overlay-controls';
  const pos = game.settings.get('image-overlay-toggle', POS_KEY);
  Object.assign(uiBox.style, {
    position: 'fixed', left: `${pos.x}px`, top: `${pos.y}px`,
    display: 'flex', gap: '4px', zIndex: 80,
    background: 'rgba(0,0,0,0.6)', padding: '4px',
    border: '1px solid #555', borderRadius: '6px'
  });
  thumbImg = Object.assign(document.createElement('img'), {
    id: 'io-thumb', width: 32, height: 32,
  });
  Object.assign(thumbImg.style, { objectFit: 'cover', border: '1px solid #333' });

  const pickBtn = basicButton('Pick', 'Choose an image');
  pickBtn.addEventListener('click', () => {
    new FilePicker({ type: 'image', callback: path => updateState({ path }) }).browse();
  });

  toggleBtn = basicButton('Show', 'Show/Hide overlay');
  toggleBtn.addEventListener('click', () => {
    const state = game.settings.get('image-overlay-toggle', STATE_KEY);
    if (!state.path) return ui.notifications.warn('No image selected.');
    updateState({ visible: !state.visible });
  });

  refreshGMUI(game.settings.get('image-overlay-toggle', STATE_KEY));
  uiBox.append(thumbImg, pickBtn, toggleBtn);
  document.body.appendChild(uiBox);
  makeDraggable(uiBox);
}

function refreshGMUI(state) {
  if (!toggleBtn || !thumbImg) return;
  toggleBtn.textContent = state.visible ? 'Hide' : 'Show';
  thumbImg.src = state.path ?? '';
}

function basicButton(text, title) {
  const b = document.createElement('button');
  b.className = 'io-btn'; b.textContent = text; b.title = title; return b;
}

function makeDraggable(panel) {
  let dragging = false, offX = 0, offY = 0;
  panel.addEventListener('mousedown', ev => {
    dragging = true; offX = ev.clientX - panel.offsetLeft; offY = ev.clientY - panel.offsetTop; ev.preventDefault();
  });
  window.addEventListener('mousemove', ev => {
    if (!dragging) return;
    const x = Math.min(window.innerWidth  - panel.offsetWidth,  Math.max(0, ev.clientX - offX));
    const y = Math.min(window.innerHeight - panel.offsetHeight, Math.max(0, ev.clientY - offY));
    panel.style.left = `${x}px`; panel.style.top  = `${y}px`;
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return; dragging = false;
    game.settings.set('image-overlay-toggle', POS_KEY, { x: panel.offsetLeft, y: panel.offsetTop });
  });
}

function updateState(partial) {
  const current = game.settings.get('image-overlay-toggle', STATE_KEY);
  game.settings.set('image-overlay-toggle', STATE_KEY, { ...current, ...partial });
}

let overlayImg, hoverHandler;

function applyOverlay(path, visible) {
  if (!visible || !path) {
    if (overlayImg) { overlayImg.remove(); overlayImg = null; removeHoverHandler(); }
    return;
  }
  if (!overlayImg) {
    overlayImg = document.createElement('img');
    overlayImg.id = 'image-overlay-display';
    Object.assign(overlayImg.style, {
      position: 'fixed', left: '40%', top: '50%', transform: 'translate(-50%, -50%)',
      zIndex: 20, opacity: 1, maxWidth: '90%', maxHeight: `${window.innerHeight * 0.9}px`,
      userSelect: 'none', pointerEvents: 'none',
      boxShadow: '0 0 0 9999px rgba(0,0,0,1)',
      transition: 'opacity 150ms ease'
    });
    document.body.appendChild(overlayImg);
    addHoverHandler();
  }
  overlayImg.src = path;
}

function injectStyles() {
  if (document.getElementById('io-shared-style')) return;
  const style = document.createElement('style'); style.id = 'io-shared-style';
  style.textContent = `#image-overlay-controls .io-btn{padding:4px 6px;border:1px solid #666;border-radius:4px;background:rgba(30,30,30,.9);color:#fff;font-size:12px;cursor:pointer}`;
  document.head.appendChild(style);
}

function addHoverHandler() {
  if (hoverHandler) return;
  let moveStart = 0, lastX = 0, lastY = 0;
  hoverHandler = ev => {
    if (!overlayImg) return;
    const r = overlayImg.getBoundingClientRect();
    const inside = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
    if (!inside) { overlayImg.style.opacity = 1; moveStart = 0; return; }
    const moved = (ev.clientX !== lastX) || (ev.clientY !== lastY);
    if (moved) { lastX = ev.clientX; lastY = ev.clientY; moveStart = moveStart || performance.now(); }
    overlayImg.style.opacity = (performance.now() - moveStart > 500) ? 0.35 : 1;
  };
  window.addEventListener('pointermove', hoverHandler);
}
function removeHoverHandler() {
  if (!hoverHandler) return;
  window.removeEventListener('pointermove', hoverHandler);
  hoverHandler = null;
}

/* Image Overlay Toggle – v1.5.1 */

const POS_KEY   = 'controlPos';    // per‑client position
const STATE_KEY = 'overlayState';   // world‑level overlay data

Hooks.once('init', () => {
  injectStyles();

  // Per‑client setting to remember panel position
  game.settings.register('image-overlay-toggle', POS_KEY, {
    scope: 'client',
    config: false,
    type: Object,
    default: { x: 12, y: window.innerHeight - 60 }
  });

  // World‑scope setting that stores overlay { path, visible }
  game.settings.register('image-overlay-toggle', STATE_KEY, {
    scope: 'world',
    config: false,
    type: Object,
    default: { path: null, visible: false }
  });
});

Hooks.once('ready', () => {
  // Everyone watches for changes to the world‑level state
  Hooks.on('updateSetting', setting => {
    if (setting.namespace === 'image-overlay-toggle' && setting.key === STATE_KEY) {
      applyOverlay(setting.value.path, setting.value.visible);
    }
  });

  // Apply current state immediately on load
  const state = game.settings.get('image-overlay-toggle', STATE_KEY);
  applyOverlay(state.path, state.visible);

  // Only GMs get the control panel
  if (game.user.isGM) createOverlayUI();
});

/* ------------------------------------------------------------- */
let hoverHandler = null;

function createOverlayUI() {
  const uiBox = document.createElement('div');
  uiBox.id = 'image-overlay-controls';

  const pos = game.settings.get('image-overlay-toggle', POS_KEY);
  Object.assign(uiBox.style, {
    position: 'fixed',
    left: `${pos.x}px`,
    top: `${pos.y}px`,
    display: 'flex',
    gap: '4px',
    zIndex: 80,
    background: 'rgba(0,0,0,0.6)',
    padding: '4px',
    border: '1px solid #555',
    borderRadius: '6px'
  });

  // Thumbnail preview
  const thumb = Object.assign(document.createElement('img'), {
    id: 'io-thumb',
    width: 32,
    height: 32
  });
  Object.assign(thumb.style, {
    objectFit: 'cover',
    border: '1px solid #333'
  });

  // Pick button
  const pickBtn = document.createElement('button');
  pickBtn.className = 'io-btn';
  pickBtn.textContent = 'Pick';
  pickBtn.title = 'Choose an image';
  pickBtn.addEventListener('click', () => {
    new FilePicker({
      type: 'image',
      callback: path => {
        thumb.src = path;
        updateState({ path });
      }
    }).browse();
  });

  // Toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'io-btn';
  toggleBtn.textContent = 'Show';
  toggleBtn.title = 'Show/Hide overlay';
  toggleBtn.addEventListener('click', () => {
    const state = game.settings.get('image-overlay-toggle', STATE_KEY);
    if (!state.path) return ui.notifications.warn('No image selected.');
    updateState({ visible: !state.visible });
  });

  // Initial label and thumbnail
  const current = game.settings.get('image-overlay-toggle', STATE_KEY);
  toggleBtn.textContent = current.visible ? 'Hide' : 'Show';
  thumb.src = current.path ?? '';

  uiBox.append(thumb, pickBtn, toggleBtn);
  document.body.appendChild(uiBox);

  // React to future state changes
  Hooks.on('updateSetting', setting => {
    if (setting.namespace === 'image-overlay-toggle' && setting.key === STATE_KEY) {
      toggleBtn.textContent = setting.value.visible ? 'Hide' : 'Show';
      thumb.src = setting.value.path ?? '';
    }
  });

  // Drag & save position
  let dragging = false, offsetX = 0, offsetY = 0;
  uiBox.addEventListener('mousedown', event => {
    dragging = true;
    offsetX = event.clientX - uiBox.offsetLeft;
    offsetY = event.clientY - uiBox.offsetTop;
    event.preventDefault();
  });
  window.addEventListener('mousemove', event => {
    if (!dragging) return;
    const x = Math.min(window.innerWidth - uiBox.offsetWidth, Math.max(0, event.clientX - offsetX));
    const y = Math.min(window.innerHeight - uiBox.offsetHeight, Math.max(0, event.clientY - offsetY));
    uiBox.style.left = `${x}px`;
    uiBox.style.top  = `${y}px`;
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    game.settings.set('image-overlay-toggle', POS_KEY, {
      x: uiBox.offsetLeft,
      y: uiBox.offsetTop
    });
  });
}

/* ------------------------------------------------------------- */
function updateState(partial) {
  const current = game.settings.get('image-overlay-toggle', STATE_KEY);
  game.settings.set('image-overlay-toggle', STATE_KEY, {
    ...current,
    ...partial
  });
}

/* ------------------------------------------------------------- */
function applyOverlay(path, visible) {
  let img = document.getElementById('image-overlay-display');

  if (!visible || !path) {
    if (img) {
      img.remove();
      removeHoverHandler();
    }
    return;
  }

  if (!img) {
    img = document.createElement('img');
    img.id = 'image-overlay-display';
    Object.assign(img.style, {
      position: 'fixed',
      left: '40%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 20,
      opacity: 1,
      maxWidth: '90%',
      userSelect: 'none',
      boxShadow: '0 0 0 9999px rgba(0,0,0,1)'
    });
    document.body.appendChild(img);
    addHoverHandler(img);
  }

  img.src = path;
  img.style.maxHeight = `${window.innerHeight * 0.9}px`;
}

/* ------------------------------------------------------------- */
function injectStyles() {
  if (document.getElementById('io-shared-style')) return;
  const style = document.createElement('style');
  style.id = 'io-shared-style';
  style.textContent = `
    #image-overlay-controls .io-btn {
      padding: 4px 6px;
      border: 1px solid #666;
      border-radius: 4px;
      background: rgba(30,30,30,0.9);
      color: #fff;
      font-size: 12px;
      cursor: pointer;
    }
    #image-overlay-display {
      pointer-events: none;
      transition: opacity 150ms ease;
    }
  `;
  document.head.appendChild(style);
}

/* ------------------------------------------------------------- */
function addHoverHandler(img) {
  if (hoverHandler) return;
  let movingStart = 0;
  let lastX = 0, lastY = 0;

  hoverHandler = event => {
    const r = img.getBoundingClientRect();
    const inside = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;

    if (!inside) {
      img.style.opacity = 1;
      movingStart = 0;
      return;
    }

    const moved = (event.clientX !== lastX) || (event.clientY !== lastY);
    if (moved) {
      lastX = event.clientX; lastY = event.clientY;
      movingStart = movingStart || performance.now();
    }

    img.style.opacity = (performance.now() - movingStart > 500) ? 0.35 : 1;
  };

  window.addEventListener('pointermove', hoverHandler);
}

function removeHoverHandlerjavascript
/* Image Overlay Toggle – v1.5.1 */

const POS_KEY   = 'controlPos';   // per‑client position
const STATE_KEY = 'overlayState';  // world‑level overlay data

Hooks.once('init', () => {
  injectStyles();

  // Per‑client setting to remember panel position
  game.settings.register('image-overlay-toggle', POS_KEY, {
    scope: 'client',
    config: false,
    type: Object,
    default: { x: 12, y: window.innerHeight - 60 }
  });

  // World‑scope setting that stores overlay { path, visible }
  game.settings.register('image-overlay-toggle', STATE_KEY, {
    scope: 'world',
    config: false,
    type: Object,
    default: { path: null, visible: false }
  });
});

Hooks.once('ready', () => {
  // Everyone watches for changes to the world‑level state
  Hooks.on('updateSetting', (namespace, key, value) => {
    if (namespace === 'image-overlay-toggle' && key === STATE_KEY) {
      applyOverlay(value.path, value.visible);
    }
  });

  // Apply current state immediately on load
  const state = game.settings.get('image-overlay-toggle', STATE_KEY);
  applyOverlay(state.path, state.visible);

  // Only GMs get the control panel
  if (game.user.isGM) createOverlayUI();
});

/* ------------------------------------------------------------- */
// Internal helpers and variables
let hoverHandler = null;

function createOverlayUI() {
  const uiBox = document.createElement('div');
  uiBox.id = 'image-overlay-controls';

  const pos = game.settings.get('image-overlay-toggle', POS_KEY);
  Object.assign(uiBox.style, {
    position: 'fixed',
    left: `${pos.x}px`,
    top: `${pos.y}px`,
    display: 'flex',
    gap: '4px',
    zIndex: 80,
    background: 'rgba(0,0,0,0.6)',
    padding: '4px',
    border: '1px solid #555',
    borderRadius: '6px'
  });

  // Thumbnail preview
  const thumb = Object.assign(document.createElement('img'), {
    id: 'io-thumb',
    width: 32,
    height: 32
  });
  Object.assign(thumb.style, {
    objectFit: 'cover',
    border: '1px solid #333'
  });

  // Pick button
  const pickBtn = document.createElement('button');
  pickBtn.className = 'io-btn';
  pickBtn.textContent = 'Pick';
  pickBtn.title = 'Choose an image';
  pickBtn.addEventListener('click', () => {
    new FilePicker({
      type: 'image',
      callback: path => {
        thumb.src = path;
        updateState({ path }); // keep visibility unchanged
      }
    }).browse();
  });

  // Toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'io-btn';
  toggleBtn.textContent = 'Show';
  toggleBtn.title = 'Show/Hide overlay';
  toggleBtn.addEventListener('click', () => {
    const state = game.settings.get('image-overlay-toggle', STATE_KEY);
    if (!state.path) return ui.notifications.warn('No image selected.');
    updateState({ visible: !state.visible });
  });

  uiBox.append(thumb, pickBtn, toggleBtn);
  document.body.appendChild(uiBox);

  // Update UI when state changes (so toggle label stays correct)
  Hooks.on('updateSetting', (ns, key, val) => {
    if (ns === 'image-overlay-toggle' && key === STATE_KEY) {
      toggleBtn.textContent = val.visible ? 'Hide' : 'Show';
      thumb.src = val.path ?? '';
    }
  });

  // Drag & save position
  let dragging = false, offsetX = 0, offsetY = 0;
  uiBox.addEventListener('mousedown', event => {
    dragging = true;
    offsetX = event.clientX - uiBox.offsetLeft;
    offsetY = event.clientY - uiBox.offsetTop;
    event.preventDefault();
  });
  window.addEventListener('mousemove', event => {
    if (!dragging) return;
    const x = Math.min(window.innerWidth - uiBox.offsetWidth, Math.max(0, event.clientX - offsetX));
    const y = Math.min(window.innerHeight - uiBox.offsetHeight, Math.max(0, event.clientY - offsetY));
    uiBox.style.left = `${x}px`;
    uiBox.style.top  = `${y}px`;
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    game.settings.set('image-overlay-toggle', POS_KEY, {
      x: uiBox.offsetLeft,
      y: uiBox.offsetTop
    });
  });
}

/* ------------------------------------------------------------- */
// Update world‑level state with partial changes
function updateState(partial) {
  const current = game.settings.get('image-overlay-toggle', STATE_KEY);
  game.settings.set('image-overlay-toggle', STATE_KEY, {
    ...current,
    ...partial
  });
}

/* ------------------------------------------------------------- */
// Show / hide overlay on any client
function applyOverlay(path, visible) {
  let img = document.getElementById('image-overlay-display');

  if (!visible || !path) {
    if (img) {
      img.remove();
      removeHoverHandler();
    }
    return;
  }

  if (!img) {
    img = document.createElement('img');
    img.id = 'image-overlay-display';
    Object.assign(img.style, {
      position: 'fixed',
      left: '40%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 20,
      opacity: 1,
      maxWidth: '90%',
      userSelect: 'none',
      boxShadow: '0 0 0 9999px rgba(0,0,0,1)'
    });
    document.body.appendChild(img);
    addHoverHandler(img);
  }

  img.src = path;
  img.style.maxHeight = `${window.innerHeight * 0.9}px`;
}

/* ------------------------------------------------------------- */
function injectStyles() {
  if (document.getElementById('io-shared-style')) return;
  const style = document.createElement('style');
  style.id = 'io-shared-style';
  style.textContent = `
    #image-overlay-controls .io-btn {
      padding: 4px 6px;
      border: 1px solid #666;
      border-radius: 4px;
      background: rgba(30,30,30,0.9);
      color: #fff;
      font-size: 12px;
      cursor: pointer;
    }
    #image-overlay-display {
      pointer-events: none;
      transition: opacity 150ms ease;
    }
  `;
  document.head.appendChild(style);
}

/* ------------------------------------------------------------- */
// Hover fade after 0.5 s of continuous pointer movement; fade opacity 0.35
function addHoverHandler(img) {
  if (hoverHandler) return;
  let movingStart = 0;
  let lastX = 0, lastY = 0;

  hoverHandler = event => {
    const r = img.getBoundingClientRect();
    const inside = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;

    if (!inside) {
      img.style.opacity = 1;
      movingStart = 0;
      return;
    }

    const moved = (event.clientX !== lastX) || (event.clientY !== lastY);
    if (moved) {
      movingStart = movingStart || performance.now();
      lastX = event.clientX; lastY = event.clientY;
    }

    img.style.opacity = (performance.now() - movingStart > 500) ? 0.35 : 1;
  };

  window.addEventListener('pointermove', hoverHandler);
}

function removeHoverHandler() {
  if (!hoverHandler) return;
  window.removeEventListener('pointermove', hoverHandler);
  hoverHandler = null;
}

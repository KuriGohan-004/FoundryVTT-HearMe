/* Image Overlay Toggle – v1.1.0 */

/** Setting key used to persist the control‑panel position */
const POS_KEY = 'controlPos';

Hooks.once('init', () => {
  // Store panel position per‑client (so every GM/player can put it where they like)
  game.settings.register('image-overlay-toggle', POS_KEY, {
    scope: 'client',
    config: false,
    type: Object,
    default: { x: 12, y: window.innerHeight - 60 }
  });
});

Hooks.once('ready', () => {
  game.socket.on('module.image-overlay-toggle', handleSocket);
  if (game.user.isGM) createOverlayUI();
});

let currentImagePath = null;
let overlayVisible   = false;
let hoverHandler     = null;

/* ------------------------------------------------------------- */
// UI construction
function createOverlayUI() {
  const uiBox = document.createElement('div');
  uiBox.id = 'image-overlay-controls';

  // Restore saved position
  const pos = game.settings.get('image-overlay-toggle', POS_KEY);
  uiBox.style.position = 'fixed';
  uiBox.style.left = `${pos.x}px`;
  uiBox.style.top  = `${pos.y}px`;
  uiBox.style.display = 'flex';
  uiBox.style.gap = '4px';
  uiBox.style.zIndex = 80;
  uiBox.style.background = 'rgba(0,0,0,0.6)';
  uiBox.style.padding = '4px';
  uiBox.style.border = '1px solid #555';
  uiBox.style.borderRadius = '6px';

  // Styles
  const style = document.createElement('style');
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
    #image-overlay-display { pointer-events: none; transition: opacity 150ms ease; }
  `;
  document.head.appendChild(style);

  // Thumbnail preview (32×32)
  const thumb = document.createElement('img');
  thumb.id = 'io-thumb';
  thumb.width = 32;
  thumb.height = 32;
  thumb.style.objectFit = 'cover';
  thumb.style.border = '1px solid #333';

  // Buttons
  const pickBtn = document.createElement('button');
  pickBtn.className = 'io-btn';
  pickBtn.textContent = 'Pick';
  pickBtn.title = 'Choose an image';
  pickBtn.addEventListener('click', pickImage);

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'io-btn';
  toggleBtn.textContent = 'Show';
  toggleBtn.title = 'Show/Hide overlay';
  toggleBtn.addEventListener('click', () => {
    if (!currentImagePath) return ui.notifications.warn('No image selected.');
    overlayVisible = !overlayVisible;
    toggleBtn.textContent = overlayVisible ? 'Hide' : 'Show';
    applyOverlay();
    broadcastState();
  });

  uiBox.append(thumb, pickBtn, toggleBtn);
  document.body.appendChild(uiBox);

  // Basic drag‑n‑drop handling
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
    // Persist position
    game.settings.set('image-overlay-toggle', POS_KEY, {
      x: uiBox.offsetLeft,
      y: uiBox.offsetTop
    });
  });
}

/* ------------------------------------------------------------- */
// Image selection and overlay logic
function pickImage() {
  new FilePicker({
    type: 'image',
    callback: path => {
      currentImagePath = path;
      document.getElementById('io-thumb').src = path;
      broadcastState(); // Visibility unchanged; players just cache the path
    }
  }).browse();
}

function applyOverlay() {
  let img = document.getElementById('image-overlay-display');

  // Remove overlay if hidden
  if (!overlayVisible) {
    if (img) {
      img.remove();
      removeHoverHandler();
    }
    return;
  }

  // Create if first time
  if (!img) {
    img = document.createElement('img');
    img.id = 'image-overlay-display';
    img.style.position = 'fixed';
    img.style.left = '50%';
    img.style.top = '50%';
    img.style.transform = 'translate(-50%, -50%)';
    img.style.zIndex = 30; // Beneath UI windows
    img.style.opacity = 1;
    img.style.maxWidth = '90%';
    img.style.maxHeight = `${window.innerHeight * 0.8}px`;
    img.style.width = 'auto';
    img.style.userSelect = 'none';

    document.body.appendChild(img);
    addHoverHandler(img);
  }

  img.src = currentImagePath;
  img.style.maxHeight = `${window.innerHeight * 0.8}px`;
}

function broadcastState() {
  game.socket.emit('module.image-overlay-toggle', {
    path: currentImagePath,
    visible: overlayVisible
  });
}

function handleSocket(data) {
  currentImagePath = data.path;
  overlayVisible   = data.visible;
  applyOverlay();
}

/* ------------------------------------------------------------- */
// Hover transparency without blocking clicks (pointer‑events: none)
function addHoverHandler(img) {
  if (hoverHandler) return;
  hoverHandler = event => {
    if (!img.isConnected) return; // safety
    const r = img.getBoundingClientRect();
    const inside = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
    img.style.opacity = inside ? 0.5 : 1;
  };
  window.addEventListener('mousemove', hoverHandler);
}
function removeHoverHandler() {
  if (!hoverHandler) return;
  window.removeEventListener('mousemove', hoverHandler);
  hoverHandler = null;
}

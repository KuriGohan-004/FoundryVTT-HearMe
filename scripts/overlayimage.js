/** Setting key used to persist the control‑panel position */
const POS_KEY = 'controlPos';

Hooks.once('init', () => {
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

  // Drag‑n‑drop handling (same as before)
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
// Image selection and overlay logic
function pickImage() {
  new FilePicker({
    type: 'image',
    callback: path => {
      currentImagePath = path;
      document.getElementById('io-thumb').src = path;
      broadcastState(); // visibility unchanged
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
    img.style.left = '50%';          // centre horizontally
    img.style.top  = '45%';          // 45 % vertical framing
    img.style.transform = 'translate(-50%, -50%)';
    img.style.zIndex = 30;           // beneath UI windows
    img.style.opacity = 1;
    img.style.maxWidth  = '90%';
    img.style.userSelect = 'none';
    img.style.boxShadow = '0 0 0 9999px rgba(0,0,0,1)'; // huge black matte

    document.body.appendChild(img);
    addHoverHandler(img);
  }

  img.src = currentImagePath;
  img.style.maxHeight = `${window.innerHeight * 0.9}px`; // 90 % height
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
// Hover fade after 3 s of movement inside overlay
function addHoverHandler(img) {
  if (hoverHandler) return;

  let movingStart = 0;
  let lastMoveTime = 0;

  hoverHandler = event => {
    if (!img.isConnected) return;

    const r = img.getBoundingClientRect();
    const inside = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;

    if (!inside) {
      img.style.opacity = 1;
      movingStart = 0;
      return;
    }

    const now = Date.now();

    // Detect whether the mouse has actually moved (changes in coords)
    const moved = (now - lastMoveTime) < 150; // <150 ms between events ≈ moving

    if (!moved) {
      // Reset if stationary
      movingStart = now;
      img.style.opacity = 1;
    } else if (movingStart === 0) {
      // First movement inside overlay
      movingStart = now;
    }

    // After 3 s of continuous movement fade to 0.5
    if (now - movingStart >= 3000) {
      img.style.opacity = 0.5;
    }

    lastMoveTime = now;
  };

  window.addEventListener('mousemove', hoverHandler);
}

function removeHoverHandler() {
  if (!hoverHandler) return;
  window.removeEventListener('mousemove', hoverHandler);
  hoverHandler = null;
}

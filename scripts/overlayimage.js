/** Setting key used to persist the control‑panel position */
const POS_KEY = 'controlPos';

Hooks.once('init', () => {
  // Shared styles (players & GM)
  injectStyles();

  // Save per‑client panel position setting
  game.settings.register('image-overlay-toggle', POS_KEY, {
    scope: 'client',
    config: false,
    type: Object,
    default: { x: 12, y: window.innerHeight - 60 }
  });
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
function createOverlayUI() {
  const uiBox = document.createElement('div');
  uiBox.id = 'image-overlay-controls';

  // Restore saved position
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

  const thumb = Object.assign(document.createElement('img'), {
    id: 'io-thumb',
    width: 32,
    height: 32,
  });
  Object.assign(thumb.style, {
    objectFit: 'cover',
    border: '1px solid #333'
  });

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
function pickImage() {
  new FilePicker({
    type: 'image',
    callback: path => {
      currentImagePath = path;
      document.getElementById('io-thumb').src = path;
      broadcastState();
    }
  }).browse();
}

function applyOverlay() {
  let img = document.getElementById('image-overlay-display');

  if (!overlayVisible) {
    if (img) {
      img.remove();
      removeHoverHandler();
    }
    return;
  }

  if (!img) {
    img = document.createElement('img');
    img.id = 'image-overlay-display';
    img.style.position = 'fixed';
    img.style.left = '40%';           // 40 % from the left
    img.style.top  = '50%';           // vertical middle
    img.style.transform = 'translate(-50%, -50%)';
    img.style.zIndex = 20;            // beneath chat panel
    img.style.opacity = 1;
    img.style.maxWidth = '90%';
    img.style.userSelect = 'none';

    // Full‑screen black matte
    img.style.boxShadow = '0 0 0 9999px rgba(0,0,0,1)';

    document.body.appendChild(img);
    addHoverHandler(img);
  }

  img.src = currentImagePath;
  img.style.maxHeight = `${window.innerHeight * 0.9}px`;
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
// Hover fade after 0.5 s of continuous pointer movement; fade opacity 0.35
// -------------------------------------------------------------
// Style injector (now runs for everyone)
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

// -------------------------------------------------------------
function addHoverHandler(img) {
  if (hoverHandler) return;

  let movingStart = 0;
  let lastPosX = 0;
  let lastPosY = 0;

  hoverHandler = event => {
    if (!img.isConnected) return;

    const r = img.getBoundingClientRect();
    const inside = event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;

    if (!inside) {
      img.style.opacity = 1;
      movingStart = 0;
      return;
    }

    const moved = (event.clientX !== lastPosX) || (event.clientY !== lastPosY);
    const now = Date.now();

    if (moved) {
      if (movingStart === 0) movingStart = now;
      if (now - movingStart >= 500) img.style.opacity = 0.35;
    } else {
      movingStart = 0;
      img.style.opacity = 1;
    }

    lastPosX = event.clientX;
    lastPosY = event.clientY;
  };

  window.addEventListener('mousemove', hoverHandler);
}

function removeHoverHandler() {
  if (!hoverHandler) return;
  window.removeEventListener('mousemove', hoverHandler);
  hoverHandler = null;
}

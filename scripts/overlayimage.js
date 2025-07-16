/* Image Overlay Toggle – main script */

Hooks.once('ready', () => {
  // Listen for overlay state from the GM (runs for everyone)
  game.socket.on('module.image-overlay-toggle', handleSocket);

  // Only GMs get the pick / toggle buttons
  if (game.user.isGM) createOverlayUI();
});

let currentImagePath = null;
let overlayVisible   = false;

/**
 * Build the two‑button control panel.
 */
function createOverlayUI() {
  const uiBox = document.createElement('div');
  uiBox.id = 'image-overlay-controls';
  Object.assign(uiBox.style, {
    position: 'fixed',
    left: '12px',
    bottom: '12px',
    display: 'flex',
    gap: '4px',
    zIndex: 80
  });

  // Basic styling for the buttons
  const style = document.createElement('style');
  style.textContent = `
    #image-overlay-controls .io-btn {
      padding: 4px 6px;
      border: 1px solid #666;
      border-radius: 4px;
      background: rgba(0,0,0,0.8);
      color: #fff;
      font-size: 12px;
      cursor: pointer;
    }
    #image-overlay-display { pointer-events:none; }
  `;
  document.head.appendChild(style);

  // "Pick image" button
  const pickBtn = document.createElement('button');
  pickBtn.className = 'io-btn';
  pickBtn.textContent = 'Pick Image';
  pickBtn.addEventListener('click', pickImage);

  // "Show / Hide" toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'io-btn';
  toggleBtn.textContent = 'Show / Hide';
  toggleBtn.addEventListener('click', toggleOverlay);

  uiBox.append(pickBtn, toggleBtn);
  document.body.appendChild(uiBox);
}

/** Use Foundry's FilePicker to choose an image */
function pickImage() {
  new FilePicker({
    type: 'image',
    callback: path => {
      currentImagePath = path;
      overlayVisible   = true;
      applyOverlay();
      broadcastState();
    }
  }).browse();
}

/** Toggle current overlay */
function toggleOverlay() {
  if (!currentImagePath) return ui.notifications.warn('No image selected.');
  overlayVisible = !overlayVisible;
  applyOverlay();
  broadcastState();
}

/** Create, update, or remove the overlay <img> element */
function applyOverlay() {
  let img = document.getElementById('image-overlay-display');

  // Hide or remove the element when not visible
  if (!overlayVisible) {
    if (img) img.remove();
    return;
  }

  // Create element on first use
  if (!img) {
    img = document.createElement('img');
    img.id = 'image-overlay-display';
    Object.assign(img.style, {
      position: 'fixed',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 30 // Beneath regular UI windows (≈100) but above canvas
    });
    document.body.appendChild(img);
  }

  // Apply source and scaling (80 % of viewport height, keep aspect)
  img.src = currentImagePath;
  img.style.maxHeight = `${window.innerHeight * 0.8}px`;
  img.style.width     = 'auto';
  img.style.maxWidth  = '90%';
}

/** Broadcast current overlay state to every connected client */
function broadcastState() {
  game.socket.emit('module.image-overlay-toggle', {
    path: currentImagePath,
    visible: overlayVisible
  });
}

/** Handle socket messages (runs for everyone, including the GM) */
function handleSocket(data) {
  currentImagePath = data.path;
  overlayVisible   = data.visible;
  applyOverlay();
}

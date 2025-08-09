const MODULE_ID = "image-broadcast";

Hooks.once("ready", () => {
  if (game.user.isGM) {
    createGMToolbar();
  }

  // Listen for GM broadcast
  game.socket.on(`module.${MODULE_ID}`, ({ action, data }) => {
    if (action === "showImage") {
      showBroadcastImage(data.src);
    } else if (action === "hideImage") {
      hideBroadcastImage();
    }
  });
});

function createGMToolbar() {
  const bar = $(`
    <div id="${MODULE_ID}-toolbar" style="
      position: fixed;
      bottom: 20px;
      left: 320px; /* start right of sidebar */
      background: black;
      color: white;
      display: flex;
      align-items: center;
      padding: 4px;
      gap: 4px;
      border: 1px solid #666;
      border-radius: 4px;
      z-index: 10000;
      cursor: move;
    ">
      <button id="${MODULE_ID}-browse" style="padding:2px 6px;">📁</button>
      <img id="${MODULE_ID}-preview" src="" style="max-height: 30px; display:none; border: 1px solid white;" />
      <button id="${MODULE_ID}-toggle" style="padding:2px 6px;">Show</button>
    </div>
  `);
  $("body").append(bar);

  let currentImage = null;
  let isShown = false;

  // Make draggable but constrain to screen + avoid sidebar
  makeDraggableConstrained(bar[0]);

  // Browse button → Foundry file picker
  bar.find(`#${MODULE_ID}-browse`).on("click", async () => {
    const fp = new FilePicker({
      type: "image",
      current: "public",
      callback: (path) => {
        currentImage = path;
        bar.find(`#${MODULE_ID}-preview`).attr("src", path).show();
      }
    });
    fp.render(true);
  });

  // Toggle show/hide
  bar.find(`#${MODULE_ID}-toggle`).on("click", () => {
    if (!currentImage) {
      ui.notifications.warn("Please select an image first.");
      return;
    }
    isShown = !isShown;
    bar.find(`#${MODULE_ID}-toggle`).text(isShown ? "Hide" : "Show");
    if (isShown) {
      game.socket.emit(`module.${MODULE_ID}`, { action: "showImage", data: { src: currentImage } });
      showBroadcastImage(currentImage); // also show for GM
    } else {
      game.socket.emit(`module.${MODULE_ID}`, { action: "hideImage" });
      hideBroadcastImage(); // hide for GM
    }
  });
}

function showBroadcastImage(src) {
  hideBroadcastImage(); // Remove any existing

  const img = $(`<img id="${MODULE_ID}-display" src="${src}" style="
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    background: black;
    padding: 2%;
    box-sizing: border-box;
    z-index: 9999;
    border: 4px solid black;
  ">`);
  $("body").append(img);
}

function hideBroadcastImage() {
  $(`#${MODULE_ID}-display`).remove();
}

function makeDraggableConstrained(el) {
  let isDragging = false;
  let offsetX, offsetY;

  el.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON" || e.target.tagName === "IMG") return;
    isDragging = true;
    offsetX = e.clientX - el.getBoundingClientRect().left;
    offsetY = e.clientY - el.getBoundingClientRect().top;
    e.preventDefault();
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const sidebarWidth = ui.sidebar?._collapsed ? 0 : ui.sidebar.element.width();
    const minX = sidebarWidth;
    const minY = 0;
    const maxX = window.innerWidth - el.offsetWidth;
    const maxY = window.innerHeight - el.offsetHeight;

    let newX = e.clientX - offsetX;
    let newY = e.clientY - offsetY;

    if (newX < minX) newX = minX;
    if (newX > maxX) newX = maxX;
    if (newY < minY) newY = minY;
    if (newY > maxY) newY = maxY;

    el.style.left = `${newX}px`;
    el.style.top = `${newY}px`;
    el.style.bottom = "auto"; // prevent snapping back
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });
}

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
      bottom: 0;
      left: 0;
      width: 100%;
      background: black;
      color: white;
      display: flex;
      align-items: center;
      padding: 4px;
      gap: 8px;
      z-index: 10000;
    ">
      <button id="${MODULE_ID}-browse">📁 Browse</button>
      <img id="${MODULE_ID}-preview" src="" style="max-height: 40px; display:none; border: 1px solid white;" />
      <button id="${MODULE_ID}-toggle">Show</button>
    </div>
  `);
  $("body").append(bar);

  let currentImage = null;
  let isShown = false;

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
      showBroadcastImage(currentImage);
    } else {
      game.socket.emit(`module.${MODULE_ID}`, { action: "hideImage" });
      hideBroadcastImage();
    }
  });
}

function showBroadcastImage(src) {
  hideBroadcastImage(); // Remove any existing

  const img = $(`<img id="${MODULE_ID}-display" src="${src}" style="
    position: fixed;
    top: 50%;
    left: calc(50% + ${sidebarOffset()}px);
    transform: translate(-50%, -50%);
    max-width: calc(90vw - ${sidebarOffset()}px);
    max-height: 90vh;
    object-fit: contain;
    background: black;
    padding: 2%;
    box-sizing: border-box;
    z-index: 9999;
    border: 4px solid black;
  ">`);
  $("body").append(img);

  // Recenter if sidebar opens/closes
  Hooks.on("renderSidebarTab", () => recenterImage());
  Hooks.on("collapseSidebar", () => recenterImage());
}

function hideBroadcastImage() {
  $(`#${MODULE_ID}-display`).remove();
}

function sidebarOffset() {
  return ui.sidebar?._collapsed ? 0 : ui.sidebar.element.width() / 2 || 0;
}

function recenterImage() {
  const img = $(`#${MODULE_ID}-display`);
  if (img.length) {
    img.css("left", `calc(50% + ${sidebarOffset()}px)`);
    img.css("max-width", `calc(90vw - ${sidebarOffset()}px)`);
  }
}

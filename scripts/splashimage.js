const MODULE_ID = "image-broadcast";

// Register settings so we can store the active image and its visibility
Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "imageSrc", {
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
  game.settings.register(MODULE_ID, "imageVisible", {
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
});

// Socket listener for all clients
Hooks.once("ready", () => {
  game.socket.on(`module.${MODULE_ID}`, (data) => {
    if (!data) return;
    if (data.action === "updateImage") {
      game.settings.set(MODULE_ID, "imageSrc", data.src);
      game.settings.set(MODULE_ID, "imageVisible", data.visible);
      updateDisplayedImage(data.src, data.visible);
    }
  });

  // On join, check settings to show current image if needed
  const src = game.settings.get(MODULE_ID, "imageSrc");
  const visible = game.settings.get(MODULE_ID, "imageVisible");
  updateDisplayedImage(src, visible);

  // Only GM gets the toolbar
  if (game.user.isGM) {
    new ImageBroadcastToolbar().render(true);
  }
});

// GM control bar as an Application
class ImageBroadcastToolbar extends Application {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: `${MODULE_ID}-toolbar`,
      template: `modules/${MODULE_ID}/templates/toolbar.html`,
      popOut: false,
      minimizable: false,
      resizable: false,
      draggable: true,
      top: 200,
      left: ui.sidebar?.width || 300,
      width: "auto",
      height: "auto"
    });
  }

  getData() {
    return {
      currentImage: game.settings.get(MODULE_ID, "imageSrc"),
      isVisible: game.settings.get(MODULE_ID, "imageVisible")
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".browse-btn").on("click", () => {
      const fp = new FilePicker({
        type: "image",
        callback: (path) => {
          game.settings.set(MODULE_ID, "imageSrc", path);
          this.render();
        }
      });
      fp.render(true);
    });

    html.find(".toggle-btn").on("click", () => {
      const currentSrc = game.settings.get(MODULE_ID, "imageSrc");
      if (!currentSrc) {
        ui.notifications.warn("Please select an image first.");
        return;
      }
      const currentlyVisible = game.settings.get(MODULE_ID, "imageVisible");
      const newVisible = !currentlyVisible;
      game.settings.set(MODULE_ID, "imageVisible", newVisible);
      game.socket.emit(`module.${MODULE_ID}`, {
        action: "updateImage",
        src: currentSrc,
        visible: newVisible
      });
      updateDisplayedImage(currentSrc, newVisible);
      this.render();
    });
  }
}

// Show/hide image function
function updateDisplayedImage(src, visible) {
  $("#image-broadcast-display").remove();

  if (!visible || !src) return;

  const img = $(`<img id="image-broadcast-display" src="${src}">`).css({
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    "max-width": "90vw",
    "max-height": "90vh",
    "object-fit": "contain",
    background: "black",
    padding: "2%",
    "box-sizing": "border-box",
    "z-index": 9999,
    border: "4px solid black"
  });

  $("body").append(img);
}

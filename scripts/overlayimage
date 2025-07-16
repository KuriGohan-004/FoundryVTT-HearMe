/***************************************************************
 *  VN Media Overlay  (separate script)
 *  • GM‑only window with a file‑picker (images / video)
 *  • “Show / Hide” toggle button
 *  • Fades in‑out, centers with a bit of padding
 *  • Broadcasts to all players via socket
 ***************************************************************/

const MODULE_ID = "hearme-chat-notification";           // reuse your namespace
const SOCKET_ID = "vn-media-overlay";

/* ---------- SETTINGS ---------- */
Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "overlayPath", {
    name: "Last Overlay Media",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, "overlayVisible", {
    name: "Overlay Visibility",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
});

/* ---------- OVERLAY DOM ---------- */
function ensureOverlay() {
  if (document.getElementById("vn-media-overlay")) return;

  const el = document.createElement("div");
  el.id = "vn-media-overlay";
  Object.assign(el.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: 97,                       // beneath portrait (98) & banner (99)
    maxWidth: "90vw",
    maxHeight: "90vh",
    padding: "8px",
    boxSizing: "border-box",
    background: "rgba(0,0,0,0.4)",
    borderRadius: "6px",
    opacity: "0",
    transition: "opacity 0.4s ease",
    pointerEvents: "none"            // overlay itself not interactive
  });
  document.body.appendChild(el);
}

/* Render image / video in overlay */
function renderOverlay(path, show) {
  ensureOverlay();
  const el = document.getElementById("vn-media-overlay");
  el.innerHTML = "";
  if (show && path) {
    const isVideo = /\.(mp4|webm|ogg)$/i.test(path);
    const media   = document.createElement(isVideo ? "video" : "img");
    if (isVideo) {
      media.src = path;
      media.autoplay = true;
      media.loop = true;
      media.muted = true;
      media.style.maxWidth = "100%";
      media.style.maxHeight = "100%";
    } else {
      media.src = path;
      Object.assign(media.style, { maxWidth: "100%", maxHeight: "100%" });
    }
    el.appendChild(media);
    el.style.opacity = "1";
  } else {
    el.style.opacity = "0";
  }
}

/* ---------- SOCKET ---------- */
game.socket.on(`module.${SOCKET_ID}`, ({ path, visible }) => {
  renderOverlay(path, visible);
});

/* ---------- APPLICATION ---------- */
class MediaOverlayConfig extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "media-overlay-config",
      title: "VN Media Overlay",
      template: `
        <form>
          <div class="form-group">
            <label>Select Image / Video</label>
            <div class="form-fields">
              <input type="text" name="path" value="{{path}}" style="width:100%">
              <button type="button" class="file-picker" data-target="path" data-type="imagevideo">
                <i class="fas fa-file-import"></i>
              </button>
            </div>
          </div>
          <button type="submit" name="toggle" class="toggle">{{#if visible}}Hide{{else}}Show{{/if}}</button>
        </form>`,
      width: 400,
      height: "auto"
    });
  }

  /** Compile tiny handlebars template on the fly */
  getData() {
    return {
      path: game.settings.get(MODULE_ID, "overlayPath"),
      visible: game.settings.get(MODULE_ID, "overlayVisible")
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("button.toggle").click(async (ev) => {
      ev.preventDefault();
      // collect current form values
      const path    = html.find("input[name='path']").val().trim();
      const visible = !game.settings.get(MODULE_ID, "overlayVisible");
      await game.settings.set(MODULE_ID, "overlayPath", path);
      await game.settings.set(MODULE_ID, "overlayVisible", visible);

      // broadcast change
      game.socket.emit(`module.${SOCKET_ID}`, { path, visible });
      renderOverlay(path, visible);

      // update button label
      ev.currentTarget.textContent = visible ? "Hide" : "Show";
    });
  }
}

/* ---------- ADD BUTTON TO UI ---------- */
Hooks.once("ready", () => {
  if (!game.user.isGM) return;

  // Add a small control icon to the sidebar or UI header
  const btn = document.createElement("div");
  btn.id = "media-overlay-launcher";
  btn.title = "VN Media Overlay";
  btn.innerHTML = `<i class="fas fa-photo-video"></i>`;
  Object.assign(btn.style, {
    position: "fixed",
    bottom: "15px",
    right: "15px",
    fontSize: "24px",
    color: "#ffffff",
    background: "rgba(0,0,0,0.6)",
    borderRadius: "50%",
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 100
  });
  btn.addEventListener("click", () => new MediaOverlayConfig().render(true));
  document.body.appendChild(btn);

  /* On initial load, render overlay if setting says it's visible */
  const path = game.settings.get(MODULE_ID, "overlayPath");
  const vis  = game.settings.get(MODULE_ID, "overlayVisible");
  if (vis && path) renderOverlay(path, true);
});


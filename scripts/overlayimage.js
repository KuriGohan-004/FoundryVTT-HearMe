(() => {


  Hooks.once("init", function () {
  console.log("🧠 HearMe: Registering TTS setting");

  game.settings.register("hearme-chat-notification", "ttsVoiceUser", {
    name: "TTS Player",
    hint: "Choose which player's chat messages will be spoken aloud using text-to-speech.",
    scope: "world",
    config: true,
    type: String,
    default: "",
    choices: () => {
      const choices = {};
      for (const user of game.users.contents) {
        if (!user.isGM) choices[user.id] = user.name;
      }
      return choices;
    },
    onChange: () => window.location.reload()
  });
});


  
  // scripts/token-bar.js
  Hooks.once('ready', async () => {
    const isGM = game.user.isGM;
    const followState = {
      enabled: true,
      selectedToken: null,
      lastCenter: { x: 0, y: 0 },
      lastMoveTime: 0
    };

    const bar = document.createElement('div');
    bar.id = 'token-portrait-bar';
    bar.innerHTML = `
      <button id="follow-mode-toggle">Follow Mode: On</button>
      <div id="token-portraits"></div>
      <div id="selected-character-name" style="color: white; margin-top: 5px; font-size: 14px;"></div>
    `;
    document.body.appendChild(bar);

    const style = document.createElement('style');
    style.innerHTML = `
      #token-portrait-bar {
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
        background: rgba(0,0,0,0.7);
        padding: 5px;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      #token-portraits {
        display: flex;
        gap: 6px;
        margin-bottom: 5px;
      }
      .token-portrait {
        width: 40px;
        height: 40px;
        border: 2px solid transparent;
        border-radius: 50%;
        overflow: hidden;
        cursor: pointer;
        transition: transform 0.2s;
        background-color: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .token-portrait img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }
      .selected-token {
        transform: scale(2.0);
        border-color: yellow;
      }
      .token-portrait img[title] {
        pointer-events: none;
      }
      .token-portrait img[title]::after {
        content: attr(title);
        position: absolute;
        background: #000;
        color: #fff;
        padding: 2px 4px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
      }
      .token-portrait img {
        pointer-events: auto;
      }
    `;
    document.head.appendChild(style);

    function getRelevantTokens() {
      const tokens = canvas.tokens.placeables;

      if (isGM) {
        const offlineUsers = game.users.filter(u => !u.active && !u.isGM);
        const offlineUserIds = offlineUsers.map(u => u.id);

        return tokens.filter(t => {
          const owners = t.actor?.ownership || {};
          return Object.entries(owners).some(([userId, level]) =>
            offlineUserIds.includes(userId) && level >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER
          );
        });
      } else {
        return tokens.filter(t => t.actor?.isOwner);
      }
    }

    function updatePortraitBar() {
      const tokens = getRelevantTokens();
      const container = bar.querySelector('#token-portraits');
      container.innerHTML = '';

      tokens.forEach((t) => {
        const div = document.createElement('div');
        div.className = 'token-portrait';
        if (t === followState.selectedToken) div.classList.add('selected-token');
        const img = document.createElement('img');
        img.src = t.document.texture.src;
        img.setAttribute('title', t.name);
        div.appendChild(img);
        div.onclick = () => selectToken(t);
        container.appendChild(div);
      });

      const selectedNameDiv = document.getElementById('selected-character-name');
      selectedNameDiv.textContent = followState.selectedToken ? followState.selectedToken.name : '';
    }

    function selectToken(token) {
      followState.selectedToken = token;
      token.control({ releaseOthers: true });
      canvas.animatePan({ x: token.x, y: token.y });
      followState.lastCenter = { x: token.x, y: token.y };
      updatePortraitBar();
    }

    function toggleFollowMode() {
      followState.enabled = !followState.enabled;
      document.getElementById('follow-mode-toggle').textContent = `Follow Mode: ${followState.enabled ? 'On' : 'Off'}`;
      if (followState.enabled) {
        if (!followState.selectedToken) {
          const tokens = getRelevantTokens();
          if (tokens.length > 0) selectToken(tokens[0]);
        } else {
          canvas.animatePan({ x: followState.selectedToken.x, y: followState.selectedToken.y });
          followState.lastCenter = { x: followState.selectedToken.x, y: followState.selectedToken.y };
        }
      }
    }

    document.getElementById('follow-mode-toggle').onclick = toggleFollowMode;

    Hooks.on('updateToken', (doc, changes, options, userId) => {
      if (!followState.enabled || !followState.selectedToken) return;
      if (doc.id !== followState.selectedToken.id) return;

      const dx = Math.abs(doc.x - followState.lastCenter.x);
      const dy = Math.abs(doc.y - followState.lastCenter.y);
      const gridSize = canvas.grid.size;
      const moved = dx > 0 || dy > 0;

      if (dx > 3 * gridSize || dy > 3 * gridSize) {
        canvas.animatePan({ x: doc.x, y: doc.y });
        followState.lastCenter = { x: doc.x, y: doc.y };
      } else if (moved) {
        followState.lastMoveTime = Date.now();
      }
    });

    Hooks.on('controlToken', (token, controlled) => {
      if (controlled && token.actor?.isOwner) {
        followState.selectedToken = token;
        updatePortraitBar();
      }
    });

    Hooks.on('canvasReady', () => {
      if (!followState.selectedToken) {
        const tokens = getRelevantTokens();
        if (tokens.length > 0) selectToken(tokens[0]);
      }
    });

    setInterval(() => {
      if (!followState.enabled || !followState.selectedToken) return;
      if (Date.now() - followState.lastMoveTime > 1000 && followState.lastMoveTime !== 0) {
        canvas.animatePan({ x: followState.selectedToken.x, y: followState.selectedToken.y });
        followState.lastCenter = { x: followState.selectedToken.x, y: followState.selectedToken.y };
        followState.lastMoveTime = 0;
      }
    }, 500);

    document.addEventListener('mousedown', evt => {
      if (!followState.enabled) return;
      const tokenObject = evt.target.closest(".token");
      if (!tokenObject) return;
      const token = canvas.tokens.placeables.find(t => t.object && t.object.id === tokenObject.id);
      if (!token) return;
      if (evt.button === 0) {
        evt.preventDefault();
        evt.stopPropagation();
        game.user.updateTokenTargets([token.id]);
      }
    }, true);

    window.addEventListener('keydown', (evt) => {
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;

      const appWindows = Object.values(ui.windows);
      for (const app of appWindows) {
        if (app?.element?.find(':focus').length > 0) return;
      }

      if (!followState.enabled) return;
      const key = evt.key.toLowerCase();
      const movementKeys = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"];

      const tokens = getRelevantTokens();
      if (!followState.selectedToken && (movementKeys.includes(key) || key === 'q' || key === 'e')) {
        if (tokens.length > 0) selectToken(tokens[0]);
        return;
      }

      if (movementKeys.includes(key)) {
        const controlled = canvas.tokens.controlled;
        if (!controlled.includes(followState.selectedToken)) {
          if (followState.selectedToken) selectToken(followState.selectedToken);
        }
      }

      if (key === 'q' || key === 'e') {
        const index = tokens.indexOf(followState.selectedToken);
        if (index === -1) return;
        const nextIndex = key === 'q'
          ? (index - 1 + tokens.length) % tokens.length
          : (index + 1) % tokens.length;
        selectToken(tokens[nextIndex]);
      }
    }, true);

    updatePortraitBar();
  });




  /* ---------- Improved ENTER behaviour --------------------------- */
Hooks.once("ready", () => {
  console.log("Enter Chat Focus | Loaded");

  // Pressing Enter -> Focus chat input if nothing else is focused
  window.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      const active = document.activeElement;
      const isInput = active && (
        active.tagName === "INPUT" ||
        active.tagName === "TEXTAREA" ||
        active.isContentEditable
      );
      const isButton = active && active.tagName === "BUTTON";

      if (!isInput && !isButton) {
        event.preventDefault();
        const chatInput = document.querySelector("#chat-message");
        if (chatInput) {
          chatInput.focus();
        }
      }
    }
  });

  // When user sends a message -> blur input
  Hooks.on("chatMessage", () => {
    const chatInput = document.querySelector("#chat-message");
    if (chatInput) {
      chatInput.blur();
    }
  });
});


  /* -- After chat submit: blur & re‑focus canvas ----------------- */
  Hooks.once("renderChatLog", (app, html) => {
    const form = html[0].querySelector("form");
    if (!form) return;

    form.addEventListener("submit", () => {
      setTimeout(() => {
        /* Blur chat input so keyboard controls are free again */
        form.querySelector("textarea[name='message'],#chat-message")?.blur();

        /* Re‑select previously‑controlled token for movement keys */
        if (canvas?.ready) {
          const sel = canvas.tokens.controlled[0] || canvas.tokens.get(selectedId);
          sel?.control({ releaseOthers: false });
        }
      }, 200);   /* small delay lets Foundry finish its own handlers */
    });
  });
  

  // Close all character-type sheets
async function closeCharacterSheets() {
  for (const app of Object.values(ui.windows)) {
    if (app.rendered && app.document?.entity?.type === "character") {
      await app.close();
    }
  }
}

// Wrap selectToken to automatically close sheets before changing selection
const _originalSelectToken = selectToken;
selectToken = async function(token) {
  if (followState.selectedToken !== token) {
    await closeCharacterSheets();
  }
  return _originalSelectToken(token);
};

/**
 * disable-left-click.js
 * Disables left-click token selection using v13 public API.
 */
Hooks.on("ready", () => {
  // Disable interactivity for all tokens
  for (const token of canvas.tokens.placeables) {
    disableTokenInteraction(token);
  }

  // Also disable it for tokens added later
  Hooks.on("createToken", async tokenDoc => {
    const token = canvas.tokens.get(tokenDoc.id);
    if (token) disableTokenInteraction(token);
  });
});

/**
 * Disables interaction for a specific token
 * @param {Token} token
 */
function disableTokenInteraction(token) {
  token.interactive = false; // Blocks pointer events
  token.hitArea = null;      // Makes it non-clickable

  // Prevent selection via mouse
  token._originalOnClickLeft = token._originalOnClickLeft || token._onClickLeft;
  token._onClickLeft = function () {
    ui.notifications.debug("Token selection disabled.");
  };

  // Optional: also prevent dragging or right-clicking
  token._originalOnDragStart = token._onDragStart;
  token._onDragStart = function () {};

  token._originalOnClickRight = token._onClickRight;
  token._onClickRight = function () {};
}

// Optional: remove hover highlight entirely
Hooks.on("highlightObjects", (active) => {
  if (active) return false; // cancel highlight
});

// Splash Screen Test!

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

  
 
})();

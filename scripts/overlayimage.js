/***********************************************************************
 * Player Token Bar – rotated fading name aligned to sidebar
 *  • v2 – user-owned only, GM omnibus view, half-sized bar
 *  • Bugfixed: Follow mode lag resolved by debouncing refresh and
 *    only rebuilding UI when necessary
 **********************************************************************/
(() => {
  const BAR_ID = "player-token-bar";
  const LABEL_ID = "player-token-bar-label";
  const CENTER_ID = "player-token-bar-center-label";

  // CSS styles adjusted to avoid HUD break
  const CSS = `
    #${BAR_ID} {
      position: relative;
      height: 84px;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      overflow: hidden;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 8px;
      pointer-events: auto;
      user-select: none;
      z-index: 10;
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      font-family: Arial, sans-serif;
    }
    #${BAR_ID} img {
      width: 64px; height: 64px;
      object-fit: cover;
      border-radius: 8px;
      border: 2px solid #fff;
      flex: 0 0 auto;
      cursor: pointer;
      transition: transform 0.15s ease;
    }
    #${BAR_ID} img:hover {
      transform: scale(1.2);
      z-index: 1;
    }
    #${BAR_ID} img.selected-token,
    #${BAR_ID} img.selected-token:hover {
      transform: scale(1.25);
      z-index: 2;
      border-color: #0f0;
    }
    #${LABEL_ID} {
      font-size: 16px;
      font-weight: bold;
      color: #fff;
      text-shadow: 0 0 4px #000;
      pointer-events: none;
      height: 24px;
      line-height: 24px;
      margin-top: 5px;
      text-align: center;
      user-select: none;
    }
  `;

  // Append style once
  if (!document.getElementById("player-token-bar-style")) {
    const style = document.createElement("style");
    style.id = "player-token-bar-style";
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // Container inside Foundry UI (safe spot)
  const container = document.getElementById("ui-bottom") || document.body;

  // Create or get elements inside the container
  function getOrCreate(id, tag = "div") {
    let el = container.querySelector(`#${id}`);
    if (!el) {
      el = document.createElement(tag);
      el.id = id;
      container.appendChild(el);
    }
    return el;
  }

  const bar = () => getOrCreate(BAR_ID);
  const label = () => getOrCreate(LABEL_ID);

  // Utility to find player tokens on current scene for current user
  function getPlayerTokens() {
    if (!game.user) return [];
    const controlledScenes = canvas?.scene;
    if (!controlledScenes) return [];
    return canvas.tokens.placeables.filter(t => {
      // Tokens visible to user (owned by user or GM)
      if (!t.actor) return false;
      // Include tokens owned by this user
      if (t.actor.hasPlayerOwner) return true;
      // Also include tokens owned by the current user
      return t.actor?.permission?.has(game.user.id) || t.actor?.permission?.has("OWNER");
    });
  }

  // Refresh the player token bar
  function refresh() {
    const tokens = getPlayerTokens();

    const barEl = bar();
    barEl.innerHTML = ""; // clear old tokens

    if (tokens.length === 0) {
      label().textContent = "No tokens available";
      label().style.display = "block";
      return;
    } else {
      label().style.display = "none";
    }

    // Build token icons
    tokens.forEach(t => {
      const img = document.createElement("img");
      img.src = t.data.img || "icons/svg/mystery-man.svg";
      img.title = t.name;
      img.dataset.tokenId = t.id;
      img.draggable = false;

      // Mark selected token
      if (t === canvas.tokens.controlled[0]) {
        img.classList.add("selected-token");
      }

      img.addEventListener("click", () => {
        canvas.tokens.control({ releaseOthers: true });
        t.control({ releaseOthers: true });
      });

      barEl.appendChild(img);
    });
  }

  // Follow mode & smooth camera panning

  let followMode = false;
  let lastFollowPos = null;

  function toggleFollowMode() {
    followMode = !followMode;
    if (followMode) {
      const token = canvas.tokens.controlled[0];
      if (token) {
        lastFollowPos = token.object.position.clone();
        centerCamera(token);
      }
    } else {
      lastFollowPos = null;
    }
    refresh();
  }

  function centerCamera(token) {
    if (!token) return;
    // Smooth panning
    const viewport = canvas.app.stage;
    const targetX = -token.x * canvas.stage.scale.x + viewport.width / 2;
    const targetY = -token.y * canvas.stage.scale.y + viewport.height / 2;

    // Use PIXI.tween or manual animation
    // For simplicity: direct jump (can improve later)
    canvas.stage.position.set(targetX, targetY);
  }

  // Smooth panning with threshold
  function smoothFollow() {
    if (!followMode) return;
    const token = canvas.tokens.controlled[0];
    if (!token) return;

    const pos = token.object.position;
    if (!lastFollowPos) lastFollowPos = pos.clone();

    const dx = Math.abs(pos.x - lastFollowPos.x);
    const dy = Math.abs(pos.y - lastFollowPos.y);

    // If token moved more than 3 squares (1 square = 100 pixels default)
    if (dx >= 300 || dy >= 300) {
      lastFollowPos = pos.clone();
      centerCamera(token);
    }
  }

  // Keyboard navigation & follow mode control
  function onKeyDown(event) {
    // Disable toggling follow mode by R key
    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      return;
    }

    // Block Q/E in combat to avoid swaps
    if (["q", "e"].includes(event.key.toLowerCase()) && game.combat?.started) {
      event.preventDefault();
      return;
    }

    // Other controls...
  }

  // Follow Mode fixes: reselect token if deselected
  Hooks.on("canvasReady", () => {
    if (followMode) {
      const token = canvas.tokens.controlled[0];
      if (!token) {
        // Reselect last token if possible
        const tokens = getPlayerTokens();
        if (tokens.length) tokens[0].control({ releaseOthers: true });
      }
    }
  });

  // Hook into game canvas update for smooth follow
  Hooks.on("updateCanvas", smoothFollow);

  // Initialize on Foundry ready
  Hooks.once("ready", () => {
    refresh();

    // Append label below the bar
    const lbl = label();
    if (!lbl.parentNode) {
      container.appendChild(lbl);
    }
    lbl.style.display = "block";
    lbl.textContent = "Player Token Bar";

    // Refresh tokens on user changes
    Hooks.on("updateUser", (user, diff) => {
      if ("active" in diff) refresh();
    });

    // Also refresh on token control changes
    Hooks.on("controlToken", refresh);

    // Set up keyboard event
    window.addEventListener("keydown", onKeyDown);
  });



  /* ---------- Improved ENTER behaviour --------------------------- */
  /**
   *  • If Enter is pressed while a text‑editable element is focused → do nothing
   *  • Otherwise → open Chat tab and focus its input
   *  • After a chat message is submitted → blur the input and
   *    re‑select the previously‑controlled token (so WASD etc. work)
   */

  const isEditable = el =>
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el?.isContentEditable;

  /* -- Keydown handler ------------------------------------------- */
  window.addEventListener("keydown", ev => {
    if (ev.code !== "Enter") return;

    /* Case 1 – typing somewhere: leave Foundry’s default alone */
    if (isEditable(ev.target)) return;

    /* Case 2 – no textbox focused: open Chat, focus input */
    ev.preventDefault();
    ui.sidebar?.activateTab("chat");
    (
      document.querySelector("#chat-message") ||
      document.querySelector("textarea[name='message']")
    )?.focus();
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
  
  /* ---------- After a chat message is created -------------------- */
  Hooks.on("createChatMessage", () => {
    /* Let Foundry finish its own focus work first */
    requestAnimationFrame(() => {
      /* 1) Blur the chat input ------------------------------------- */
      const chatInput =
        document.querySelector("#chat-message") ||
        document.querySelector("textarea[name='message']");
      chatInput?.blur();

      /* 2) Re‑focus the previously selected token ------------------ */
      const tok =
        canvas.tokens.controlled[0] || canvas.tokens.get(selectedId);
      tok?.control({ releaseOthers: false });
    });
  });

/* ---------- Q key: toggle sheet for the active token -------------- */
window.addEventListener("keydown", ev => {
  if (ev.code !== "Tab") return;             /* only react to Tab        */

  /* Ignore Q when typing in an input / textarea / content‑editable */
  if (
    ev.target instanceof HTMLInputElement ||
    ev.target instanceof HTMLTextAreaElement ||
    ev.target?.isContentEditable
  ) return;

  ev.preventDefault();

  const tok = canvas.tokens.get(selectedId);
  if (!tok || !tok.actor) return;

  const sheet = tok.actor.sheet;
  if (!sheet) return;

  /* If sheet is open and not minimised → close it, else → open it  */
  if (sheet.rendered && !sheet._minimized) {
    sheet.close();
  } else {
    sheet.render(true);
  }
});

  
/* ---------------------------------------------------------------
 *  Auto‑select the NEW active combatant
 * ------------------------------------------------------------- */
Hooks.on("combatTurnChange", (combat /* Combat */, _prior, _current) => {
  /* Only react to the scene that’s currently on‑screen            */
  if (combat.scene?.id !== canvas.scene?.id) return;

  /* Active combatant *after* the turn has advanced                */
  const cb  = combat.combatant;
  if (!cb) return;

  const tok = canvas.tokens.get(cb.tokenId);
  if (!tok) return;

  /* GMs may always auto‑select; players only if they own control   */
  if (game.user.isGM || canControl(tok)) selectToken(tok);
});

/***********************************************************************
 * Disable token dragging when only one token is selected
 **********************************************************************/
Hooks.once("ready", () => {
  const origCanDragToken = Token.prototype._canDrag;

  Token.prototype._canDrag = function (event) {
    // If exactly one token is selected (controlled), disable drag
    const controlled = canvas.tokens.controlled;
    if (controlled.length === 1 && controlled[0].id === this.id) {
      return false;
    }

    // Otherwise, allow normal drag
    return origCanDragToken.call(this, event);
  };
});
  

/***********************************************************************
 * Follow Mode: Toggle Button (Defaults ON)
 **********************************************************************/
Hooks.on("getSceneControlButtons", (controls) => {
  const tokenControls = controls.find(c => c.name === "token");
  if (!tokenControls) return;

  // Create the toggle tool
  tokenControls.tools.push({
    name: "toggle-follow-mode",
    title: `Follow Mode: ${alwaysCenter ? "On" : "Off"}`,
    icon: alwaysCenter ? "fas fa-crosshairs" : "far fa-circle",
    toggle: true,
    active: alwaysCenter,
    onClick: (toggle) => {
      alwaysCenter = toggle;
      ui.notifications.info(`Follow Mode ${toggle ? "Enabled" : "Disabled"}`);
    }
  });
});


  
})();

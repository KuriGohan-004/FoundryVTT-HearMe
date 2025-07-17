/***********************************************************************
 * Player Token Bar  – rotated fading name aligned to sidebar
 *  • v2 – user‑owned only, GM omnibus view, half‑sized bar
 **********************************************************************/
(() => {
  const BAR_ID    = "player-token-bar";
  const LABEL_ID  = "player-token-bar-label";
  const CENTER_ID = "player-token-bar-center-label";
  const MOVE_THRESHOLD = 3;
  const PAN_DURATION = 500;

  const CSS = `
    #${BAR_ID} {
      position: fixed; bottom: 0; left: 25%; width: 50%; height: 84px;
      padding: 6px 10px; display: flex; align-items: center; justify-content: center;
      gap: 10px; overflow: hidden; background: none; border: none;
      z-index: 20; pointer-events: auto; transition: opacity .25s ease;
    }
    #${BAR_ID} img {
      width: 64px; height: 64px; object-fit: cover; border-radius: 8px;
      border: 2px solid #fff; flex: 0 0 auto; cursor: pointer;
      transition: transform .15s ease;
    }
    #${BAR_ID} img:hover               { transform: scale(1.20); z-index: 1; }
    #${BAR_ID} img.selected-token,
    #${BAR_ID} img.selected-token:hover { transform: scale(1.25); z-index: 2; }
    #${LABEL_ID} {
      position: fixed; bottom: 90px; left: 25%; width: 50%;
      text-align: center; font-size: 16px; font-weight: bold; color: #fff;
      text-shadow: 0 0 4px #000; pointer-events: none; z-index: 21;
      height: 24px; line-height: 24px; user-select: none;
    }
    @keyframes ptbPulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
    #${CENTER_ID} {
      position: fixed; font-size: 48px; font-weight: bold; font-style: italic;
      color: #fff; text-shadow: 0 0 8px #000; pointer-events: none; z-index: 40;
      user-select: none; animation: ptbPulse 4s infinite;
      transform: rotate(-90deg) translateY(100%);
      transform-origin: bottom left;
      white-space: nowrap; overflow: visible; left: 0;
    }`;

  document.head.appendChild(Object.assign(document.createElement("style"), { textContent: CSS }));

  const el = (id, tag = "div") => document.getElementById(id) ?? document.body.appendChild(Object.assign(document.createElement(tag), { id }));
  const bar = () => el(BAR_ID);
  const label = () => el(LABEL_ID);
  const center = () => el(CENTER_ID);

  let selectedId = null;
  let alwaysCenter = false;
  let orderedIds = [];
  let ownedIds = [];
  let moveCounter = 0;

  const combatRunning = () => !!(game.combat?.started && game.combat.scene?.id === canvas.scene?.id);
  const canControl = t => t.isOwner || t.actor?.isOwner;
  const imgSrc = t => t.document.texture?.src || t.actor?.prototypeToken?.texture?.src || t.actor?.img || "icons/svg/mystery-man.svg";
  const setSmall = (txt, b = false) => { label().textContent = txt ? (b ? `[[ ${txt} ]]` : txt) : ""; };

  function positionCenter() {
    const sb = document.getElementById("sidebar");
    if (!sb) return;
    const c = center();
    const r = sb.getBoundingClientRect();
    c.style.left = `${r.left - 4}px`;
    c.style.top = `${r.top + r.height}px`;
  }
  window.addEventListener("resize", positionCenter);
  const showCenter = txt => { center().textContent = txt; positionCenter(); };

  function displayTokens() {
    if (game.user.isGM) {
      const unlinked = canvas.tokens.placeables.filter(t => !t.document.actorLink);
      const linkedTokens = canvas.tokens.placeables.filter(t => {
        if (!t.document.actorLink) return false;
        const owners = game.users.players.filter(u => t.actor?.testUserPermission(u, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER));
        return owners.length === 0 || owners.every(u => !u.active);
      });
      return [...new Set([...unlinked, ...linkedTokens])];
    }
    return canvas.tokens.placeables.filter(t => canControl(t));
  }

  function refresh() {
    const b = bar();
    if (combatRunning()) {
      b.style.opacity = "0";
      b.style.pointerEvents = "none";
      setSmall("");
      return;
    }
    b.style.opacity = "1";
    b.style.pointerEvents = "auto";
    b.replaceChildren();

    const allToks = displayTokens();
    if (!allToks.length) {
      setSmall("");
      return;
    }
    if (!selectedId || !allToks.some(t => t.id === selectedId)) selectedId = allToks[0].id;

    orderedIds = allToks.map(t => t.id);
    ownedIds = allToks.filter(canControl).map(t => t.id);

    const n = orderedIds.length;
    const selIdx = orderedIds.indexOf(selectedId);

    const leftCount = (n >= 3) ? 1 : 0;
    const rightCount = (n - 1) - leftCount;
    const wrap = idx => (idx + n) % n;

    const leftTokens = [];
    const rightTokens = [];

    for (let i = 1; i <= leftCount; i++) leftTokens.push(canvas.tokens.get(orderedIds[wrap(selIdx - i)]));
    for (let i = 1; i <= rightCount; i++) rightTokens.push(canvas.tokens.get(orderedIds[wrap(selIdx + i)]));

    function makeImg(token) {
      const img = document.createElement("img");
      img.src = imgSrc(token);
      img.alt = token.name;
      if (token.id === selectedId) img.classList.add("selected-token");
      img.onclick = () => {
        closeAllSheets();
        temporarilyDisableFollow(() => selectToken(token));
      };
      img.onmouseenter = () => setSmall(token.name, alwaysCenter && token.id === selectedId);
      img.onmouseleave = () => {
        const cur = canvas.tokens.get(selectedId);
        setSmall(cur?.name ?? "", alwaysCenter);
      };
      return img;
    }

    const leftWrap = Object.assign(document.createElement("div"), { style: "display:flex; gap:10px; flex-direction:row-reverse;" });
    const rightWrap = Object.assign(document.createElement("div"), { style: "display:flex; gap:10px;" });

    leftTokens.forEach(tok => leftWrap.appendChild(makeImg(tok)));
    const centreImg = makeImg(canvas.tokens.get(selectedId));
    rightTokens.forEach(tok => rightWrap.appendChild(makeImg(tok)));

    b.appendChild(leftWrap);
    b.appendChild(centreImg);
    b.appendChild(rightWrap);

    const curTok = canvas.tokens.get(selectedId);
    const nm = curTok?.name ?? "";
    setSmall(nm, alwaysCenter);
    showCenter(nm);
  }

  function selectToken(t) {
    selectedId = t.id;
    if (canControl(t)) {
      canvas.tokens.releaseAll();
      t.control({ releaseOthers: true });
      game.user.updateTokenTargets([t]);
    } else {
      t.setTarget(true, { user: game.user, releaseOthers: true });
    }
    canvas.animatePan({ x: t.center.x, y: t.center.y, scale: canvas.stage.scale.x, duration: PAN_DURATION });
    moveCounter = 0;
    showCenter(t.name);
    refresh();
  }

  function toggleFollow() {
    if (!selectedId) return;
    alwaysCenter = !alwaysCenter;
    const t = canvas.tokens.get(selectedId);
    if (t && alwaysCenter) canvas.animatePan({ x: t.center.x, y: t.center.y, scale: canvas.stage.scale.x, duration: PAN_DURATION });
    setSmall(t?.name ?? "", alwaysCenter);
  }

  function temporarilyDisableFollow(callback) {
    const prev = alwaysCenter;
    alwaysCenter = false;
    callback();
    alwaysCenter = prev;
  }

  Hooks.on("updateToken", doc => {
    if (alwaysCenter && doc.id === selectedId) {
      moveCounter++;
      if (moveCounter >= MOVE_THRESHOLD) {
        moveCounter = 0;
        const t = canvas.tokens.get(doc.id);
        if (t) canvas.animatePan({ x: t.center.x, y: t.center.y, scale: canvas.stage.scale.x, duration: PAN_DURATION });
      }
    }
  });

  Hooks.on("controlToken", (token, controlled, options) => {
    if (controlled) {
      temporarilyDisableFollow(() => {
        selectedId = token.id;
        if (canControl(token)) {
          canvas.tokens.releaseAll();
          token.control({ releaseOthers: true });
          game.user.updateTokenTargets([token]);
        }
      });
    }
  });

  function cycleOwned(o) {
    if (!ownedIds.length) return;
    let idx = ownedIds.indexOf(selectedId); if (idx === -1) idx = 0;
    const next = canvas.tokens.get(ownedIds[(idx + o + ownedIds.length) % ownedIds.length]);
    if (next) {
      closeAllSheets();
      temporarilyDisableFollow(() => selectToken(next));
    }
  }

  function closeAllSheets() {
    for (const app of Object.values(ui.windows)) {
      if (app instanceof ActorSheet) app.close();
    }
  }

  window.addEventListener("keydown", ev => {
    if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement || ev.target.isContentEditable) return;

    if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(ev.code)) {
      if (canvas.tokens.controlled.length === 0) {
        let t = selectedId ? canvas.tokens.get(selectedId) : null;
        if (!t || !canControl(t)) {
          const fallback = displayTokens().find(t => canControl(t));
          if (fallback) {
            selectedId = fallback.id;
            t = fallback;
          }
        }
        if (t && canControl(t)) {
          canvas.tokens.releaseAll();
          t.control({ releaseOthers: true });
          game.user.updateTokenTargets([t]);
        }
      }
      return;
    }

    switch (ev.code) {
      case "KeyE": ev.preventDefault(); if (!combatRunning()) cycleOwned(+1); break;
      case "KeyQ": ev.preventDefault(); if (!combatRunning()) cycleOwned(-1); break;
      case "Space": {
        if (combatRunning()) {
          const cb = game.combat.combatant; const tok = cb ? canvas.tokens.get(cb.tokenId) : null;
          if (tok && (game.user.isGM || tok.isOwner)) {
            ev.preventDefault();
            temporarilyDisableFollow(() => game.combat.nextTurn());
          }
        } else {
          ev.preventDefault();
          game.togglePause();
        }
        break;
      }
    }
  });

  Hooks.once("canvasReady", () => {
    refresh();
    const all = displayTokens();
    if (all.length && !selectedId) {
      selectedId = all.find(t => canControl(t))?.id ?? all[0].id;
    }
    const t = canvas.tokens.get(selectedId);
    if (t && canControl(t)) {
      canvas.tokens.releaseAll();
      t.control({ releaseOthers: true });
      game.user.updateTokenTargets([t]);
    }
    alwaysCenter = true;
    if (t) canvas.animatePan({ x: t.center.x, y: t.center.y, scale: canvas.stage.scale.x, duration: PAN_DURATION });
    setSmall(t?.name ?? "", alwaysCenter);
  });

  Hooks.on("createToken", refresh);
  Hooks.on("updateToken", refresh);
  Hooks.on("deleteToken", refresh);
  Hooks.on("updateActor", refresh);
  Hooks.on("deleteCombat", refresh);



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
 * Follow Mode: Smart Clicks & Disable Dragging
 **********************************************************************/
Hooks.once("ready", () => {
  // Enhanced click control behavior
  Hooks.on("controlToken", (token, controlled) => {
    if (!controlled) return;

    const isBarToken = ownedIds.includes(token.id);
    const isGM = game.user.isGM;
    const isOwner = token.isOwner;

    // Follow Mode behavior
    if (alwaysCenter) {
      if (token.id === selectedId) return false; // Same token: do nothing

      if (isGM) {
        // GM in follow mode → target clicked token
        token.setTarget(true, { user: game.user, releaseOthers: true });
      } else if (isOwner) {
        // Player clicks owned token → switch to it
        alwaysCenter = false;  // Temporarily disable Follow Mode
        selectedId = token.id;
        if (canControl(token)) token.control({ releaseOthers: true });
        canvas.animatePan(token.center);
        refresh();

        // Re-enable Follow Mode
        setTimeout(() => {
          alwaysCenter = true;
          setSmall(token.name ?? "", true);
        }, 200);
      } else {
        // Player clicks unowned token → target it only
        game.user.targets.clear(); // Clear all other targets
        token.setTarget(true, { user: game.user, releaseOthers: false });
      }

      // Prevent Foundry's default control behavior
      setTimeout(() => token.release(), 0);
      return false;
    }

    // Follow Mode OFF: selecting a bar token updates selection
    if (isBarToken) {
      selectedId = token.id;
      refresh();
    }
  });

  // Disable drag interaction in Follow Mode
  const origCanDragToken = Token.prototype._canDrag;
  Token.prototype._canDrag = function (event) {
    if (alwaysCenter && this.id === selectedId) return false;
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

(() => {
  const BAR_ID = "player-token-bar";
  const LABEL_ID = "player-token-bar-label";
  const CENTER_ID = "player-token-bar-center-label";

  let alwaysCenter = false;

  Hooks.on("getSceneControlButtons", (controls) => {
    const tokenControls = controls.find(c => c.name === "token");
    if (!tokenControls) return;

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

  const CSS = `
    #${BAR_ID}{ position:fixed; bottom:0; left:25%; width:50%; height:84px;
      padding:6px 10px; display:flex; align-items:center; justify-content:center;
      gap:10px; overflow:hidden; background:none; border:none;
      z-index:20; pointer-events:auto; transition:opacity .25s ease; }
    #${BAR_ID} img{
      width:64px; height:64px; object-fit:cover; border-radius:8px;
      border:2px solid #fff; flex:0 0 auto; cursor:pointer;
      transition:transform .15s ease;
    }
    #${BAR_ID} img:hover               {transform:scale(1.20); z-index:1;}
    #${BAR_ID} img.selected-token,
    #${BAR_ID} img.selected-token:hover{transform:scale(1.25); z-index:2;}
    #${LABEL_ID}{ position:fixed; bottom:90px; left:25%; width:50%;
      text-align:center; font-size:16px; font-weight:bold; color:#fff;
      text-shadow:0 0 4px #000; pointer-events:none; z-index:21;
      height:24px; line-height:24px; user-select:none; }
    @keyframes ptbPulse{0%,100%{opacity:1;}50%{opacity:.5;}}
    #${CENTER_ID}{
      position:fixed; font-size:48px; font-weight:bold; font-style:italic;
      color:#fff; text-shadow:0 0 8px #000; pointer-events:none; z-index:40;
      user-select:none; animation:ptbPulse 4s infinite;
      transform:rotate(-90deg) translateY(100%);
      transform-origin:bottom left;
      white-space:nowrap; overflow:visible; left:0;
      padding-left: 75%; padding-bottom: 15%;
    }`;

  document.head.appendChild(Object.assign(document.createElement("style"), { textContent: CSS }));

  const el = (id, tag = "div") => {
    let existing = document.getElementById(id);
    if (existing) return existing;
    const created = document.createElement(tag);
    created.id = id;
    document.body.appendChild(created);
    return created;
  };

  const bar = () => el(BAR_ID);
  const label = () => el(LABEL_ID);
  const center = () => el(CENTER_ID);

  let selectedId = null;
  let orderedIds = [];
  let ownedIds = [];
  let lastFollowedPos = null;
  let ignoreNextControl = false;

  let lastTokenIdsHash = "";
  let lastSelectedId = null;

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

  function hashTokenIds(tokens) {
    return tokens.map(t => t.id).sort().join(",");
  }

  function panSmoothlyToToken(token) {
    canvas.animatePan({ x: token.center.x, y: token.center.y, scale: canvas.stage.scale.x, duration: 500 });
  }

  function rebuildTokenBarUI(allToks) {
    const b = bar();
    b.replaceChildren();

    orderedIds = allToks.map(t => t.id);
    ownedIds = allToks.filter(canControl).map(t => t.id);
    window.playerTokenBar.orderedIds = orderedIds;

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
  selectToken(token);
};

      img.onmouseenter = () => setSmall(token.name, false);
      img.onmouseleave = () => {
        const cur = canvas.tokens.get(selectedId);
        setSmall(cur?.name ?? "", false);
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
    setSmall(nm, false);
    showCenter(nm);
  }

  let refreshScheduled = false;
  function refresh() {
    if (refreshScheduled) return;
    refreshScheduled = true;
    setTimeout(() => {
      refreshScheduled = false;

      const allToks = displayTokens();
      if (!allToks.length) {
        setSmall("");
        return;
      }

      if (!selectedId || !allToks.some(t => t.id === selectedId)) {
        selectedId = allToks[0].id;
        const t = canvas.tokens.get(selectedId);
        if (t && canControl(t)) {
          ignoreNextControl = true;
          t.control({ releaseOthers: true });
          lastFollowedPos = { x: t.center.x, y: t.center.y };
        }
      }

      const currentIdsHash = hashTokenIds(allToks);
      if (currentIdsHash !== lastTokenIdsHash || selectedId !== lastSelectedId) {
        rebuildTokenBarUI(allToks);
        lastTokenIdsHash = currentIdsHash;
        lastSelectedId = selectedId;
      } else {
        const curTok = canvas.tokens.get(selectedId);
        const nm = curTok?.name ?? "";
        setSmall(nm, false);
        showCenter(nm);
      }
    }, 50);
  }

  function selectToken(t) {
    if (!t) return;

    for (const app of Object.values(ui.windows)) {
      if (app?.object instanceof Actor) {
        app.close();
      }
    }

    selectedId = t.id;
    if (canControl(t)) {
      ignoreNextControl = true;
      t.control({ releaseOthers: true });
    }
    lastFollowedPos = { x: t.center.x, y: t.center.y };
    panSmoothlyToToken(t);

    showCenter(t.name);
    refresh();
  }

  function cycleSelection(offset) {
    if (!orderedIds.length) return;
    let i = orderedIds.indexOf(selectedId);
    if (i < 0) i = 0;
    i = (i + offset + orderedIds.length) % orderedIds.length;
    const t = canvas.tokens.get(orderedIds[i]);
    if (t) selectToken(t);
  }

  function setFollowMode(on) {
    alwaysCenter = on;
    if (on) {
      const t = canvas.tokens.get(selectedId);
      if (t) {
        lastFollowedPos = { x: t.center.x, y: t.center.y };
        panSmoothlyToToken(t);
      }
    }
  }

  function isFollowMode() {
    return alwaysCenter;
  }

  Hooks.on("updateToken", refresh);
  Hooks.on("createToken", refresh);
  Hooks.on("deleteToken", refresh);
  Hooks.on("updateScene", refresh);
  Hooks.on("updateActor", refresh);
  Hooks.on("updateUser", refresh);

  Hooks.on("updateToken", (scene, tokenDoc, diff, options, userId) => {
    if (!selectedId) return;
    if (tokenDoc.id !== selectedId) return;

    const t = canvas.tokens.get(tokenDoc.id);
    if (!t) return;

    if (!alwaysCenter) return;

    const dist = lastFollowedPos
      ? Math.hypot(t.center.x - lastFollowedPos.x, t.center.y - lastFollowedPos.y)
      : 9999;

    if (dist > canvas.grid.size * 3) {
      lastFollowedPos = { x: t.center.x, y: t.center.y };
      panSmoothlyToToken(t);
    }
  });

Hooks.on("controlToken", (token, controlled) => {
  if (ignoreNextControl) {
    ignoreNextControl = false;
    return;
  }
  
  if (!canControl(token)) return;

  if (alwaysCenter) {
    // In Follow Mode: toggle target on clicked token
    if (controlled) {
      token.setTarget(!token.isTargeted, { releaseOthers: false });
    } else {
      token.setTarget(false, { releaseOthers: false });
    }
    // Do NOT change selection on map token clicks in follow mode
  } else {
    // Follow mode OFF: default behavior - select token normally
    if (controlled && token.id !== selectedId) {
      selectToken(token);
    }
  }

  refresh();
});


  window.addEventListener("keydown", e => {
    if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
    if (e.key === "q" || e.key === "Q") {
      e.preventDefault();
      cycleSelection(-1);
    } else if (e.key === "e" || e.key === "E") {
      e.preventDefault();
      cycleSelection(1);
    }
  });

  Hooks.once("canvasReady", () => {
    bar().style.opacity = "1";
    bar().style.pointerEvents = "auto";
    label();
    center();
    positionCenter();
    refresh();

    setTimeout(() => {
      const allToks = displayTokens();
      if (allToks.length) {
        const firstToken = allToks[0];
        selectToken(firstToken);
      }

      setFollowMode(true);
      setInterval(() => {
        if (!alwaysCenter) return;
        const t = canvas.tokens.get(selectedId);
        if (!t) return;
        const dist = lastFollowedPos
          ? Math.hypot(t.center.x - lastFollowedPos.x, t.center.y - lastFollowedPos.y)
          : 9999;
        if (dist > canvas.grid.size * 3) {
          lastFollowedPos = { x: t.center.x, y: t.center.y };
          panSmoothlyToToken(t);
        }
      }, 200);
    }, 1000);
  });

  window.playerTokenBar = {
    selectToken,
    cycleSelection,
    refresh,
    orderedIds,
    selectedId,
    lastFollowedPos,
    setFollowMode,
    isFollowMode
  };


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
 * Follow Mode: Smart Target Toggle on Click (like pressing T)
 **********************************************************************/
Hooks.once("ready", () => {
  // Patch Token layer click handling
  const origHandleClickLeft = Token.prototype._onClickLeft;

  Token.prototype._onClickLeft = function (event) {
    if (!isFollowMode()) {
      // If follow mode is off, do default behavior
      return origHandleClickLeft.call(this, event);
    }

    // Prevent default click behavior (selection)
    event.stopPropagation();

    // Toggle target state like pressing 'T'
    const alreadyTargeted = this.isTargeted;
    const tokenIds = alreadyTargeted
      ? game.user.targets.filter(t => t.id !== this.id).map(t => t.id)
      : [...game.user.targets.map(t => t.id), this.id];

    game.user.updateTokenTargets(tokenIds);

    return false;
  };
});



  
  
})();

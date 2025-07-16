/***********************************************************************
 * Player Token Bar – hot‑keys:
 *   1 ⇽ previous owned | refocus 2 | next owned ⇾ 3
 **********************************************************************/
(() => {
  const BAR_ID   = "player-token-bar";
  const LABEL_ID = "player-token-bar-label";

  /* ---------- CSS (injected) ---------- */
  const CSS = `
    #${BAR_ID}{
      position:fixed; bottom:0; left:15%; width:50%; height:84px;
      padding:6px 10px; display:flex; align-items:center; justify-content:center;
      gap:10px; overflow-x:auto; overflow-y:hidden;
      background:rgba(0,0,0,.7); border-top:2px solid var(--color-border-light-primary);
      transition:opacity .25s ease; z-index:20; pointer-events:auto;
    }
    #${BAR_ID}::-webkit-scrollbar{height:8px;}
    #${BAR_ID}::-webkit-scrollbar-thumb{background:#666;border-radius:4px;}

    #${BAR_ID} img{
      width:64px; height:64px; object-fit:cover; border-radius:8px;
      border:2px solid #fff; flex:0 0 auto; cursor:pointer;
      transition:transform .15s ease;
    }
    #${BAR_ID} img:hover           {transform:scale(1.3); z-index:1;}
    #${BAR_ID} img.selected-token  {transform:scale(1.3); z-index:2;}

    #${LABEL_ID}{
      position:fixed; bottom:90px; left:15%; width:50%;
      text-align:center; font-size:16px; font-weight:bold; color:#fff;
      text-shadow:0 0 4px #000; pointer-events:none; z-index:21;
      height:24px; line-height:24px; user-select:none;
    }`;
  document.head.appendChild(Object.assign(document.createElement("style"), { textContent: CSS }));

  /* ---------- DOM helpers ---------- */
  const bar   = () => document.getElementById(BAR_ID)   ?? document.body.appendChild(Object.assign(document.createElement("div"), { id: BAR_ID }));
  const label = () => document.getElementById(LABEL_ID) ?? document.body.appendChild(Object.assign(document.createElement("div"), { id: LABEL_ID }));

  /* ---------- State ---------- */
  let lastSelectedTokenId = null;   // token id to keep big
  let orderedTokenIds     = [];     // all player‑owned tokens (for display order)
  let ownedTokenIds       = [];     // only tokens current user can control (for cycling)

  /* ---------- Utility ---------- */
  const combatRunning = () =>
    !!(game.combat && game.combat.started && game.combat.scene?.id === canvas.scene?.id);

  /** All tokens which *any* player owns (display) */
  const playerOwnedTokens = () => {
    const players = game.users.players;
    return canvas.tokens.placeables.filter(tok => {
      if (!tok.actor) return false;
      const tokOwn = tok.document?.ownership ?? tok.ownership ?? {};
      const actOwn = tok.actor.ownership ?? {};
      const hasTok = Object.entries(tokOwn).some(([u, l]) => players.some(p => p.id === u) &&
        l >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
      const hasAct = Object.entries(actOwn).some(([u, l]) => players.some(p => p.id === u) &&
        l >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
      return hasTok || hasAct;
    });
  };

  /** Can current user control this token? */
  const canControl = tok => tok.isOwner || tok.actor?.isOwner;

  const imgSrc = tok =>
    tok.document.texture?.src ||
    tok.actor?.prototypeToken?.texture?.src ||
    tok.actor?.img ||
    "icons/svg/mystery-man.svg";

  /* ---------- Build / refresh bar ---------- */
  function refresh() {
    const b   = bar();
    const lbl = label();

    /* Hide bar during combat */
    if (combatRunning()) {
      b.style.opacity = "0"; b.style.pointerEvents = "none";
      lbl.style.opacity = "0"; lbl.textContent = "";
      b.replaceChildren(); orderedTokenIds = []; ownedTokenIds = [];
      return;
    }

    b.style.opacity = "1"; b.style.pointerEvents = "auto";
    lbl.style.opacity = "1"; lbl.textContent = "";
    b.replaceChildren();

    orderedTokenIds = [];
    ownedTokenIds   = [];

    for (const tok of playerOwnedTokens()) {
      orderedTokenIds.push(tok.id);
      if (canControl(tok)) ownedTokenIds.push(tok.id);

      const img = document.createElement("img");
      img.src = imgSrc(tok);
      img.alt = tok.name;

      if (tok.id === lastSelectedTokenId) img.classList.add("selected-token");

      /* Click → select */
      img.addEventListener("click", () => selectToken(tok));

      /* Right‑click → sheet */
      img.addEventListener("contextmenu", e => {
        e.preventDefault();
        tok.actor?.sheet?.render(true);
      });

      /* Hover label */
      img.addEventListener("mouseenter", () => { lbl.textContent = tok.name; });
      img.addEventListener("mouseleave", () => { lbl.textContent = "";        });

      b.appendChild(img);
    }
  }

  /* ---------- Select token & pan ---------- */
  function selectToken(tok) {
    canvas.animatePan(tok.center);
    if (canControl(tok)) tok.control({ releaseOthers: true });
    lastSelectedTokenId = tok.id;
    refresh();                                  // update highlight
  }

  /* ---------- Keyboard handling ---------- */
  function cycleOwned(offset) {
    if (!ownedTokenIds.length) return;

    // If current selection isn't owned or null, start from first owned
    let idx = ownedTokenIds.indexOf(lastSelectedTokenId);
    if (idx === -1) idx = 0;

    const nextIdx = (idx + offset + ownedTokenIds.length) % ownedTokenIds.length;
    const nextTok = canvas.tokens.get(ownedTokenIds[nextIdx]);
    if (nextTok) selectToken(nextTok);
  }

  window.addEventListener("keydown", ev => {
    // Ignore if typing in input/textarea/contentEditable
    if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement || ev.target.isContentEditable) return;

    switch (ev.code) {
      case "Digit3":            // Next owned
        ev.preventDefault();
        cycleOwned(+1);
        break;
      case "Digit1":            // Previous owned
        ev.preventDefault();
        cycleOwned(-1);
        break;
      case "Digit2":            // Refocus on current
        if (lastSelectedTokenId) {
          ev.preventDefault();
          const tok = canvas.tokens.get(lastSelectedTokenId);
          if (tok) canvas.animatePan(tok.center);
        }
        break;
    }
  });

  /* ---------- Hooks ---------- */
  Hooks.once("ready", refresh);
  Hooks.on("canvasReady",  refresh);
  Hooks.on("createToken",  refresh);
  Hooks.on("updateToken",  refresh);
  Hooks.on("deleteToken",  refresh);
  Hooks.on("updateActor",  refresh);
  Hooks.on("updateCombat", refresh);
  Hooks.on("deleteCombat", refresh);
  Hooks.on("controlToken", (tok, controlled) => {
    if (controlled && canControl(tok)) {
      lastSelectedTokenId = tok.id;
      refresh();
    }
  });
})();

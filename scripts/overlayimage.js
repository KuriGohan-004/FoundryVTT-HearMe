(() => {
  const BAR_ID = "player-token-bar";

  /* Inject CSS dynamically */
  const CSS = `
    #${BAR_ID} {
      position: fixed;
      bottom: 0;
      left: 15%;                   /* (40% center - 25% width) = 15% */
      width: 50%;
      height: 84px;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      justify-content: center;     /* center contents horizontally */
      gap: 10px;
      overflow-x: auto;
      background: rgba(0, 0, 0, 0.7);
      border-top: 2px solid var(--color-border-light-primary);
      transition: opacity 0.25s ease;
      z-index: 20;                 /* behind sidebar (z≈30) */
      pointer-events: auto;
    }
    #${BAR_ID} img {
      width: 64px;
      height: 64px;
      object-fit: cover;
      border-radius: 8px;
      border: 2px solid #fff;
      flex: 0 0 auto;
      cursor: pointer;
    }`;
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  function getBar() {
    let bar = document.getElementById(BAR_ID);
    if (!bar) {
      bar = document.createElement("div");
      bar.id = BAR_ID;
      document.body.appendChild(bar);
    }
    return bar;
  }

  function combatRunning() {
    const c = game.combat;
    return !!(c && c.started && c.scene?.id === canvas.scene?.id);
  }

  function playerOwnedTokens() {
    const players = game.users.players;

    return canvas.tokens.placeables.filter(tok => {
      if (!tok.actor) return false;

      const tokOwn = tok.document?.ownership ?? tok.ownership ?? {};
      const actOwn = tok.actor?.ownership ?? {};
      const hasTok = Object.entries(tokOwn).some(([u, l]) =>
        players.some(p => p.id === u) &&
        l >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
      );
      const hasAct = Object.entries(actOwn).some(([u, l]) =>
        players.some(p => p.id === u) &&
        l >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
      );
      return hasTok || hasAct;
    });
  }

  function getImageForToken(tok) {
    const tokImg = tok.document.texture?.src;
    const protoImg = tok.actor?.prototypeToken?.texture?.src;
    const actorImg = tok.actor?.img;
    return tokImg || protoImg || actorImg || "icons/svg/mystery-man.svg";
  }

  function refresh() {
    const bar = getBar();

    if (combatRunning()) {
      bar.style.opacity = "0";
      bar.style.pointerEvents = "none";
      bar.replaceChildren();
      return;
    }

    bar.style.opacity = "1";
    bar.style.pointerEvents = "auto";
    bar.replaceChildren();

    for (const tok of playerOwnedTokens()) {
      const img = document.createElement("img");
      img.src = getImageForToken(tok);
      img.title = tok.name;

      img.addEventListener("click", () => {
        canvas.animatePan(tok.center);

        if (tok.controlled || !tok.actor?.testUserPermission(game.user, "OWNER")) return;
        tok.control({ releaseOthers: true }); // Select it if allowed
      });

      img.addEventListener("contextmenu", ev => {
        ev.preventDefault();
        tok.actor?.sheet?.render(true);
      });

      bar.appendChild(img);
    }
  }

  Hooks.once("ready", refresh);
  Hooks.on("canvasReady", refresh);
  Hooks.on("createToken", refresh);
  Hooks.on("updateToken", refresh);
  Hooks.on("deleteToken", refresh);
  Hooks.on("updateActor", refresh);
  Hooks.on("updateCombat", refresh);
  Hooks.on("deleteCombat", refresh);
})();

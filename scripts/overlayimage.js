/***********************************************************************
 * Player Token Bar – with:
 * ✅ Hover name display above bar (token name)
 * ✅ No tooltip delay
 * ✅ No vertical scrollbar
 **********************************************************************/
(() => {
  const BAR_ID = "player-token-bar";
  const LABEL_ID = "player-token-bar-label";

  const CSS = `
    #${BAR_ID} {
      position: fixed;
      bottom: 0;
      left: 15%;
      width: 50%;
      height: 84px;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      overflow-x: auto;
      overflow-y: hidden;
      background: rgba(0, 0, 0, 0.7);
      border-top: 2px solid var(--color-border-light-primary);
      transition: opacity 0.25s ease;
      z-index: 20;
      pointer-events: auto;
      scrollbar-width: none; /* Firefox */
    }

    #${BAR_ID}::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Edge */
    }

    #${BAR_ID} img {
      width: 64px;
      height: 64px;
      object-fit: cover;
      border-radius: 8px;
      border: 2px solid #fff;
      flex: 0 0 auto;
      cursor: pointer;
    }

    #${LABEL_ID} {
      position: fixed;
      bottom: 90px;
      left: 15%;
      width: 50%;
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      color: white;
      text-shadow: 0 0 4px black;
      pointer-events: none;
      z-index: 21;
      height: 24px;
      line-height: 24px;
      user-select: none;
    }
  `;

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

  function getLabel() {
    let label = document.getElementById(LABEL_ID);
    if (!label) {
      label = document.createElement("div");
      label.id = LABEL_ID;
      label.textContent = "";
      document.body.appendChild(label);
    }
    return label;
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
    const label = getLabel();

    if (combatRunning()) {
      bar.style.opacity = "0";
      label.style.opacity = "0";
      bar.style.pointerEvents = "none";
      label.textContent = "";
      bar.replaceChildren();
      return;
    }

    bar.style.opacity = "1";
    label.style.opacity = "1";
    bar.style.pointerEvents = "auto";
    bar.replaceChildren();
    label.textContent = "";

    for (const tok of playerOwnedTokens()) {
      const img = document.createElement("img");
      img.src = getImageForToken(tok);
      img.alt = tok.name;

      img.addEventListener("click", () => {
        canvas.animatePan(tok.center);
        if (tok.actor?.testUserPermission(game.user, "OWNER")) {
          tok.control({ releaseOthers: true });
        }
      });

      img.addEventListener("contextmenu", ev => {
        ev.preventDefault();
        tok.actor?.sheet?.render(true);
      });

      img.addEventListener("mouseenter", () => {
        label.textContent = tok.name;
      });

      img.addEventListener("mouseleave", () => {
        label.textContent = "";
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

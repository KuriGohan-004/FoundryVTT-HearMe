/***********************************************************************
 * Player Token Bar – selected stays enlarged + hover effects + label
 **********************************************************************/
(() => {
  const BAR_ID   = "player-token-bar";
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
    }

    #${BAR_ID}::-webkit-scrollbar {
      height: 8px;
    }

    #${BAR_ID}::-webkit-scrollbar-thumb {
      background-color: #666;
      border-radius: 4px;
    }

    #${BAR_ID} img {
      width: 64px;
      height: 64px;
      object-fit: cover;
      border-radius: 8px;
      border: 2px solid #fff;
      flex: 0 0 auto;
      cursor: pointer;
      transition: transform 0.15s ease;
    }

    #${BAR_ID} img:hover {
      transform: scale(1.3);
      z-index: 1;
    }

    #${BAR_ID} img.selected-token {
      transform: scale(1.3);
      z-index: 2;
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

  const bar = () => document.getElementById(BAR_ID)
    ?? document.body.appendChild(Object.assign(document.createElement("div"), { id: BAR_ID }));
  const label = () => document.getElementById(LABEL_ID)
    ?? document.body.appendChild(Object.assign(document.createElement("div"), { id: LABEL_ID }));

  let lastSelectedTokenId = null;

  const combatRunning = () =>
    !!(game.combat && game.combat.started && game.combat.scene?.id === canvas.scene?.id);

  const playerOwnedTokens = () => {
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
  };

  const imgSrc = tok =>
    tok.document.texture?.src ||
    tok.actor?.prototypeToken?.texture?.src ||
    tok.actor?.img ||
    "icons/svg/mystery-man.svg";

  function refresh() {
    const b = bar();
    const lbl = label();

    if (combatRunning()) {
      b.style.opacity = "0";
      lbl.style.opacity = "0";
      b.style.pointerEvents = "none";
      lbl.textContent = "";
      b.replaceChildren();
      return;
    }

    b.style.opacity = "1";
    lbl.style.opacity = "1";
    b.style.pointerEvents = "auto";
    b.replaceChildren();
    lbl.textContent = "";

    for (const tok of playerOwnedTokens()) {
      const img = document.createElement("img");
      img.src = imgSrc(tok);
      img.alt = tok.name;

      if (tok.id === lastSelectedTokenId) {
        img.classList.add("selected-token");
      }

      img.addEventListener("click", () => {
        canvas.animatePan(tok.center);
        if (tok.actor?.testUserPermission(game.user, "OWNER")) {
          tok.control({ releaseOthers: true });
          lastSelectedTokenId = tok.id;
          refresh();
        }
      });

      img.addEventListener("contextmenu", ev => {
        ev.preventDefault();
        tok.actor?.sheet?.render(true);
      });

      img.addEventListener("mouseenter", () => {
        lbl.textContent = tok.name;
      });

      img.addEventListener("mouseleave", () => {
        lbl.textContent = "";
      });

      b.appendChild(img);
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
  Hooks.on("controlToken", (tok, controlled) => {
    if (controlled && tok.actor?.testUserPermission(game.user, "OWNER")) {
      lastSelectedTokenId = tok.id;
      refresh();
    }
  });
})();

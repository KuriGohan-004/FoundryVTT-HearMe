/***********************************************************************
 * Player‑Token‑Bar – single‑file edition
 * Shows portraits of every player‑owned token in the current scene.
 *  • Left‑click  ➜ pan camera to that token
 *  • Right‑click ➜ open the actor sheet
 *  • Auto‑hides while combat is active
 *  • Renders behind the sidebar/chat (low z‑index)
 **********************************************************************/
(() => {
  const BAR_ID = "player-token-bar";

  /* -------------------------------------------------------------
   * CSS – injected dynamically so no separate .css file required
   * ----------------------------------------------------------- */
  const CSS = `
    #${BAR_ID}{
      position: fixed; left:0; right:0; bottom:0; height:84px;
      padding:6px 10px; display:flex; align-items:center; gap:10px;
      overflow-x:auto; background:rgba(0,0,0,.7);
      border-top:2px solid var(--color-border-light-primary);
      transition:opacity .25s ease; z-index:20;
    }
    #${BAR_ID} img{
      width:64px; height:64px; object-fit:cover; border-radius:8px;
      border:2px solid #fff; flex:0 0 auto; cursor:pointer;
    }`;
  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  /* -------------------------------------------------------------
   * Bar creation & refresh
   * ----------------------------------------------------------- */
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

      // token-level permissions (FVTT v11+) fallback to actor perms
      const tokOwn   = tok.document?.ownership ?? tok.ownership ?? {};
      const actOwn   = tok.actor.ownership ?? {};
      const hasTok   = Object.entries(tokOwn).some(([u,l])  =>
          players.some(p => p.id === u) && l >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
      const hasAct   = Object.entries(actOwn).some(([u,l])  =>
          players.some(p => p.id === u) && l >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
      return hasTok || hasAct;
    });
  }

  function refresh() {
    const bar = getBar();

    /* Hide during combat */
    if (combatRunning()) {
      bar.style.opacity = "0";
      bar.style.pointerEvents = "none";
      bar.replaceChildren();
      return;
    }
    bar.style.opacity = "1";
    bar.style.pointerEvents = "auto";

    /* Rebuild portraits */
    bar.replaceChildren();
    for (const tok of playerOwnedTokens()) {
      const img = document.createElement("img");
      img.src   = tok.texture.src;
      img.title = tok.name;

      img.addEventListener("click", () => canvas.animatePan(tok.center));
      img.addEventListener("contextmenu", ev => {
        ev.preventDefault();
        tok.actor?.sheet.render(true);
      });
      bar.appendChild(img);
    }
  }

  /* -------------------------------------------------------------
   * Hook registrations
   * ----------------------------------------------------------- */
  Hooks.once("ready", refresh);
  Hooks.on("canvasReady",      refresh);
  Hooks.on("createToken",      refresh);
  Hooks.on("updateToken",      refresh);
  Hooks.on("deleteToken",      refresh);
  Hooks.on("updateActor",      refresh);  // ownership changes
  Hooks.on("updateCombat",     refresh);
  Hooks.on("deleteCombat",     refresh);
})();

/***********************************************************************
 * Player Token Bar – with “Always Center” toggle and live label
 *   1 ⇽ prev  | toggle follow 2 | next ⇾ 3
 **********************************************************************/
(() => {
  const BAR_ID   = "player-token-bar";
  const LABEL_ID = "player-token-bar-label";

  /* ---------- CSS (injected once) ---------- */
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
    #${BAR_ID} img:hover          {transform:scale(1.3); z-index:1;}
    #${BAR_ID} img.selected-token {transform:scale(1.3); z-index:2;}

    #${LABEL_ID}{
      position:fixed; bottom:90px; left:15%; width:50%;
      text-align:center; font-size:16px; font-weight:bold; color:#fff;
      text-shadow:0 0 4px #000; pointer-events:none; z-index:21;
      height:24px; line-height:24px; user-select:none;
    }`;
  document.head.appendChild(Object.assign(document.createElement("style"), {textContent: CSS}));

  /* ---------- DOM helpers ---------- */
  const bar   = () => document.getElementById(BAR_ID)   ?? document.body.appendChild(Object.assign(document.createElement("div"), {id:BAR_ID}));
  const label = () => document.getElementById(LABEL_ID) ?? document.body.appendChild(Object.assign(document.createElement("div"), {id:LABEL_ID}));

  /* ---------- State ---------- */
  let lastSelectedTokenId = null;   // token that stays large
  let alwaysCenter        = false;  // follow toggle
  let orderedIds          = [];     // all player‑owned tokens (for display)
  let ownedIds            = [];     // subset you can control (for cycling)
  let hoverTokenId        = null;   // token id currently hovered (for label)

  /* ---------- Utility ---------- */
  const combatRunning = () =>
    !!(game.combat && game.combat.started && game.combat.scene?.id === canvas.scene?.id);

  /** Tokens any player owns (visible on bar) */
  const playerOwnedTokens = () => {
    const players = game.users.players;
    return canvas.tokens.placeables.filter(tok=>{
      if(!tok.actor) return false;
      const tokOwn = tok.document?.ownership ?? tok.ownership ?? {};
      const actOwn = tok.actor.ownership ?? {};
      const hasTok = Object.entries(tokOwn).some(([u,l])=>players.some(p=>p.id===u)&&l>=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
      const hasAct = Object.entries(actOwn).some(([u,l])=>players.some(p=>p.id===u)&&l>=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
      return hasTok||hasAct;
    });
  };

  /** Can YOU control the token? */
  const canControl = tok => tok.isOwner || tok.actor?.isOwner;

  const imgSrc = tok =>
    tok.document.texture?.src ||
    tok.actor?.prototypeToken?.texture?.src ||
    tok.actor?.img ||
    "icons/svg/mystery-man.svg";

  /* ---------- Label helper ---------- */
  function updateLabel(text, showBrackets=false){
    label().textContent = text ? (showBrackets ? `[[ ${text} ]]` : text) : "";
  }

  /* ---------- Build / refresh bar ---------- */
  function refresh(){
    const b = bar();

    /* Hide in combat */
    if(combatRunning()){
      b.style.opacity="0"; b.style.pointerEvents="none";
      updateLabel("");
      b.replaceChildren();
      orderedIds=[]; ownedIds=[];
      return;
    }

    b.style.opacity="1"; b.style.pointerEvents="auto";
    b.replaceChildren();

    orderedIds=[]; ownedIds=[];
    hoverTokenId=null;                                   // reset hover on rebuild

    for(const tok of playerOwnedTokens()){
      orderedIds.push(tok.id);
      if(canControl(tok)) ownedIds.push(tok.id);

      const img = document.createElement("img");
      img.src = imgSrc(tok);
      img.alt = tok.name;

      if(tok.id === lastSelectedTokenId) img.classList.add("selected-token");

      /* --- Click: select & maybe follow --- */
      img.addEventListener("click", ()=> selectToken(tok));

      /* --- Right‑click: open sheet --- */
      img.addEventListener("contextmenu", e=>{
        e.preventDefault();
        tok.actor?.sheet?.render(true);
      });

      /* --- Hover label --- */
      img.addEventListener("mouseenter", ()=>{
        hoverTokenId = tok.id;
        updateLabel(tok.name, alwaysCenter && tok.id===lastSelectedTokenId);
      });
      img.addEventListener("mouseleave", ()=>{
        hoverTokenId = null;
        // revert to selected token name
        const selTok = canvas.tokens.get(lastSelectedTokenId);
        updateLabel(selTok?.name ?? "", alwaysCenter);
      });

      b.appendChild(img);
    }

    // Ensure label shows correct default after rebuild
    const selTok = canvas.tokens.get(lastSelectedTokenId);
    updateLabel(selTok?.name ?? "", alwaysCenter);
  }

  /* ---------- Select token & pan ---------- */
  function selectToken(tok){
    lastSelectedTokenId = tok.id;
    if(canControl(tok)) tok.control({releaseOthers:true});
    canvas.animatePan(tok.center);
    refresh();                               // update highlight & label
  }

  /* ---------- Always‑center handling ---------- */
  function toggleAlwaysCenter(){
    if(!lastSelectedTokenId) return;
    alwaysCenter = !alwaysCenter;

    const selTok = canvas.tokens.get(lastSelectedTokenId);
    if(selTok){
      if(alwaysCenter) canvas.animatePan(selTok.center);
      updateLabel(selTok.name, alwaysCenter);
    }
  }

  /* Follow hook – pan whenever selected token moves */
  Hooks.on("updateToken", (doc)=>{
    if(alwaysCenter && doc.id === lastSelectedTokenId){
      const tok = canvas.tokens.get(doc.id);
      if(tok) canvas.animatePan(tok.center);
    }
  });

  /* ---------- Keyboard handling ---------- */
  function cycleOwned(offset){
    if(!ownedIds.length) return;
    let idx = ownedIds.indexOf(lastSelectedTokenId);
    if(idx===-1) idx = 0;
    const next = canvas.tokens.get(ownedIds[(idx+offset+ownedIds.length)%ownedIds.length]);
    if(next) selectToken(next);
  }

  window.addEventListener("keydown", ev=>{
    // ignore if user typing
    if(ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement || ev.target.isContentEditable) return;

    switch(ev.code){
      case "Digit3": ev.preventDefault(); cycleOwned(+1); break;
      case "Digit1": ev.preventDefault(); cycleOwned(-1); break;
      case "Digit2": ev.preventDefault(); toggleAlwaysCenter(); break;
    }
  });

  /* ---------- Hooks ---------- */
  Hooks.once("ready", refresh);
  Hooks.on("canvasReady",  refresh);
  Hooks.on("createToken",  refresh);
  Hooks.on("updateToken",  refresh);  // also used above for follow
  Hooks.on("deleteToken",  refresh);
  Hooks.on("updateActor",  refresh);
  Hooks.on("updateCombat", refresh);
  Hooks.on("deleteCombat", refresh);
  Hooks.on("controlToken", (tok, controlled)=>{
    if(controlled && canControl(tok)){
      lastSelectedTokenId = tok.id;
      if(alwaysCenter) canvas.animatePan(tok.center);
      refresh();
    }
  });
})();

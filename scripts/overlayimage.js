/***********************************************************************
 * Player Token Bar
 *  Hot‑keys:
 *    1 ⇽ prev | toggle follow 2 | next ⇾ 3 | ⏎ focus chat
 **********************************************************************/
(() => {
  const BAR_ID   = "player-token-bar";
  const LABEL_ID = "player-token-bar-label";

  /* ---------- Inject CSS ---------- */
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
  let selectedId     = null;      // token kept big
  let alwaysCenter   = false;     // follow toggle
  let orderedIds     = [];        // all player‑owned tokens (display order)
  let ownedIds       = [];        // you‑owned tokens (cycle order)
  let hoverId        = null;      // token id currently hovered

  /* ---------- Utility ---------- */
  const combatRunning = () => !!(game.combat?.started && game.combat.scene?.id === canvas.scene?.id);

  /** Tokens owned by *any* player (displayed) */
  const displayTokens = () => {
    const players = game.users.players;
    return canvas.tokens.placeables.filter(t=>{
      if(!t.actor) return false;
      const tokOwn = t.document.ownership ?? t.ownership ?? {};
      const actOwn = t.actor.ownership;
      const hasTok = Object.entries(tokOwn).some(([u,l])=>players.some(p=>p.id===u)&&l>=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
      const hasAct = Object.entries(actOwn).some(([u,l])=>players.some(p=>p.id===u)&&l>=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
      return hasTok||hasAct;
    });
  };

  const canControl = t => t.isOwner || t.actor?.isOwner;

  const imgSrc = t =>
      t.document.texture?.src ||
      t.actor?.prototypeToken?.texture?.src ||
      t.actor?.img ||
      "icons/svg/mystery-man.svg";

  /* ---------- Label helper ---------- */
  function setLabel(text, brackets=false){
    label().textContent = text ? (brackets ? `[[ ${text} ]]` : text) : "";
  }

  /* ---------- Build / refresh bar ---------- */
  function refresh(){
    const b = bar();

    if(combatRunning()){
      b.style.opacity="0"; b.style.pointerEvents="none";
      setLabel("");
      b.replaceChildren(); orderedIds=[]; ownedIds=[]; hoverId=null;
      return;
    }

    b.style.opacity="1"; b.style.pointerEvents="auto";
    b.replaceChildren();

    orderedIds=[]; ownedIds=[]; hoverId=null;

    for(const t of displayTokens()){
      orderedIds.push(t.id);
      if(canControl(t)) ownedIds.push(t.id);

      const img = document.createElement("img");
      img.src = imgSrc(t); img.alt = t.name;
      if(t.id===selectedId) img.classList.add("selected-token");

      img.addEventListener("click", ()=> chooseToken(t));
      img.addEventListener("contextmenu", e=>{ e.preventDefault(); t.actor?.sheet?.render(true); });

      img.addEventListener("mouseenter", ()=>{ hoverId=t.id; setLabel(t.name, alwaysCenter && t.id===selectedId); });
      img.addEventListener("mouseleave", ()=>{ hoverId=null; const s=canvas.tokens.get(selectedId); setLabel(s?.name??"", alwaysCenter); });

      b.appendChild(img);
    }

    const selTok = canvas.tokens.get(selectedId);
    setLabel(selTok?.name??"", alwaysCenter);
  }

  /* ---------- Select token & (maybe) follow ---------- */
  function chooseToken(tok){
    selectedId = tok.id;
    if(canControl(tok)) tok.control({releaseOthers:true});
    canvas.animatePan(tok.center);
    refresh();
  }

  /* ---------- Always‑center toggle ---------- */
  function toggleCenter(){
    if(!selectedId) return;
    alwaysCenter = !alwaysCenter;
    const tok = canvas.tokens.get(selectedId);
    if(tok && alwaysCenter) canvas.animatePan(tok.center);
    setLabel(tok?.name??"", alwaysCenter);
  }

  /* Follow when token moves */
  Hooks.on("updateToken", doc=>{
    if(alwaysCenter && doc.id===selectedId){
      const tok = canvas.tokens.get(doc.id);
      if(tok) canvas.animatePan(tok.center);
    }
  });

  /* ---------- Keyboard handling ---------- */
  function cycleOwned(offset){
    if(!ownedIds.length) return;
    let idx = ownedIds.indexOf(selectedId);
    if(idx===-1) idx=0;
    const next = canvas.tokens.get(ownedIds[(idx+offset+ownedIds.length)%ownedIds.length]);
    if(next) chooseToken(next);
  }

  function sheetOpen(){
    /* Any visible window‑app with .sheet class (character, item, etc.) */
    return !!document.querySelector(".window-app.sheet:not(.minimized)");
  }

  window.addEventListener("keydown", ev=>{
    // If typing already (chat input, sheet field, etc.) ignore
    if(ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement || ev.target.isContentEditable) return;

    switch(ev.code){
      case "Digit3": ev.preventDefault(); cycleOwned(+1); break;
      case "Digit1": ev.preventDefault(); cycleOwned(-1); break;
      case "Digit2": ev.preventDefault(); toggleCenter(); break;
      case "Enter":{
        const chatInput = document.querySelector("#chat-message") || document.querySelector("textarea[name='message']");
        if(chatInput && document.activeElement!==chatInput && !sheetOpen()){
          ev.preventDefault();
          chatInput.focus();
        }
        break;
      }
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
  Hooks.on("controlToken", (tok, ctl)=>{
    if(ctl && canControl(tok)){
      selectedId = tok.id;
      if(alwaysCenter) canvas.animatePan(tok.center);
      refresh();
    }
  });
})();

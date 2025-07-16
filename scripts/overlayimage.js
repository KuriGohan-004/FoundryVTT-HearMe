/***********************************************************************
 * Player Token Bar – complete version
 *   1 ⇽ prev owned | 2 toggle follow | 3 ⇾ next owned | ⏎ focus chat
 *   • Chat box unfocuses after sending
 *   • Big center overlay on token switch
 *   • Auto‑pan/auto‑select active combatant
 *   • Map clicks: single ＝ target, double ＝ sheet + select
 **********************************************************************/
(() => {
  const BAR_ID     = "player-token-bar";
  const LABEL_ID   = "player-token-bar-label";
  const CENTER_ID  = "player-token-bar-center-label";

  /* ---------- CSS -------------------------------------------------- */
  const CSS = `
    /* Bar ---------------------------------------------------------- */
    #${BAR_ID}{
      position:fixed; bottom:0; left:15%; width:50%; height:84px;
      padding:6px 10px; display:flex; align-items:center; justify-content:center;
      gap:10px; overflow-x:auto; overflow-y:hidden;
      background:rgba(0,0,0,.7); border-top:2px solid var(--color-border-light-primary);
      transition:opacity .25s ease; z-index:20; pointer-events:auto;
    }
    #${BAR_ID}::-webkit-scrollbar{height:8px;}
    #${BAR_ID}::-webkit-scrollbar-thumb{background:#666;border-radius:4px;}

    /* Portraits ----------------------------------------------------- */
    #${BAR_ID} img{
      width:64px; height:64px; object-fit:cover; border-radius:8px;
      border:2px solid #fff; flex:0 0 auto; cursor:pointer;
      transition:transform .15s ease;
    }
    #${BAR_ID} img:hover          {transform:scale(1.3); z-index:1;}
    #${BAR_ID} img.selected-token {transform:scale(1.3); z-index:2;}

    /* Small label --------------------------------------------------- */
    #${LABEL_ID}{
      position:fixed; bottom:90px; left:15%; width:50%;
      text-align:center; font-size:16px; font-weight:bold; color:#fff;
      text-shadow:0 0 4px #000; pointer-events:none; z-index:21;
      height:24px; line-height:24px; user-select:none;
    }

    /* Large centre overlay ----------------------------------------- */
    #${CENTER_ID}{
      position:fixed; top:40%; left:50%; transform:translate(-50%,-50%);
      font-size:48px; font-weight:bold; color:#fff; text-shadow:0 0 8px #000;
      pointer-events:none; z-index:40; opacity:0; transition:opacity .5s ease;
      user-select:none;
    }`;
  document.head.appendChild(Object.assign(document.createElement("style"), {textContent: CSS}));

  /* ---------- DOM helpers ----------------------------------------- */
  const getOrCreate = (id, tag="div") =>
    document.getElementById(id) ?? document.body.appendChild(Object.assign(document.createElement(tag), {id}));

  const bar    = () => getOrCreate(BAR_ID);
  const label  = () => getOrCreate(LABEL_ID);
  const center = () => getOrCreate(CENTER_ID);

  /* ---------- State ----------------------------------------------- */
  let selectedId   = null;     // token kept large
  let alwaysCenter = false;    // follow toggle
  let orderedIds   = [];       // all player‑owned tokens (display order)
  let ownedIds     = [];       // subset you can control (cycling)
  let hoverId      = null;     // token id under hover

  /* ---------- Utility functions ----------------------------------- */
  const combatRunning = () => !!(game.combat?.started && game.combat.scene?.id === canvas.scene?.id);

  const canControl = t => t.isOwner || t.actor?.isOwner;

  const imgSrc = t =>
      t.document.texture?.src ||
      t.actor?.prototypeToken?.texture?.src ||
      t.actor?.img ||
      "icons/svg/mystery-man.svg";

  function setSmallLabel(text, brackets=false){
    label().textContent = text ? (brackets ? `[[ ${text} ]]` : text) : "";
  }

  /* Flash big centre overlay --------------------------------------- */
  function flashCenter(text){
    const c = center();
    c.textContent = text;
    c.style.opacity = "1";
    clearTimeout(c._hideTimer);
    c._hideTimer = setTimeout(()=> c.style.opacity="0", 1500);
  }

  /* Tokens shown in bar -------------------------------------------- */
  function displayTokens(){
    const players = game.users.players;
    return canvas.tokens.placeables.filter(t=>{
      if(!t.actor) return false;
      const tokOwn = t.document.ownership ?? t.ownership ?? {};
      const actOwn = t.actor.ownership;
      const hasTok = Object.entries(tokOwn).some(([u,l])=>players.some(p=>p.id===u)&&l>=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
      const hasAct = Object.entries(actOwn).some(([u,l])=>players.some(p=>p.id===u)&&l>=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
      return hasTok||hasAct;
    });
  }

  /* ---------- Build / refresh bar --------------------------------- */
  function refresh(){
    const b = bar();

    /* Hide during combat if desired? (We keep visible) */
    if(combatRunning()){
      b.style.opacity="0"; b.style.pointerEvents="none";
      setSmallLabel("");
      b.replaceChildren(); orderedIds=[]; ownedIds=[];
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

      img.addEventListener("mouseenter", ()=>{
        hoverId=t.id;
        setSmallLabel(t.name, alwaysCenter && t.id===selectedId);
      });
      img.addEventListener("mouseleave", ()=>{
        hoverId=null;
        const s = canvas.tokens.get(selectedId);
        setSmallLabel(s?.name??"", alwaysCenter);
      });

      b.appendChild(img);
    }

    const selTok = canvas.tokens.get(selectedId);
    setSmallLabel(selTok?.name??"", alwaysCenter);
  }

  /* ---------- Select token & follow logic ------------------------- */
  function chooseToken(tok){
    selectedId = tok.id;
    if(canControl(tok)) tok.control({releaseOthers:true});
    canvas.animatePan(tok.center);
    flashCenter(tok.name);
    refresh();
  }

  function toggleFollow(){
    if(!selectedId) return;
    alwaysCenter = !alwaysCenter;
    const tok = canvas.tokens.get(selectedId);
    if(tok && alwaysCenter) canvas.animatePan(tok.center);
    setSmallLabel(tok?.name??"", alwaysCenter);
  }

  /* Follow selected token while moving ----------------------------- */
  Hooks.on("updateToken", doc=>{
    if(alwaysCenter && doc.id===selectedId){
      const tok = canvas.tokens.get(doc.id);
      if(tok) canvas.animatePan(tok.center);
    }
  });

  /* ---------- Keyboard handling ----------------------------------- */
  function cycleOwned(offset){
    if(!ownedIds.length) return;
    let idx=ownedIds.indexOf(selectedId);
    if(idx===-1) idx=0;
    const next = canvas.tokens.get(ownedIds[(idx+offset+ownedIds.length)%ownedIds.length]);
    if(next) chooseToken(next);
  }

  function sheetOpen(){
    return !!document.querySelector(".window-app.sheet:not(.minimized)");
  }

  window.addEventListener("keydown", ev=>{
    if(ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement || ev.target.isContentEditable) return;

    switch(ev.code){
      case "Digit3": ev.preventDefault(); cycleOwned(+1);            break;
      case "Digit1": ev.preventDefault(); cycleOwned(-1);            break;
      case "Digit2": ev.preventDefault(); toggleFollow();            break;
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

  /* Un‑focus chat after sending ------------------------------------ */
  Hooks.once("renderChatLog", (app, html)=>{
    const form = html[0].querySelector("form");
    if(form){
      form.addEventListener("submit", ()=>{
        setTimeout(()=>{
          const inp = form.querySelector("textarea[name='message']") || form.querySelector("#chat-message");
          inp?.blur();
        },10);
      });
    }
  });

  /* ---------- Combat turn handling -------------------------------- */
  Hooks.on("updateCombat", (combat, changed)=>{
    if(changed.turn===undefined) return;
    const cbt = combat.combatant;
    if(!cbt || cbt.sceneId !== canvas.scene?.id) return;
    const tok = canvas.tokens.get(cbt.tokenId);
    if(!tok) return;

    canvas.animatePan(tok.center);
    flashCenter(tok.name);

    if(canControl(tok)){
      tok.control({releaseOthers:true});
      selectedId = tok.id;
    }
    refresh();
  });

  /* ---------- Control token hook ---------------------------------- */
  Hooks.on("controlToken", (tok,ctl)=>{
    if(ctl && canControl(tok)){
      selectedId = tok.id;
      if(alwaysCenter) canvas.animatePan(tok.center);
      flashCenter(tok.name);
      refresh();
    }
  });

  /* ---------- Patch token interactions ---------------------------- */
  if(!Token.prototype._ptbPatched){
    Token.prototype._ptbPatched=true;

    const origClickLeft  = Token.prototype._onClickLeft;
    const origClickLeft2 = Token.prototype._onClickLeft2;

    Token.prototype._onClickLeft = function(event){
      // Single‑click = target (toggle, exclusive)
      if(event.data.originalEvent?.shiftKey){ // allow multi‑target with Shift
        this.setTarget(!this.isTargeted, {groupSelect:true});
      }else{
        canvas.tokens.releaseAllTargets();
        this.setTarget(true);
      }
    };

    Token.prototype._onClickLeft2 = function(event){
      // Double‑click = open sheet + select (if owned)
      if(this.actor) this.actor.sheet?.render(true);
      if(this.isOwner) this.control({releaseOthers:true});
      chooseToken(this);  // update bar/overlay if changed
    };

    // Preserve right‑click behaviour (orig functions untouched)
    Token.prototype._ptbOrigClickLeft  = origClickLeft;
    Token.prototype._ptbOrigClickLeft2 = origClickLeft2;
  }

  /* ---------- Initial build --------------------------------------- */
  Hooks.once("ready", refresh);
  Hooks.on("canvasReady",  refresh);
  Hooks.on("createToken",  refresh);
  Hooks.on("updateToken",  refresh);
  Hooks.on("deleteToken",  refresh);
  Hooks.on("updateActor",  refresh);
  Hooks.on("updateCombat", refresh);
  Hooks.on("deleteCombat", refresh);
})();

/***********************************************************************
 * Player Token Bar  – rotated fading name aligned to sidebar
 *  • v2 – user‑owned only, GM omnibus view, half‑sized bar
 **********************************************************************/
(() => {
  const BAR_ID    = "player-token-bar";
  const LABEL_ID  = "player-token-bar-label";
  const CENTER_ID = "player-token-bar-center-label";

  /* ---------- Styles (½‑size) ---------- */
  const CSS = `
    /* Bottom bar --------------------------------------------------- */
    #${BAR_ID}{
      position:fixed; bottom:0; left:15%; width:50%; height:42px;
      padding:4px 8px; display:flex; align-items:center; justify-content:center;
      gap:8px; overflow-x:auto; overflow-y:hidden;
      background:rgba(0,0,0,.7); border-top:2px solid var(--color-border-light-primary);
      transition:opacity .25s ease; z-index:20; pointer-events:auto;
    }
    #${BAR_ID}::-webkit-scrollbar{height:6px;}
    #${BAR_ID}::-webkit-scrollbar-thumb{background:#666;border-radius:3px;}

    /* Portraits ----------------------------------------------------- */
    #${BAR_ID} img{
      width:32px; height:32px; object-fit:cover; border-radius:6px;
      border:2px solid #fff; flex:0 0 auto; cursor:pointer;
      transition:transform .15s ease;
    }
    #${BAR_ID} img:hover          {transform:scale(1.3); z-index:1;}
    #${BAR_ID} img.selected-token {transform:scale(1.3); z-index:2;}

    /* Small label above bar ---------------------------------------- */
    #${LABEL_ID}{
      position:fixed; bottom:48px; left:15%; width:50%;
      text-align:center; font-size:12px; font-weight:bold; color:#fff;
      text-shadow:0 0 4px #000; pointer-events:none; z-index:21;
      height:18px; line-height:18px; user-select:none;
    }

    /* Rotated, pulsing name aligned to sidebar --------------------- */
    @keyframes ptbPulse{0%,100%{opacity:1;}50%{opacity:.5;}}
    #${CENTER_ID}{
      position:fixed;
      font-size:48px; font-weight:bold; font-style:italic; color:#fff; text-shadow:0 0 8px #000;
      pointer-events:none; z-index:40; user-select:none;
      animation:ptbPulse 4s infinite;
      transform:rotate(-90deg);
      transform-origin:bottom left;
      padding-left:35%;
    }`;
  document.head.appendChild(Object.assign(document.createElement("style"),{textContent:CSS}));

  /* ---------- DOM helpers ---------- */
  const el   = (id,tag="div")=>document.getElementById(id)??document.body.appendChild(Object.assign(document.createElement(tag),{id}));
  const bar   =()=>el(BAR_ID);
  const label =()=>el(LABEL_ID);
  const center=()=>el(CENTER_ID);

  /* ---------- State ---------- */
  let selectedId   = null;
  let alwaysCenter = false;
  let orderedIds   = [];
  let ownedIds     = [];

  /* ---------- Utility ---------- */
  const combatRunning = ()=>!!(game.combat?.started && game.combat.scene?.id===canvas.scene?.id);
  const canControl    = t=>t.isOwner || t.actor?.isOwner;
  const imgSrc        = t=>t.document.texture?.src || t.actor?.prototypeToken?.texture?.src || t.actor?.img || "icons/svg/mystery-man.svg";
  const setSmall      = (txt,b=false)=>{label().textContent=txt?(b?`[[ ${txt} ]]`:txt):"";};

  /* --- positioning helper --- */
  function positionCenter(){
    const sb=document.getElementById("sidebar");
    if(!sb) return;
    const c=center();
    const r=sb.getBoundingClientRect();
    c.style.left = `${r.left - 4}px`;
    c.style.top  = `${r.top + r.height}px`;
  }
  window.addEventListener("resize",positionCenter);
  const showCenter = txt=>{center().textContent=txt;positionCenter();};

  /* ---------- Token list for bar ---------- */
  function displayTokens(){
    /* ---------- GM view ---------- */
    if (game.user.isGM){
      /* 1 ) every linked token in the current scene */
      const sceneLinked = canvas.tokens.placeables.filter(t => t.document.actorLink);

      /* 2 ) plus linked tokens whose owners are offline (covers “actors whose players are not logged in”) */
      const offlineLinked = canvas.tokens.placeables.filter(t => {
        if (!t.document.actorLink) return false;
        const owners = game.users.players.filter(u => t.actor?.testUserPermission(u, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER));
        return owners.length && owners.every(u => !u.active);
      });

      /* Combine & de‑dupe */
      return [...new Set([...sceneLinked, ...offlineLinked])];
    }

    /* ---------- Regular player view  (only tokens you OWN) ---------- */
    return canvas.tokens.placeables.filter(t => canControl(t));
  }

  /* ---------- Build / refresh bar ---------- */
  function refresh(){
    const b=bar();
    if(combatRunning()){b.style.opacity="0";b.style.pointerEvents="none";setSmall("");return;}

    b.style.opacity="1";b.style.pointerEvents="auto";b.replaceChildren();
    orderedIds=[];ownedIds=[];
    for(const t of displayTokens()){
      orderedIds.push(t.id);
      if(canControl(t)) ownedIds.push(t.id);

      const img=document.createElement("img");
      img.src=imgSrc(t); img.alt=t.name;
      if(t.id===selectedId) img.classList.add("selected-token");

      img.onclick       = ()  => clickBarToken(t);
      img.onmouseenter  = ()  => setSmall(t.name,alwaysCenter&&t.id===selectedId);
      img.onmouseleave  = ()  => {const s=canvas.tokens.get(selectedId); setSmall(s?.name??"",alwaysCenter);};

      b.appendChild(img);
    }
    const sTok=canvas.tokens.get(selectedId);
    const nm=sTok?.name??"";
    setSmall(nm,alwaysCenter); showCenter(nm);
  }

  /* ---------- Selection helpers (unchanged) ---------- */
  function selectToken(t){
    selectedId=t.id;
    if(canControl(t)) t.control({releaseOthers:true});
    canvas.animatePan(t.center);
    showCenter(t.name);
    refresh();
  }
  function toggleFollow(){
    if(!selectedId) return;
    alwaysCenter=!alwaysCenter;
    const t=canvas.tokens.get(selectedId);
    if(t&&alwaysCenter) canvas.animatePan(t.center);
    setSmall(t?.name??"",alwaysCenter);
  }

  /* --- rest of original script unchanged -------------------------- */
  /* (hooks, key handlers … everything below remains as‑is) */
  Hooks.on("updateToken",doc=>{
    if(alwaysCenter&&doc.id===selectedId){
      const t=canvas.tokens.get(doc.id);
      if(t) canvas.animatePan(t.center);
    }
  });

  /* ---------- Key handling ---------- */
  function cycleOwned(o){
    if(!ownedIds.length) return;
    let idx=ownedIds.indexOf(selectedId); if(idx===-1) idx=0;
    const next=canvas.tokens.get(ownedIds[(idx+o+ownedIds.length)%ownedIds.length]);
    if(next) selectToken(next);
  }
  function sheetOpen(){return !!document.querySelector(".window-app.sheet:not(.minimized)");}

  function ensureBarSel(){
    if(canvas.tokens.controlled.length===0&&selectedId){
      const t=canvas.tokens.get(selectedId); if(t&&canControl(t)) t.control({releaseOthers:true});
    }
  }

  window.addEventListener("keydown",ev=>{
    if(ev.target instanceof HTMLInputElement||ev.target instanceof HTMLTextAreaElement||ev.target.isContentEditable) return;

    /* WASD / arrows auto‑select */
    if(["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(ev.code)){
      ensureBarSel(); return;     // let Foundry handle movement
    }

    switch(ev.code){
      case "Digit3": ev.preventDefault(); cycleOwned(+1); break;
      case "Digit1": ev.preventDefault(); cycleOwned(-1); break;
      case "Digit2":{
        ev.preventDefault();
        const barTok=canvas.tokens.get(selectedId);
        const curTok=canvas.tokens.controlled[0];
        if(barTok && barTok.id!==curTok?.id){
          selectToken(barTok);
          if(!alwaysCenter) toggleFollow();
        }else toggleFollow();
        break;
      }
      /*  --- Enter case removed: pressing Enter never re‑focuses chat --- */
      case "Space":{
        if(combatRunning()){
          const cb=game.combat.combatant; const tok=cb?canvas.tokens.get(cb.tokenId):null;
          if(tok&&(game.user.isGM||tok.isOwner)){ev.preventDefault();game.combat.nextTurn();}
        }else{ev.preventDefault();game.togglePause();}
        break;
      }
    }
  });

  /* … (all subsequent hooks & helpers unchanged) … */

  /* Initial build */
  Hooks.once("ready",refresh);
  Hooks.on("canvasReady",refresh);
  Hooks.on("createToken",refresh);
  Hooks.on("updateToken",refresh);
  Hooks.on("deleteToken",refresh);
  Hooks.on("updateActor",refresh);
  Hooks.on("deleteCombat",refresh);

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
  if (ev.code !== "KeyQ") return;             /* only react to Q        */

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
  
})();

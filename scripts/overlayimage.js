/***********************************************************************
 * Player Token Bar  – rotated fading name aligned to sidebar
 *  • v2 – user‑owned only, GM omnibus view, half‑sized bar
 **********************************************************************/
(() => {
  const BAR_ID    = "player-token-bar";
  const LABEL_ID  = "player-token-bar-label";
  const CENTER_ID = "player-token-bar-center-label";

/* ---------- Styles (50 % width, transparent) ---------- */
const CSS = `
  /* Bottom bar --------------------------------------------------- */
  #${BAR_ID}{
    position:fixed; bottom:0; left:25%; width:50%; height:84px;
    padding:6px 10px; display:flex;
    align-items:center; justify-content:center;      /* keep centred */
    gap:10px; overflow:hidden;                       /* no scrollbar */
    background:none; border:none;                    /* ← removed bar */
    z-index:20; pointer-events:auto; transition:opacity .25s ease;
  }

  /* Portraits ----------------------------------------------------- */
  #${BAR_ID} img{
    width:64px; height:64px; object-fit:cover; border-radius:8px;
    border:2px solid #fff; flex:0 0 auto; cursor:pointer;
    transition:transform .15s ease;
  }
  #${BAR_ID} img:hover               {transform:scale(1.20); z-index:1;}
  #${BAR_ID} img.selected-token,
  #${BAR_ID} img.selected-token:hover{transform:scale(1.25); z-index:2;}

  /* Small label above bar ---------------------------------------- */
  #${LABEL_ID}{
    position:fixed; bottom:90px; left:25%; width:50%;
    text-align:center; font-size:16px; font-weight:bold; color:#fff;
    text-shadow:0 0 4px #000; pointer-events:none; z-index:21;
    height:24px; line-height:24px; user-select:none;
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

/* ---------- Build / refresh bar (looping carousel) -------------- */
function refresh() {
  const b = bar();

  /* Hide bar while the combat turn list is open */
  if (combatRunning()) {
    b.style.opacity       = "0";
    b.style.pointerEvents = "none";
    setSmall("");
    return;
  }
  b.style.opacity       = "1";
  b.style.pointerEvents = "auto";
  b.replaceChildren();                           // clear old icons

  /* --------------------------------------------------------------- */
  /* 1. Gather tokens that belong in the bar                         */
  /* --------------------------------------------------------------- */
  const allToks = displayTokens();
  if (!allToks.length) { setSmall(""); return; }

  /* Make sure our current selection is valid */
  if (!selectedId || !allToks.some(t => t.id === selectedId))
    selectedId = allToks[0].id;

  /* Arrays used by keyboard handlers elsewhere in the script */
  orderedIds = allToks.map(t => t.id);
  ownedIds   = allToks.filter(canControl).map(t => t.id);

  const n       = orderedIds.length;
  const selIdx  = orderedIds.indexOf(selectedId);

  /* How many portraits go on each side? --------------------------- */
  /* – Show ONE previous token on the left, but only if we have
     at least 3 tokens in total. All remaining tokens go to the right. */
  const leftCount  = (n >= 3) ? 1 : 0;          // ← exactly one or zero
  const rightCount = (n - 1) - leftCount;       // everything else

  /* Helpers to wrap the array index */
  const wrap = idx => (idx + n) % n;

  /* Collect tokens to display */
  const leftTokens  = [];      // previous tokens, nearest first
  const rightTokens = [];      // next tokens, nearest first

  for (let i = 1; i <= leftCount; i++)
    leftTokens.push( canvas.tokens.get( orderedIds[ wrap(selIdx - i) ] ) );

  for (let i = 1; i <= rightCount; i++)
    rightTokens.push( canvas.tokens.get( orderedIds[ wrap(selIdx + i) ] ) );

  /* --------------------------------------------------------------- */
  /* 2. Helper to build an <img> element                             */
  /* --------------------------------------------------------------- */
  function makeImg(token) {
    const img = document.createElement("img");
    img.src   = imgSrc(token);
    img.alt   = token.name;

    if (token.id === selectedId)
      img.classList.add("selected-token");

    /* Click → switch selection */
    img.onclick      = () => selectToken(token);
    img.onmouseenter = () => setSmall(token.name, alwaysCenter && token.id === selectedId);
    img.onmouseleave = () => {
      const cur = canvas.tokens.get(selectedId);
      setSmall(cur?.name ?? "", alwaysCenter);
    };
    return img;
  }

  /* --------------------------------------------------------------- */
  /* 3. Build three flex containers:  left | selected | right        */
  /* --------------------------------------------------------------- */
  const leftWrap  = Object.assign(document.createElement("div"), {
    style: "display:flex; gap:10px; flex-direction:row-reverse;"  // shows nearest‑prev next to centre
  });
  const rightWrap = Object.assign(document.createElement("div"), {
    style: "display:flex; gap:10px;"                              // natural order (nearest first)
  });

  /* Farthest‑to‑nearest for left (row‑reverse flips it back) */
  leftTokens.forEach(tok => leftWrap.appendChild( makeImg(tok) ));

  /* Centre portrait (always selected) */
  const centreImg = makeImg( canvas.tokens.get(selectedId) );

  /* Nearest‑to‑farthest for right */
  rightTokens.forEach(tok => rightWrap.appendChild( makeImg(tok) ));

  /* Assemble the bar */
  b.appendChild(leftWrap);
  b.appendChild(centreImg);
  b.appendChild(rightWrap);

  /* --------------------------------------------------------------- */
  /* 4. Update labels & big centre name                              */
  /* --------------------------------------------------------------- */
  const curTok = canvas.tokens.get(selectedId);
  const nm     = curTok?.name ?? "";
  setSmall(nm, alwaysCenter);
  showCenter(nm);
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
      case "KeyE": ev.preventDefault(); cycleOwned(+1); break;
      case "KeyQ": ev.preventDefault(); cycleOwned(-1); break;
      case "KeyR":{
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

  
})();

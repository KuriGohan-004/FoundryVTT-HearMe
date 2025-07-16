/***********************************************************************
 * Player Token Bar  – vertical sidebar label added
 **********************************************************************/
(() => {
  const BAR_ID      = "player-token-bar";
  const LABEL_ID    = "player-token-bar-label";
  const CENTER_ID   = "player-token-bar-center-label";
  const VERT_ID     = "player-token-bar-vertical-label";   /* NEW */

  /* ---------- Styles ---------- */
  const CSS = `
    /* Bottom bar --------------------------------------------------- */
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

    /* Small label above bar ---------------------------------------- */
    #${LABEL_ID}{
      position:fixed; bottom:90px; left:15%; width:50%;
      text-align:center; font-size:16px; font-weight:bold; color:#fff;
      text-shadow:0 0 4px #000; pointer-events:none; z-index:21;
      height:24px; line-height:24px; user-select:none;
    }

    /* Pulsing overlay (center of screen) --------------------------- */
    @keyframes ptbPulse{0%,100%{opacity:1;}50%{opacity:.5;}}
    #${CENTER_ID}{
      position:fixed; left:50%; top:50%;
      transform:translate(-50%, -50%);
      font-size:48px; font-weight:bold; font-style:italic; color:#fff; text-shadow:0 0 8px #000;
      pointer-events:none; z-index:40; user-select:none;
      animation:ptbPulse 4s infinite;
    }

    /* NEW: Vertical sidebar label ---------------------------------- */
    #${VERT_ID}{
      position:fixed;
      font-size:20px; font-weight:bold; color:#fff; text-shadow:0 0 4px #000;
      pointer-events:none; z-index:39; user-select:none;
      transform:rotate(-90deg);
      transform-origin:bottom left;       /* baseline hugs sidebar */
    }`;
  document.head.appendChild(Object.assign(document.createElement("style"),{textContent:CSS}));

  /* ---------- DOM helpers ---------- */
  const el = (id,tag="div")=>document.getElementById(id)??document.body.appendChild(Object.assign(document.createElement(tag),{id}));
  const bar   =()=>el(BAR_ID);
  const label =()=>el(LABEL_ID);
  const center=()=>el(CENTER_ID);
  const vert  =()=>el(VERT_ID);

  /* ---------- State ---------- */
  let selectedId   = null;
  let alwaysCenter = false;
  let orderedIds   = [];
  let ownedIds     = [];

  /* ---------- Utility ---------- */
  const combatRunning = ()=>!!(game.combat?.started&&game.combat.scene?.id===canvas.scene?.id);
  const canControl    = t=>t.isOwner||t.actor?.isOwner;
  const imgSrc        = t=>t.document.texture?.src||t.actor?.prototypeToken?.texture?.src||t.actor?.img||"icons/svg/mystery-man.svg";
  const setSmall      = (txt,b=false)=>{label().textContent=txt?(b?`[[ ${txt} ]]`:txt):"";};

  /* --- positioning helpers --- */
  function positionCenter(){} // static at 50% via CSS
  function positionVert(){
    const sb=document.getElementById("sidebar"); if(!sb) return;
    const v=vert(); const r=sb.getBoundingClientRect();
    /* Bottom‑left of rotated label sticks to sidebar's left edge */
    v.style.left = `${r.left - 4}px`;             // small offset
    v.style.top  = `${r.top + r.height}px`;       // baseline at bottom
  }
  window.addEventListener("resize",()=>{positionCenter();positionVert();});

  const showCenter = txt=>{center().textContent=txt;positionCenter();};
  const showVert   = txt=>{vert().textContent=txt;positionVert();};

  /* ---------- Token list for bar ---------- */
  function displayTokens(){
    const players=game.users.players;
    return canvas.tokens.placeables.filter(t=>{
      if(!t.actor) return false;
      const tokOwn=t.document.ownership??t.ownership??{};
      const actOwn=t.actor.ownership;
      const hasTok=Object.entries(tokOwn).some(([u,l])=>players.some(p=>p.id===u)&&l>=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
      const hasAct=Object.entries(actOwn).some(([u,l])=>players.some(p=>p.id===u)&&l>=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
      return hasTok||hasAct;
    });
  }

  /* ---------- Build / refresh bar ---------- */
  function refresh(){
    const b=bar();
    if(combatRunning()){b.style.opacity="0";b.style.pointerEvents="none";setSmall("");showVert("");return;}

    b.style.opacity="1";b.style.pointerEvents="auto";b.replaceChildren();
    orderedIds=[];ownedIds=[];
    for(const t of displayTokens()){
      orderedIds.push(t.id);
      if(canControl(t)) ownedIds.push(t.id);

      const img=document.createElement("img");
      img.src=imgSrc(t);img.alt=t.name;
      if(t.id===selectedId) img.classList.add("selected-token");

      img.onclick = ()=>selectToken(t);
      img.onmouseenter = ()=>setSmall(t.name,alwaysCenter&&t.id===selectedId);
      img.onmouseleave = ()=>{const s=canvas.tokens.get(selectedId);setSmall(s?.name??"",alwaysCenter);} ;

      b.appendChild(img);
    }
    const sTok=canvas.tokens.get(selectedId);
    const nm=sTok?.name??"";
    setSmall(nm,alwaysCenter);showCenter(nm);showVert(nm);
  }

  /* ---------- Selection helpers ---------- */
  function selectToken(t){
    selectedId=t.id;
    if(canControl(t)) t.control({releaseOthers:true});
    canvas.animatePan(t.center);
    showCenter(t.name); showVert(t.name);
    refresh();
  }
  function toggleFollow(){
    if(!selectedId) return;
    alwaysCenter=!alwaysCenter;
    const t=canvas.tokens.get(selectedId);
    if(t&&alwaysCenter) canvas.animatePan(t.center);
    setSmall(t?.name??"",alwaysCenter);
  }

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
      case "Enter":{
        const inp=document.querySelector("#chat-message")||document.querySelector("textarea[name='message']");
        if(inp&&document.activeElement!==inp&&!sheetOpen()){ev.preventDefault();inp.focus();}
        break;
      }
      case "Space":{
        if(combatRunning()){
          const cb=game.combat.combatant; const tok=cb?canvas.tokens.get(cb.tokenId):null;
          if(tok&&(game.user.isGM||tok.isOwner)){ev.preventDefault();game.combat.nextTurn();}
        }else{ev.preventDefault();game.togglePause();}
        break;
      }
    }
  });

  /* Chat blur */
  Hooks.once("renderChatLog",(app,html)=>{
    const form=html[0].querySelector("form");
    form?.addEventListener("submit",()=>setTimeout(()=>form.querySelector("textarea[name='message'],#chat-message")?.blur(),300));
  });

  /* Combat turn */
  Hooks.on("updateCombat",(c,chg)=>{
    if(chg.turn===undefined) return;
    const com=c.combatant; if(!com||com.sceneId!==canvas.scene?.id) return;
    const tok=canvas.tokens.get(com.tokenId); if(!tok) return;
    canvas.animatePan(tok.center);
    showCenter(tok.name); showVert(tok.name);
    if(canControl(tok)){tok.control({releaseOthers:true});selectedId=tok.id;}
    refresh();
  });

  /* Control hook */
  Hooks.on("controlToken",(tok,ctl)=>{
    if(ctl&&canControl(tok)){
      selectedId=tok.id; if(alwaysCenter) canvas.animatePan(tok.center);
      showCenter(tok.name); showVert(tok.name); refresh();
    }
  });

  /* Double click sheet + select */
  if(!Token.prototype._ptbDblPatched){
    Token.prototype._ptbDblPatched=true;
    const orig=Token.prototype._onClickLeft2;
    Token.prototype._onClickLeft2=function(e){
      this.actor?.sheet?.render(true);
      if(this.isOwner) this.control({releaseOthers:true});
      selectToken(this);
      orig?.call(this,e);
    };
  }

  /* Initial build */
  Hooks.once("ready",refresh);
  Hooks.on("canvasReady",refresh);
  Hooks.on("createToken",refresh);
  Hooks.on("updateToken",refresh);
  Hooks.on("deleteToken",refresh);
  Hooks.on("updateActor",refresh);
  Hooks.on("deleteCombat",refresh);
})();

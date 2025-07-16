/***********************************************************************
 * Player Token Bar  – WASD‑auto‑select & smarter “2” key
 *   1 ⇽ prev owned | 2 toggle/auto‑select | 3 ⇾ next owned | ⏎ chat
 *   Space: end turn (combat) / pause (out‑of‑combat)
 **********************************************************************/
(() => {
  const BAR_ID   = "player-token-bar";
  const LABEL_ID = "player-token-bar-label";
  const CENTER_ID= "player-token-bar-center-label";

  /* ---------- Styles ---------- */
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
    }

    @keyframes ptbPulse{0%,100%{opacity:1;}50%{opacity:.3;}}
    #${CENTER_ID}{
      position:fixed; left:50%; transform:translateX(-50%);
      font-size:48px; font-weight:bold; color:#fff; text-shadow:0 0 8px #000;
      pointer-events:none; z-index:40; user-select:none;
      animation:ptbPulse 4s infinite;
    }`;
  document.head.appendChild(Object.assign(document.createElement("style"),{textContent:CSS}));

  /* ---------- DOM helpers ---------- */
  const el = (id,tag="div")=>document.getElementById(id)??document.body.appendChild(Object.assign(document.createElement(tag),{id}));
  const bar   =()=>el(BAR_ID);
  const label =()=>el(LABEL_ID);
  const center=()=>el(CENTER_ID);

  /* ---------- State ---------- */
  let selectedId   = null;
  let alwaysCenter = false;
  let orderedIds   = [];
  let ownedIds     = [];

  /* ---------- Utils ---------- */
  const combatRunning = ()=>!!(game.combat?.started&&game.combat.scene?.id===canvas.scene?.id);
  const canControl = t=>t.isOwner||t.actor?.isOwner;
  const imgSrc = t=>t.document.texture?.src||t.actor?.prototypeToken?.texture?.src||t.actor?.img||"icons/svg/mystery-man.svg";
  const setSmall = (txt,b=false)=>{label().textContent=txt? (b?`[[ ${txt} ]]`:txt):"";};

  /* big overlay under sidebar */
  function posCenter(){const sb=document.getElementById("sidebar");if(sb){const r=sb.getBoundingClientRect();const c=center();c.style.top=`${r.top-c.offsetHeight}px`;}}
  window.addEventListener("resize",posCenter);
  const showCenter = txt=>{const c=center();c.textContent=txt;posCenter();};

  /* tokens shown in bar */
  function displayTokens(){
    const players=game.users.players;
    return canvas.tokens.placeables.filter(t=>{
      if(!t.actor) return false;
      const ownTok=t.document.ownership??t.ownership??{};
      const ownAct=t.actor.ownership;
      const hasTok=Object.entries(ownTok).some(([u,l])=>players.some(p=>p.id===u)&&l>=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
      const hasAct=Object.entries(ownAct).some(([u,l])=>players.some(p=>p.id===u)&&l>=CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER);
      return hasTok||hasAct;
    });
  }

  /* ---------- Build bar ---------- */
  function refresh(){
    const b=bar();
    if(combatRunning()){b.style.opacity="0";b.style.pointerEvents="none";setSmall("");return;}

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
      img.onmouseleave = ()=>{const s=canvas.tokens.get(selectedId);setSmall(s?.name??"",alwaysCenter);};

      b.appendChild(img);
    }
    const sTok=canvas.tokens.get(selectedId);
    setSmall(sTok?.name??"",alwaysCenter);
    showCenter(sTok?.name??"");
  }

  /* ---------- Selection helpers ---------- */
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

  function ensureBarSelection(){
    if(canvas.tokens.controlled.length===0 && selectedId){
      const t=canvas.tokens.get(selectedId);
      if(t&&canControl(t)) t.control({releaseOthers:true});
    }
  }

  window.addEventListener("keydown",ev=>{
    if(ev.target instanceof HTMLInputElement||ev.target instanceof HTMLTextAreaElement||ev.target.isContentEditable) return;

    /* Movement keys auto‑select */
    if(["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(ev.code)){
      ensureBarSelection();
      return; // don't prevent default – let Foundry handle movement
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
        }else{
          toggleFollow();
        }
        break;
      }
      case "Enter":{
        const inp=document.querySelector("#chat-message")||document.querySelector("textarea[name='message']");
        if(inp&&document.activeElement!==inp&&!sheetOpen()){ev.preventDefault();inp.focus();}
        break;
      }
      case "Space":{
        if(combatRunning()){
          const cb=game.combat.combatant;
          const tok=cb?canvas.tokens.get(cb.tokenId):null;
          if(tok&&(game.user.isGM||tok.isOwner)){ev.preventDefault();game.combat.nextTurn();}
        }else{ev.preventDefault();game.togglePause();}
        break;
      }
    }
  });

  /* Chat blur after send */
  Hooks.once("renderChatLog",(app,html)=>{
    const form=html[0].querySelector("form");
    form?.addEventListener("submit",()=>setTimeout(()=>form.querySelector("textarea[name='message'],#chat-message")?.blur(),10));
  });

  /* Combat turn pan/select */
  Hooks.on("updateCombat",(c,chg)=>{
    if(chg.turn===undefined) return;
    const com=c.combatant;if(!com||com.sceneId!==canvas.scene?.id) return;
    const tok=canvas.tokens.get(com.tokenId); if(!tok) return;
    canvas.animatePan(tok.center); showCenter(tok.name);
    if(canControl(tok)){tok.control({releaseOthers:true});selectedId=tok.id;}
    refresh();
  });

  /* Control change from other sources */
  Hooks.on("controlToken",(tok,ctl)=>{
    if(ctl&&canControl(tok)){selectedId=tok.id;if(alwaysCenter)canvas.animatePan(tok.center);showCenter(tok.name);refresh();}
  });

  /* Double‑click sheet+select (left‑click behaviour restored) */
  if(!Token.prototype._ptbDCPatched){
    Token.prototype._ptbDCPatched=true;
    const orig=Token.prototype._onClickLeft2;
    Token.prototype._onClickLeft2=function(e){
      this.actor?.sheet?.render(true);
      if(this.isOwner) this.control({releaseOthers:true});
      selectToken(this);
      if(orig) orig.call(this,e);
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

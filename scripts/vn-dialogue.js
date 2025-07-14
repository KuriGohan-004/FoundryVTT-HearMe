// === VN Chat Banner with GM‑Controlled Floating Portrait (Pixel‑Based) ===
//  Entire standalone script.  Portrait size & position are GM‑side world settings.
//  Size/offset sliders still use vw/vh units, but we compute actual pixels so
//  they remain consistent regardless of viewport changes.

Hooks.once("init", () => {
  /* ------------------------------------------------------------------
   *  CORE SETTINGS
   * ----------------------------------------------------------------*/
  game.settings.register("hearme-chat-notification", "pingSound", {
    name: "Chat Notification Sound",
    scope: "world",
    config: true,
    type: String,
    default: "modules/hearme-chat-notification/ui/chat-ping.ogg",
    filePicker: "audio"
  });

  game.settings.register("hearme-chat-notification", "skipKey", {
    name: "Skip Key (client)",
    scope: "client",
    config: true,
    type: String,
    default: "q"
  });

  /* ------------------------------------------------------------------
   *  PORTRAIT (GM‑ONLY) SETTINGS
   * ----------------------------------------------------------------*/
  game.settings.register("hearme-chat-notification", "portraitEnabled", {
    name: "Enable Portrait",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "portraitScale", {
    name: "Portrait Scale (vw)",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 5, max: 23, step: 1 },
    default: 13
  });

  game.settings.register("hearme-chat-notification", "portraitOffsetX", {
    name: "Portrait Offset X (vw)",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 50, step: 1 },
    default: 0
  });

  game.settings.register("hearme-chat-notification", "portraitOffsetY", {
    name: "Portrait Offset Y (vh)",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 50, step: 1 },
    default: 0
  });
});

(() => {
  /* ------------------------------ CONSTANTS ---------------------- */
  const TYPE_MS = 20;
  const SKIP_MIN_S = 3;
  const SKIP_BASE_MS = 5000;
  const SKIP_PER_CHAR_MS = 50;

  /* ------------------------------ STATE -------------------------- */
  let banner   = document.getElementById("vn-chat-banner");
  let portrait = document.getElementById("vn-chat-image");
  let arrow    = document.getElementById("vn-chat-arrow");
  let timerBar = null;

  let queue = [];
  let typing = false;
  let skipTimer = null;
  let skipStart = 0;
  let skipRemain = 0;
  let lastSpeaker = null;

  /* ------------------------------ HELPERS ------------------------ */
  const gSetting = (k) => game.settings.get("hearme-chat-notification", k);

  function playSound() {
    const src = gSetting("pingSound");
    if (!src) return;
    if (game.audio?.context?.state === "suspended") game.audio.context.resume();
    AudioHelper.play({ src, volume: 0.8, autoplay: true, loop: false }, true);
  }

  const clean = (html) => html.replace(/<(?!\/?(br|b|strong|i|em|u)\b)[^>]*>/gi, "");

  /* ------------------------------ DOM BUILD ---------------------- */
  function buildDom() {
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "vn-chat-banner";
      Object.assign(banner.style, {
        position: "fixed", bottom: "calc(5% + 48px)", left: "20%", width: "60%",
        background: "rgba(0,0,0,0.8)", color: "white", fontFamily: "Arial, sans-serif",
        padding: "12px 20px", zIndex: 99, display: "none", flexDirection: "column",
        alignItems: "flex-start", userSelect: "none", backdropFilter: "blur(4px)",
        boxShadow: "0 -2px 10px rgba(0,0,0,0.7)", minHeight: "25vh", maxHeight: "50vh",
        overflowY: "auto", transition: "opacity .25s ease", opacity: 0, pointerEvents: "none"
      });
      banner.innerHTML = `
        <div id="vn-chat-name" style="font-weight:bold;font-size:1.2em;margin-bottom:4px;"></div>
        <div id="vn-chat-msg"  style="font-size:2.2em;"></div>
        <div id="vn-chat-arrow" style="position:absolute;bottom:8px;right:16px;font-size:1.5em;opacity:.5;display:none">&#8595;</div>
        <div id="vn-chat-timer" style="position:absolute;bottom:0;left:0;height:5px;width:100%;background:white;transform-origin:left;transform:scaleX(1);"></div>`;
      document.body.appendChild(banner);
      arrow    = document.getElementById("vn-chat-arrow");
      timerBar = document.getElementById("vn-chat-timer");
    }

    if (!portrait) {
      portrait = document.createElement("img");
      portrait.id = "vn-chat-image";
      Object.assign(portrait.style, {
        position: "fixed", objectFit: "cover", zIndex: 98, pointerEvents: "none",
        transition: "opacity .4s ease", opacity: 0
      });
      document.body.appendChild(portrait);
    }
    applyPortraitCSS();
  }

  /* ------------------ PORTRAIT POSITION / SIZE ------------------- */
  function applyPortraitCSS() {
    if (!portrait) return;
    portrait.style.display = gSetting("portraitEnabled") ? "block" : "none";
    // px calculations
    const sizePx   = (gSetting("portraitScale") / 100) * window.innerWidth;
    const offsetXPx = (gSetting("portraitOffsetX") / 100) * window.innerWidth;
    const offsetYPx = (gSetting("portraitOffsetY") / 100) * window.innerHeight;

    portrait.style.width  = `${sizePx}px`;
    portrait.style.height = `${sizePx}px`;
    portrait.style.left   = `${offsetXPx}px`;
    portrait.style.bottom = `${offsetYPx}px`;
  }

  window.addEventListener("resize", applyPortraitCSS);

  game.settings.on("change", (key) => {
    if (key.startsWith("hearme-chat-notification.portrait")) applyPortraitCSS();
  });

  /* ------------------ TYPEWRITER / DISPLAY ----------------------- */
  function typeOut(el, html, done) {
    typing = true; el.innerHTML="";
    const segs = clean(html).split(/(<[^>]+>)/).filter(Boolean);
    let si=0, ci=0;
    const next=()=>{
      if (si>=segs.length){ typing=false; done?.(); return; }
      const s=segs[si];
      if (s.startsWith("<")){ el.innerHTML+=s; si++; next(); }
      else { if(ci<s.length){ el.innerHTML+=s.charAt(ci++); setTimeout(next,TYPE_MS);}else{si++;ci=0;next();} }
    }; next();
  }

  function resetSkip() { clearTimeout(skipTimer); skipTimer=null; timerBar.style.transform="scaleX(1)"; }

  function startSkip(chars){
    const dur = Math.max(SKIP_MIN_S*1000, SKIP_BASE_MS+chars*SKIP_PER_CHAR_MS);
    skipStart = Date.now(); skipRemain = dur;
    timerBar.style.transition=`transform ${dur}ms linear`;
    timerBar.style.transform="scaleX(0)";
    skipTimer=setTimeout(skip, dur);
  }

  window.addEventListener("blur",()=>{ if(!skipTimer)return; clearTimeout(skipTimer); skipRemain-=Date.now()-skipStart; skipTimer=null; timerBar.style.transition="none"; timerBar.style.transform=`scaleX(${skipRemain/(SKIP_BASE_MS+1000*SKIP_MIN_S)})`; });
  window.addEventListener("focus",()=>{ if(skipTimer||!skipRemain)return; skipStart=Date.now(); timerBar.style.transition=`transform ${skipRemain}ms linear`; timerBar.style.transform="scaleX(0)"; skipTimer=setTimeout(skip,skipRemain); });

  function showArrow(){ arrow.style.display=queue.length?"block":"none"; }

  function display({speaker,msg,img,uid}){
    resetSkip();
    banner.style.display="flex"; requestAnimationFrame(()=>banner.style.opacity=1);
    banner.querySelector("#vn-chat-name").textContent=speaker;
    if(gSetting("portraitEnabled")){
      if(speaker!==lastSpeaker){ portrait.style.opacity=0; if(img)portrait.src=img; portrait.onload=()=>{applyPortraitCSS();portrait.style.opacity=1;}; lastSpeaker=speaker; }
    }
    if(uid===game.user.id)playSound();
    typeOut(banner.querySelector("#vn-chat-msg"),msg,()=>{ showArrow(); if(document.hasFocus())startSkip(msg.length); });
  }

  function skip(){ if(typing)return; resetSkip(); if(queue.length)display(queue.shift()); else{ banner.style.opacity=0; portrait.style.opacity=0; setTimeout(()=>banner.style.display="none",250); } }

  /* ----------------------------- INPUT --------------------------- */
  document.addEventListener("keydown",ev=>{
    if(ev.key.toLowerCase()===gSetting("skipKey").toLowerCase()||ev.key==="Tab"){ ev.preventDefault(); skip(); }
  });

  /* --------------------------- CHAT HOOK ------------------------- */
  Hooks.on("createChatMessage",m=>{
    if(!m.visible||m.isRoll||!m.speaker?.actor)return;
    const actor=game.actors.get(m.speaker.actor); if(!actor)return;
    let name=actor.name, img=actor.img;
    if(m.speaker.token){const s=game.scenes.active; const t=s?.tokens.get(m.speaker.token); if(t){name=t.name;img=t.texture.src;}}
    const e={speaker:name,msg:m.content.trim(),img,uid:m.user.id};
    if(banner.style.display==="flex"){queue.push(e);showArrow();}else display(e);
  });

  /* ----------------------------- INIT ---------------------------- */
  buildDom();
})();

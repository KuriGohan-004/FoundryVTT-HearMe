// === VN Chat Banner with Admin‑Controlled Portraits ===
//  Fully self‑contained script (replace previous versions)

Hooks.once("init", () => {
  /* ------------------------------------------------------------------
   *  CORE SETTINGS
   * ----------------------------------------------------------------*/
  game.settings.register("hearme-chat-notification", "pingSound", {
    name: "Chat Notification Sound",
    hint: "Sound that plays for each VN message (world‑level).",
    scope: "world",
    config: true,
    type: String,
    default: "modules/hearme-chat-notification/ui/chat-ping.ogg",
    filePicker: "audio"
  });

  game.settings.register("hearme-chat-notification", "skipKey", {
    name: "Skip Key (client)",
    hint: "Key used by a player to advance/skip dialogue (default Q).",
    scope: "client",
    config: true,
    type: String,
    default: "q"
  });

  /* ------------------------------------------------------------------
   *  PORTRAIT SETTINGS (GM‑ONLY, WORLD‑LEVEL)
   * ----------------------------------------------------------------*/
  game.settings.register("hearme-chat-notification", "portraitEnabled", {
    name: "Enable Portrait",
    hint: "Show character portrait beside VN banner (GM setting).",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "portraitSize", {
    name: "Portrait Size (vw)",
    hint: "Portrait square size in viewport‑width units (5–23). GM setting.",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 5, max: 23, step: 1 },
    default: 13
  });
});

/* =====================================================================
 *  MAIN MODULE (IIFE)
 * ===================================================================*/
(() => {
  /* -------------------------- CONSTANTS --------------------------- */
  const AUTO_SKIP_MIN = 3;          // seconds
  const AUTO_SKIP_BASE = 5000;      // ms
  const AUTO_SKIP_PER_CHAR = 50;    // ms / char
  const TYPING_SPEED = 20;          // ms per char

  /* ----------------------------- STATE ---------------------------- */
  let banner   = document.getElementById("vn-chat-banner");
  let imgElm   = document.getElementById("vn-chat-image");
  let arrowElm = document.getElementById("vn-chat-arrow");
  let barElm   = null;

  let queue          = [];
  let typing         = false;
  let autoTimer      = null;
  let autoStart      = 0;
  let autoRemain     = 0;
  let currentSpeaker = null;

  /* -------------------------- HELPERS ----------------------------- */
  const isPortraitOn = () => game.settings.get("hearme-chat-notification", "portraitEnabled");
  const getPortraitVW = () => game.settings.get("hearme-chat-notification", "portraitSize");

  const pxFromVW = vw => (vw / 100) * window.innerWidth;

  function playPing() {
    const src = game.settings.get("hearme-chat-notification", "pingSound");
    if (!src) return;
    if (game.audio?.context?.state === "suspended") game.audio.context.resume();
    AudioHelper.play({ src, volume: 0.8, autoplay: true, loop: false }, true);
  }

  function cleanHTML(str) {
    return str.replace(/<(?!\/?(br|b|strong|i|em|u)\b)[^>]*>/gi, "");
  }

  /* ------------------------ DOM CREATION -------------------------- */
  function createDom() {
    /* Banner */
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "vn-chat-banner";
      Object.assign(banner.style, {
        position: "fixed",
        bottom: "calc(5% + 48px)",
        left: "20%",
        width: "60%",
        background: "rgba(0,0,0,0.8)",
        color: "white",
        fontFamily: "Arial, sans-serif",
        padding: "12px 20px",
        zIndex: 99,
        display: "none",
        flexDirection: "column",
        alignItems: "flex-start",
        userSelect: "none",
        backdropFilter: "blur(4px)",
        boxShadow: "0 -2px 10px rgba(0,0,0,0.7)",
        minHeight: "25vh",
        maxHeight: "50vh",
        overflowY: "auto",
        transition: "opacity 0.25s ease",
        opacity: "0",
        pointerEvents: "none"
      });
      banner.innerHTML = `
        <div id="vn-chat-name" style="font-weight:bold;font-size:1.2em;margin-bottom:4px;"></div>
        <div id="vn-chat-msg"  style="font-size:2.2em;"></div>
        <div id="vn-chat-arrow" style="position:absolute;bottom:8px;right:16px;font-size:1.5em;opacity:0.5;display:none;">&#8595;</div>
        <div id="vn-chat-timer" style="position:absolute;bottom:0;left:0;height:5px;width:100%;background:white;transform-origin:left;transform:scaleX(1);transition:transform linear;opacity:1;"></div>`;
      document.body.appendChild(banner);
      arrowElm = document.getElementById("vn-chat-arrow");
      barElm   = document.getElementById("vn-chat-timer");
    }

    /* Portrait */
    if (!imgElm) {
      imgElm = document.createElement("img");
      imgElm.id = "vn-chat-image";
      Object.assign(imgElm.style, {
        position: "fixed",
        objectFit: "cover",        // force square crop
        zIndex: 98,
        pointerEvents: "none",
        transition: "opacity 0.4s ease",
        opacity: "0",
        left: 0,
        top: 0
      });
      document.body.appendChild(imgElm);
    }

    applyPortraitSettings();
  }

  /* ------------------ PORTRAIT SIZE / POSITION -------------------- */
  function applyPortraitSettings() {
    if (!imgElm) return;
    const vw = getPortraitVW();
    imgElm.style.width  = `${vw}vw`;
    imgElm.style.height = `${vw}vw`;
    imgElm.style.display = isPortraitOn() ? "block" : "none";
    positionPortrait();
  }

  function positionPortrait() {
    if (!isPortraitOn() || !banner) return;
    const bannerRect = banner.getBoundingClientRect();
    const sizePx     = pxFromVW(getPortraitVW());

    imgElm.style.left = `${bannerRect.left - sizePx}px`;
    imgElm.style.top  = `${bannerRect.top + bannerRect.height/2 - sizePx/2}px`;
  }

  window.addEventListener("resize", positionPortrait);

  /* React to GM setting changes in real time */
  Hooks.on("updateSetting", (namespace, key) => {
    if (namespace === "hearme-chat-notification" && (key === "portraitSize" || key === "portraitEnabled")) {
      applyPortraitSettings();
    }
  });

  /* ---------------------- TYPEWRITER EFFECT ----------------------- */
  function typeHtml(el, html, done) {
    typing = true;
    const segs = cleanHTML(html).split(/(<[^>]+>)/).filter(Boolean);
    el.innerHTML = "";
    let s = 0, c = 0;

    function step() {
      if (s >= segs.length) { typing = false; done?.(); return; }
      const seg = segs[s];
      if (seg.startsWith("<")) { el.innerHTML += seg; s++; step(); }
      else {
        if (c < seg.length) { el.innerHTML += seg.charAt(c++); setTimeout(step, TYPING_SPEED); }
        else { s++; c = 0; step(); }
      }
    }
    step();
  }

  /* ---------------------- AUTO‑SKIP TIMER ------------------------- */
  function resetTimer() {
    clearTimeout(autoTimer);
    autoTimer = null;
    barElm.style.transition = "none";
    barElm.style.transform  = "scaleX(1)";
    barElm.style.opacity    = "1";
  }

  function startTimer(chars) {
    const dur = Math.max(AUTO_SKIP_MIN * 1000, AUTO_SKIP_BASE + chars * AUTO_SKIP_PER_CHAR);
    autoStart  = Date.now();
    autoRemain = dur;

    barElm.style.transition = "none";
    barElm.style.transform  = "scaleX(1)";
    setTimeout(() => {
      barElm.style.transition = `transform ${dur}ms linear`;
      barElm.style.transform  = "scaleX(0)";
    }, 20);

    autoTimer = setTimeout(skip, dur);
  }

  window.addEventListener("blur", () => {
    if (!autoTimer) return;
    clearTimeout(autoTimer);
    autoRemain -= Date.now() - autoStart;
    autoTimer = null;
    const ratio = autoRemain / (AUTO_SKIP_BASE + 1000*AUTO_SKIP_MIN);
    barElm.style.transition = "none";
    barElm.style.transform  = `scaleX(${ratio})`;
  });

  window.addEventListener("focus", () => {
    if (autoTimer || !autoRemain) return;
    autoStart = Date.now();
    barElm.style.transition = `transform ${autoRemain}ms linear`;
    barElm.style.transform  = "scaleX(0)";
    autoTimer = setTimeout(skip, autoRemain);
  });

  /* -------------------- DISPLAY & QUEUE MGMT ---------------------- */
  function showArrow() { arrowElm.style.display = queue.length ? "block" : "none"; }

  function display({ speaker, msg, img, uid }) {
    resetTimer();
    const nameEl = banner.querySelector("#vn-chat-name");
    const msgEl  = banner.querySelector("#vn-chat-msg");

    nameEl.textContent = speaker;
    banner.style.display = "flex";
    requestAnimationFrame(() => { banner.style.opacity = "1"; positionPortrait(); });

    if (isPortraitOn()) {
      if (speaker !== currentSpeaker) {
        imgElm.style.opacity = "0";
        if (img) imgElm.src = img;
        imgElm.onload = () => { positionPortrait(); imgElm.style.opacity = "1"; };
        currentSpeaker = speaker;
      } else positionPortrait();
    }

    if (uid === game.user.id) playPing();

    typeHtml(msgEl, msg, () => {
      showArrow();
      if (document.hasFocus()) startTimer(msgEl.textContent.length);
    });
  }

  function skip() {
    if (typing) return; // ignore during typing
    resetTimer();
    if (queue.length) display(queue.shift());
    else {
      banner.style.opacity = "0";
      imgElm.style.opacity = "0";
      setTimeout(() => { banner.style.display = "none"; currentSpeaker = null; }, 250);
    }
  }

  /* ----------------------------- INPUT ----------------------------- */
  document.addEventListener("keydown", ev => {
    if (document.activeElement?.closest(".chat-message") || document.activeElement?.tagName === "TEXTAREA") return;
    if (document.querySelector(".app.window-app.sheet:not(.minimized)")) return;
    const key = game.settings.get("hearme-chat-notification", "skipKey").toLowerCase();
    if (ev.key.toLowerCase() === key || ev.key === "Tab") { ev.preventDefault(); skip(); }
  });

  /* --------------------------- SOCKET ----------------------------- */
  Hooks.on("createChatMessage", message => {
    if (!message.visible || message.isRoll) return;
    if (!message.speaker?.actor) return;

    const actor = game.actors.get(message.speaker.actor);
    if (!actor) return;

    let speaker = actor.name;
    let img     = actor.img;

    if (message.speaker.token) {
      const scene = game.scenes.active;
      const tkn   = scene?.tokens.get(message.speaker.token);
      if (tkn) { speaker = tkn.name; img = tkn.texture.src; }
    }

    const entry = { speaker, msg: message.content.trim(), img, uid: message.user.id };
    if (banner.style.display === "flex") { queue.push(entry); showArrow(); }
    else display(entry);
  });

  /* --------------------------- INIT ------------------------------- */
  createDom();
})();

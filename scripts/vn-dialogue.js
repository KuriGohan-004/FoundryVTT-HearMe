// === VN Chat Banner with Admin‑Controlled Floating Portrait ===
//  Complete self‑contained script — paste into a single .js file.
//  Portrait size, enable, and offsets are GM‑side (world‑level) settings.

Hooks.once("init", () => {
  /* ------------------------------------------------------------------
   *  CORE SETTINGS (WORLD & CLIENT)
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
    hint: "Toggle character portrait (GM setting).",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "portraitScale", {
    name: "Portrait Scale (vw)",
    hint: "Square portrait size in viewport‑width units (5–23).",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 5, max: 23, step: 1 },
    default: 13
  });

  game.settings.register("hearme-chat-notification", "portraitOffsetX", {
    name: "Portrait Offset X (vw)",
    hint: "Move portrait right from the left edge. 0 = flush left (GM setting).",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 50, step: 1 },
    default: 0
  });

  game.settings.register("hearme-chat-notification", "portraitOffsetY", {
    name: "Portrait Offset Y (vh)",
    hint: "Raise portrait upward from the bottom edge. 0 = flush bottom (GM setting).",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 50, step: 1 },
    default: 0
  });
});

/* =====================================================================
 *  MAIN MODULE (IIFE)
 * ===================================================================*/
(() => {
  /* -------------------------- CONSTANTS --------------------------- */
  const AUTO_SKIP_MIN_SEC   = 3;           // seconds
  const AUTO_SKIP_BASE_MS   = 5000;        // ms
  const AUTO_SKIP_PER_CHAR  = 50;          // ms / char
  const TYPING_SPEED_MS     = 20;          // ms per char

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
  const portraitOn     = () => game.settings.get("hearme-chat-notification", "portraitEnabled");
  const portraitVW     = () => game.settings.get("hearme-chat-notification", "portraitScale");
  const portraitOffXVW = () => game.settings.get("hearme-chat-notification", "portraitOffsetX");
  const portraitOffYVH = () => game.settings.get("hearme-chat-notification", "portraitOffsetY");

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
        objectFit: "cover",        // square crop
        zIndex: 98,                 // one layer below banner (99)
        pointerEvents: "none",
        transition: "opacity 0.4s ease",
        opacity: "0",
        left: 0,
        bottom: 0                   // anchor to bottom edge
      });
      document.body.appendChild(imgElm);
    }

    applyPortraitCSS();
  }

  /* ------------------- PORTRAIT CSS APPLICATION ------------------- */
  function applyPortraitCSS() {
    if (!imgElm) return;
    imgElm.style.display = portraitOn() ? "block" : "none";

    const vw = portraitVW();
    imgElm.style.width  = `${vw}vw`;
    imgElm.style.height = `${vw}vw`;

    // offsets from bottom‑left
    imgElm.style.left   = `${portraitOffXVW()}vw`;
    imgElm.style.bottom = `${portraitOffYVH()}vh`;
  }

  /* Live update when GM changes settings */
  Hooks.on("updateSetting", (namespace, key) => {
    if (namespace !== "hearme-chat-notification") return;
    if (["portraitEnabled", "portraitScale", "portraitOffsetX", "portraitOffsetY"].includes(key)) {
      applyPortraitCSS();
    }
  });

  /* ----------------------- TYPEWRITER ----------------------------- */
  function typeHtml(el, html, done) {
    typing = true;
    const parts = cleanHTML(html).split(/(<[^>]+>)/).filter(Boolean);
    el.innerHTML = "";
    let p = 0, c = 0;

    function step() {
      if (p >= parts.length) { typing = false; done?.(); return; }
      const seg = parts[p];
      if (seg.startsWith("<")) { el.innerHTML += seg; p++; step(); }
      else {
        if (c < seg.length) { el.innerHTML += seg.charAt(c++); setTimeout(step, TYPING_SPEED_MS); }
        else { p++; c = 0; step(); }
      }
    }
    step();
  }

  /* ----------------------- AUTO‑SKIP ------------------------------ */
  function resetTimer() {
    clearTimeout(autoTimer);
    autoTimer = null;
    barElm.style.transition = "none";
    barElm.style.transform  = "scaleX(1)";
    barElm.style.opacity    = "1";
  }

  function startTimer(chars) {
    const dur = Math.max(AUTO_SKIP_MIN_SEC*1000, AUTO_SKIP_BASE_MS + chars*AUTO_SKIP_PER_CHAR);
    autoStart  = Date.now();
    autoRemain = dur;

    barElm.style.transition = "none";
    barElm.style.transform  = "scaleX(1)";
    setTimeout(() => {
      barElm.style.transition = `transform ${dur}ms linear`;
      barElm.style.transform  = "scaleX(0)";
    }, 10);

    autoTimer = setTimeout(skip, dur);
  }

  /* Pause/resume on window focus loss */
  window.addEventListener("blur", () => {
    if (!autoTimer) return;
    clearTimeout(autoTimer);
    autoRemain -= Date.now() - autoStart;
    autoTimer  = null;
    const pct = autoRemain / (AUTO_SKIP_BASE_MS + AUTO_SKIP_MIN_SEC*1000);
    barElm.style.transition = "none";
    barElm.style.transform  = `scaleX(${pct})`;
  });

  window.addEventListener("focus", () => {
    if (autoTimer || !autoRemain) return;
    autoStart = Date.now();
    barElm.style.transition = `transform ${autoRemain}ms linear`;
    barElm.style.transform  = "scaleX(0)";
    autoTimer = setTimeout(skip, autoRemain);
  });

  /* -------------------- MESSAGE DISPLAY --------------------------- */
  function showArrow() { arrowElm.style.display = queue.length ? "block" : "none"; }

  function display(entry) {
    resetTimer();
    const { speaker, msg, img, uid } = entry;

    // Show banner
    const nameEl = banner.querySelector("#vn-chat-name");
    const msgEl  = banner.querySelector("#vn-chat-msg");
    nameEl.textContent = speaker;
    banner.style.display = "flex";
    requestAnimationFrame(() => { banner.style.opacity = "1"; });

    // Portrait handling
    if (portraitOn()) {
      if (speaker !== currentSpeaker) {
        imgElm.style.opacity = "0";
        if (img) imgElm.src = img;
        imgElm.onload = () => { imgElm.style.opacity = "1"; };
        currentSpeaker = speaker;
      }
    }

    if (uid === game.user.id) playPing();

    typeHtml(msgEl, msg, () => {
      showArrow();
      if (document.hasFocus()) startTimer(msgEl.textContent.length);
    });
  }

  function skip() {
    if (typing) return;
    resetTimer();
    if (queue.length) display(queue.shift());
    else {
      banner.style.opacity = "0";
      imgElm.style.opacity = "0";
      setTimeout(() => { banner.style.display = "none"; currentSpeaker = null; }, 250);
    }
  }

  /* --------------------------- INPUT ------------------------------ */
    /* --------------------------- INPUT ------------------------------ */
  document.addEventListener("keydown", ev => {
    if (document.activeElement?.closest(".chat-message") || document.activeElement?.tagName === "TEXTAREA") return;
    if (document.querySelector(".app.window-app.sheet:not(.minimized)")) return;
    const key = game.settings.get("hearme-chat-notification", "skipKey").toLowerCase();
    if (ev.key.toLowerCase() === key || ev.key === "Tab") { ev.preventDefault(); skip(); }
  });

  /* ------------------------- CHAT HOOK --------------------------- */
  Hooks.on("createChatMessage", message => {
    if (!message.visible || message.isRoll) return;
    if (!message.speaker?.actor) return;

    const actor = game.actors.get(message.speaker.actor);
    if (!actor) return;

    let speaker = actor.name;
    let img     = actor.img;

    if (message.speaker.token) {
      const scn = game.scenes.active;
      const tkn = scn?.tokens.get(message.speaker.token);
      if (tkn) { speaker = tkn.name; img = tkn.texture.src; }
    }

    const entry = { speaker, msg: message.content.trim(), img, uid: message.user.id };
    if (banner.style.display === "flex") { queue.push(entry); showArrow(); }
    else display(entry);
  });

  /* --------------------------- INIT ------------------------------ */
  createDom();
})();

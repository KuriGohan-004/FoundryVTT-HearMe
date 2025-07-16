// === VN Chat Module with GM‑Controlled Portrait (Size & Offsets) ===
//  This is the **complete** script.  All prior functionality retained.
//  Three GM‑side (world) settings now control the portrait:
//    • portraitEnabled        – toggle on/off
//    • portraitSizePercent    – square size as % of viewport width (5–23)
//    • portraitOffsetXPercent – % of viewport width from left edge
//    • portraitOffsetYPercent – % of viewport height from bottom edge
//  Portrait (z‑index 98) always sits beneath the chat banner (z‑index 99).

/* ---------------------------------------------------------------------
 *  INIT: register settings
 * ------------------------------------------------------------------ */
Hooks.once("init", () => {
  /* Core settings */
  game.settings.register("hearme-chat-notification", "pingSound", {
    name: "Chat Notification Sound",
    hint: "Sound to play when a VN message appears.",
    scope: "world",
    config: true,
    type: String,
    default: "modules/hearme-chat-notification/ui/chat-ping.ogg",
    filePicker: "audio"
  });

  game.settings.register("hearme-chat-notification", "skipKey", {
    name: "Skip Key (client)",
    hint: "Key for a player to skip/advance dialogue (default Q).",
    scope: "client",
    config: true,
    type: String,
    default: "q"
  });

  /* GM‑controlled portrait settings */
  game.settings.register("hearme-chat-notification", "portraitEnabled", {
    name: "Enable Portrait",
    hint: "Show character portrait next to VN banner.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "portraitSizePercent", {
    name: "Portrait Size (% of screen width)",
    hint: "Square size of portrait as a percentage of viewport width.",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 5, max: 23, step: 1 },
    default: 13
  });

  game.settings.register("hearme-chat-notification", "portraitOffsetXPercent", {
    name: "Portrait Offset X (% from left)",
    hint: "How far right the portrait starts, as % of viewport width (0 = flush left).",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 50, step: 1 },
    default: 0
  });

  game.settings.register("hearme-chat-notification", "portraitOffsetYPercent", {
    name: "Portrait Offset Y (% from bottom)",
    hint: "How far up from the bottom edge, as % of viewport height (0 = flush bottom).",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 50, step: 1 },
    default: 0
  });
});

/* =====================================================================
 *  MAIN MODULE LOGIC (IIFE)
 * ===================================================================*/
(() => {
  /* --------------------------- CONSTANTS ------------------------- */
  const AUTO_SKIP_MIN_SECONDS = 3;
  const AUTO_SKIP_BASE_DELAY  = 5000;  // ms
  const AUTO_SKIP_CHAR_DELAY  = 50;    // ms per character
  const TYPE_SPEED_MS         = 20;    // ms per character during typing

  /* --------------------------- STATE ----------------------------- */
  let banner   = document.getElementById("vn-chat-banner");
  let imgElem  = document.getElementById("vn-chat-image");
  let arrow    = document.getElementById("vn-chat-arrow");
  let timerBar = null;

  let typing         = false;
  let autoSkipTimer  = null;
  let autoSkipStart  = 0;
  let autoSkipRemain = 0;
  let currentSpeaker = null;
  const queue        = [];

  /* --------------------------- HELPERS --------------------------- */
  const gSetting = (key) => game.settings.get("hearme-chat-notification", key);

  function playChatSound() {
    const src = gSetting("pingSound");
    if (!src) return;
    if (game.audio?.context?.state === "suspended") game.audio.context.resume();
    AudioHelper.play({ src, volume: 0.8, autoplay: true, loop: false }, true);
  }

  function sanitizeHtml(str) {
    return str.replace(/<(?!\/?(br|b|strong|i|em|u)\b)[^>]*>/gi, "");
  }

  /* --------------------------- DOM SETUP ------------------------- */
  function ensureDom() {
    /* Banner ----------------------------------------------------- */
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "vn-chat-banner";
      Object.assign(banner.style, {
        position: "fixed",
        bottom: "calc(5% + 48px)",
        left: "20%",
        width: "60%",
        background: "rgba(0,0,0,0.75)",
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
      banner.innerHTML = 
        <div id="vn-chat-name" style="font-weight:bold;font-size:1.2em;margin-bottom:4px;"></div>
        <div id="vn-chat-msg"  style="font-size:2.2em;"></div>
        <div id="vn-chat-arrow" style="position:absolute;bottom:8px;right:16px;font-size:1.5em;opacity:0.5;display:none;">&#8595;</div>
        <div id="vn-chat-timer" style="position:absolute;bottom:0;left:0;height:5px;width:100%;background:white;transform-origin:left;transform:scaleX(1);transition:transform linear;opacity:1;"></div>;
      document.body.appendChild(banner);
      arrow    = document.getElementById("vn-chat-arrow");
      timerBar = document.getElementById("vn-chat-timer");
    }

    /* Portrait --------------------------------------------------- */
    if (!imgElem) {
      imgElem = document.createElement("img");
      imgElem.id = "vn-chat-image";
      Object.assign(imgElem.style, {
        position: "fixed",
        objectFit: "cover",
        zIndex: 98,               // beneath banner (99)
        pointerEvents: "none",
        transition: "opacity 0.5s ease",
        opacity: "0"
      });
      document.body.appendChild(imgElem);
    }

    applyPortraitSettings();
  }

  /* --------------- PORTRAIT SIZE & POSITION (GM SETTINGS) -------- */
  function applyPortraitSettings() {
    if (!imgElem) return;

    imgElem.style.display = gSetting("portraitEnabled") ? "block" : "none";

    const sizePct   = gSetting("portraitSizePercent");
    const offsetXPct = gSetting("portraitOffsetXPercent");
    const offsetYPct = gSetting("portraitOffsetYPercent");

    // Convert percentages to pixels based on current viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const sizePx = (sizePct / 100) * vw; // square based on width percent
    const leftPx = (offsetXPct / 100) * vw;
    const bottomPx = (offsetYPct / 100) * vh;

    Object.assign(imgElem.style, {
      width:  ${sizePx}px,
      height: ${sizePx}px,
      left:   ${leftPx}px,
      bottom: ${bottomPx}px
    });
  }

  /* Listen for setting changes (all clients) & window resize */
  Hooks.on("updateSetting", (namespace, key) => {
    if (namespace !== "hearme-chat-notification") return;
    if (["portraitEnabled", "portraitSizePercent", "portraitOffsetXPercent", "portraitOffsetYPercent"].includes(key)) {
      applyPortraitSettings();
    }
  });
  window.addEventListener("resize", applyPortraitSettings);

  /* ----------------------- PORTRAIT FADE‑IN ----------------------- */
  function showPortraitForSpeaker(name, imgSrc) {
    if (!gSetting("portraitEnabled")) return;
    if (name === currentSpeaker) return; // same speaker, keep portrait

    imgElem.style.opacity = "0";
    if (imgSrc) imgElem.src = imgSrc;
    imgElem.onload = () => {
      applyPortraitSettings(); // sizes correctly with actual image
      imgElem.style.opacity = "1";
    };
    currentSpeaker = name;
  }

  /* --------------------------- TYPEWRITER ------------------------ */
  function typeHtml(element, html, callback) {
    typing = true;
    const parts = sanitizeHtml(html).split(/(<[^>]+>)/).filter(Boolean);
    element.innerHTML = "";
    let p = 0, c = 0;
    (function next() {
      if (p >= parts.length) { typing = false; callback?.(); return; }
      const seg = parts[p];
      if (seg.startsWith("<")) { element.innerHTML += seg; p++; next(); }
      else {
        if (c < seg.length) { element.innerHTML += seg.charAt(c++); setTimeout(next, TYPE_SPEED_MS); }
        else { p++; c = 0; next(); }
      }
    })();
  }

  /* ------------------------ AUTO‑SKIP TIMER ---------------------- */
  function resetTimer() {
    clearTimeout(autoSkipTimer);
    autoSkipTimer = null;
    timerBar.style.transition = "none";
    timerBar.style.transform  = "scaleX(1)";
    timerBar.style.opacity    = "1";
  }

  function startTimer(charCount) {
    const duration = Math.max(AUTO_SKIP_MIN_SECONDS*1000, AUTO_SKIP_BASE_DELAY + charCount*AUTO_SKIP_CHAR_DELAY);
    autoSkipStart  = Date.now();
    autoSkipRemain = duration;

    timerBar.style.transition = transform ${duration}ms linear;
    timerBar.style.transform  = "scaleX(0)";
    autoSkipTimer = setTimeout(skipMessage, duration);
  }

  window.addEventListener("blur", () => {
    if (!autoSkipTimer) return;
    clearTimeout(autoSkipTimer);
    autoSkipRemain -= Date.now() - autoSkipStart;
    autoSkipTimer = null;
    const ratio = autoSkipRemain / (AUTO_SKIP_BASE_DELAY + AUTO_SKIP_MIN_SECONDS*1000);
    timerBar.style.transition = "none";
    timerBar.style.transform  = scaleX(${ratio});
  });

  window.addEventListener("focus", () => {
    if (autoSkipTimer || !autoSkipRemain) return;
    autoSkipStart = Date.now();
    timerBar.style.transition = transform ${autoSkipRemain}ms linear;
    timerBar.style.transform  = "scaleX(0)";
    autoSkipTimer = setTimeout(skipMessage, autoSkipRemain);
  });

  /* -------------------------- DISPLAY MSG ------------------------ */
  function updateArrow() { arrow.style.display = queue.length ? "block" : "none"; }

  function displayMessage({ name, msg, image, userId }) {
    resetTimer();

    const nameEl = banner.querySelector("#vn-chat-name");
    const msgEl  = banner.querySelector("#vn-chat-msg");

    nameEl.textContent = name;
    banner.style.display = "flex";
    requestAnimationFrame(() => { banner.style.opacity = "1"; });

    showPortraitForSpeaker(name, image);

    if (userId === game.user.id) playChatSound();

    typeHtml(msgEl, msg, () => {
      updateArrow();
      if (document.hasFocus()) startTimer(msgEl.textContent.length);
    });
  }

  function skipMessage() {
    if (typing) return;
    resetTimer();
    if (queue.length) displayMessage(queue.shift());
    else {
      banner.style.opacity = "0";
      imgElem.style.opacity = "0";
      setTimeout(() => { banner.style.display = "none"; currentSpeaker = null; }, 250);
    }
  }

  /* ----------------------------- INPUT --------------------------- */
  document.addEventListener("keydown", (ev) => {
    if (document.activeElement?.closest(".chat-message") || document.activeElement?.tagName === "TEXTAREA") return;
    if (document.querySelector(".app.window-app.sheet:not(.minimized)")) return;
    const key = gSetting("skipKey").toLowerCase();
    if (ev.key.toLowerCase() === key || ev.key === "Tab") { ev.preventDefault(); skipMessage(); }
  });

  /* ---------------------------- CHAT ----------------------------- */
  Hooks.on("createChatMessage", (message) => {
    if (!message.visible || message.isRoll) return;
    if (!message.speaker?.actor) return;

    const actor = game.actors.get(message.speaker.actor);
    if (!actor) return;

    let name = actor.name;
    let img  = actor.img;

    if (message.speaker.token) {
      const scene = game.scenes.active;
      const token = scene?.tokens.get(message.speaker.token);
      if (token) { name = token.name; img = token.texture.src; }
    }

    const entry = { name, msg: message.content.trim(), image: img, userId: message.user.id };
    if (banner.style.display === "flex") { queue.push(entry); updateArrow(); }
    else displayMessage(entry);
  });

  /* --------------------------- INIT ------------------------------ */
  ensureDom();
})();

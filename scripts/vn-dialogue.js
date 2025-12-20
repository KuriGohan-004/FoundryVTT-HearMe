// === VN Chat Module with GM-Controlled Portrait (Size & Offsets) ===

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
    hint: "Key for a player to skip/advance dialogue (default TAB).",
    scope: "client",
    config: true,
    type: String,
    default: "tab"
  });

  /* GM-controlled portrait settings */
  game.settings.register("hearme-chat-notification", "portraitEnabled", {
    name: "Enable Portrait",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "portraitSizePercent", {
    name: "Portrait Size (% of screen width)",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 5, max: 23, step: 1 },
    default: 13
  });

  game.settings.register("hearme-chat-notification", "portraitOffsetXPercent", {
    name: "Portrait Offset X (% from left)",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 50, step: 1 },
    default: 0
  });

  game.settings.register("hearme-chat-notification", "portraitOffsetYPercent", {
    name: "Portrait Offset Y (% from bottom)",
    scope: "world",
    config: true,
    type: Number,
    range: { min: 0, max: 50, step: 1 },
    default: 0
  });

  /* NEW: Disable VN during combat */
  game.settings.register("hearme-chat-notification", "disableDuringCombat", {
    name: "Disable VN Banner During Combat",
    hint: "When enabled, VN dialogue will not display while combat is active.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });
});

/* =====================================================================
 *  MAIN MODULE LOGIC (IIFE)
 * ===================================================================*/
(() => {
  const AUTO_SKIP_MIN_SECONDS = 3;
  const AUTO_SKIP_BASE_DELAY  = 5000;
  const AUTO_SKIP_CHAR_DELAY  = 50;
  const TYPE_SPEED_MS         = 20;

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

  const gSetting = (k) => game.settings.get("hearme-chat-notification", k);

  /* ---------------------- COMBAT CHECK --------------------------- */
  function combatBlocked() {
    return gSetting("disableDuringCombat") && game.combat?.started;
  }

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
        padding: "12px 20px",
        zIndex: 99,
        display: "none",
        flexDirection: "column",
        opacity: "0",
        transition: "opacity 0.25s ease",
        pointerEvents: "none"
      });
      banner.innerHTML = `
        <div id="vn-chat-name" style="font-weight:bold;font-size:1.2em;"></div>
        <div id="vn-chat-msg" style="font-size:2.2em;"></div>
        <div id="vn-chat-arrow" style="position:absolute;bottom:8px;right:16px;display:none;">&#8595;</div>
        <div id="vn-chat-timer" style="position:absolute;bottom:0;left:0;height:5px;width:100%;background:white;transform-origin:left;transform:scaleX(1);"></div>
      `;
      document.body.appendChild(banner);
      arrow = banner.querySelector("#vn-chat-arrow");
      timerBar = banner.querySelector("#vn-chat-timer");
    }

    if (!imgElem) {
      imgElem = document.createElement("img");
      imgElem.id = "vn-chat-image";
      Object.assign(imgElem.style, {
        position: "fixed",
        zIndex: 98,
        opacity: "0",
        transition: "opacity 0.5s ease",
        pointerEvents: "none"
      });
      document.body.appendChild(imgElem);
    }

    applyPortraitSettings();
  }

  function applyPortraitSettings() {
    if (!imgElem) return;
    imgElem.style.display = gSetting("portraitEnabled") ? "block" : "none";

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const sizePx   = (gSetting("portraitSizePercent") / 100) * vw;
    const leftPx   = (gSetting("portraitOffsetXPercent") / 100) * vw;
    const bottomPx = (gSetting("portraitOffsetYPercent") / 100) * vh;

    Object.assign(imgElem.style, {
      width: `${sizePx}px`,
      height: `${sizePx}px`,
      left: `${leftPx}px`,
      bottom: `${bottomPx}px`
    });
  }

  window.addEventListener("resize", applyPortraitSettings);

  /* --------------------------- TYPEWRITER ------------------------ */
  function typeHtml(el, html, done) {
    typing = true;
    const parts = sanitizeHtml(html).split(/(<[^>]+>)/).filter(Boolean);
    el.innerHTML = "";
    let p = 0, c = 0;

    (function next() {
      if (p >= parts.length) { typing = false; done?.(); return; }
      const seg = parts[p];
      if (seg.startsWith("<")) { el.innerHTML += seg; p++; next(); }
      else if (c < seg.length) { el.innerHTML += seg[c++]; setTimeout(next, TYPE_SPEED_MS); }
      else { p++; c = 0; next(); }
    })();
  }

  function startTimer(charCount) {
    const duration = Math.max(
      AUTO_SKIP_MIN_SECONDS * 1000,
      AUTO_SKIP_BASE_DELAY + charCount * AUTO_SKIP_CHAR_DELAY
    );
    autoSkipStart = Date.now();
    autoSkipRemain = duration;
    timerBar.style.transition = `transform ${duration}ms linear`;
    timerBar.style.transform = "scaleX(0)";
    autoSkipTimer = setTimeout(skipMessage, duration);
  }

  function resetTimer() {
    clearTimeout(autoSkipTimer);
    autoSkipTimer = null;
    timerBar.style.transition = "none";
    timerBar.style.transform = "scaleX(1)";
  }

  function displayMessage(entry) {
    resetTimer();

    const nameEl = banner.querySelector("#vn-chat-name");
    const msgEl  = banner.querySelector("#vn-chat-msg");

    nameEl.textContent = entry.name;
    banner.style.display = "flex";
    requestAnimationFrame(() => banner.style.opacity = "1");

    if (entry.image && gSetting("portraitEnabled")) {
      imgElem.src = entry.image;
      imgElem.style.opacity = "1";
    }

    if (entry.userId === game.user.id) playChatSound();

    typeHtml(msgEl, entry.msg, () => {
      arrow.style.display = queue.length ? "block" : "none";
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
      setTimeout(() => banner.style.display = "none", 250);
      currentSpeaker = null;
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === gSetting("skipKey") || e.key === "Tab") {
      e.preventDefault();
      skipMessage();
    }
  });

  /* ---------------------------- CHAT ----------------------------- */
  Hooks.on("createChatMessage", (message) => {
    // HARD FILTERS — never queue
    if (!message.visible || message.isRoll) return;
    if (!message.speaker?.actor) return;
    if (message.type === CONST.CHAT_MESSAGE_TYPES.WHISPER) return;
    if (message.content.trim().startsWith("@")) return;
    if (combatBlocked()) return;

    const actor = game.actors.get(message.speaker.actor);
    if (!actor) return;

    let name = actor.name;
    let img  = actor.img;

    if (message.speaker.token) {
      const token = canvas.scene?.tokens.get(message.speaker.token);
      if (token) { name = token.name; img = token.texture.src; }
    }

    const entry = { name, msg: message.content.trim(), image: img, userId: message.user.id };

    if (banner.style.display === "flex") queue.push(entry);
    else displayMessage(entry);
  });

  ensureDom();
})();

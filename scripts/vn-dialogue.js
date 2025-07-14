// === INIT SOUND & SKIP KEY SETTINGS ===
Hooks.once("init", () => {
  /* -------------------------------------------------------------------------
   *  ORIGINAL SETTINGS
   * --------------------------------------------------------------------- */
  game.settings.register("hearme-chat-notification", "pingSound", {
    name: "Chat Notification Sound",
    hint: "The sound to play when a new VN chat message is displayed.",
    scope: "world",
    config: true,
    type: String,
    default: "modules/hearme-chat-notification/ui/chat-ping.ogg",
    filePicker: "audio"
  });

  game.settings.register("hearme-chat-notification", "skipKey", {
    name: "Skip Key",
    hint: "The key to press to skip chat dialogue (default: Q).",
    scope: "client",
    config: true,
    type: String,
    default: "q"
  });

  /* -------------------------------------------------------------------------
   *  NEW SETTINGS
   * --------------------------------------------------------------------- */
  game.settings.register("hearme-chat-notification", "portraitEnabled", {
    name: "Enable Character Portrait",
    hint: "Toggle to show or hide character portraits in VN chat banner.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "portraitSize", {
    name: "Portrait Size (vw)",
    hint: "Width/height of the character portrait in viewport‑width units (e.g. 31).",
    scope: "client",
    config: true,
    type: Number,
    range: { min: 10, max: 60, step: 1 },
    default: 31
  });
});

/* ===========================================================================
 *  MAIN MODULE LOGIC (IIFE)
 * ======================================================================== */
(() => {
  /* -------------------------------------------------------------------------
   *  MODULE‑LEVEL STATE
   * --------------------------------------------------------------------- */
  const AUTO_SKIP_MIN_SECONDS = 3;
  const AUTO_SKIP_BASE_DELAY  = 5000; // ms
  const AUTO_SKIP_CHAR_DELAY  = 50;   // ms per character

  let banner         = document.getElementById("vn-chat-banner");
  let imgElem        = document.getElementById("vn-chat-image");
  let arrowElem      = document.getElementById("vn-chat-arrow");
  let timerBar       = null;

  let typing         = false;
  let autoSkipTimer  = null;
  let autoSkipStart  = 0;
  let autoSkipRemain = 0;
  let currentSpeaker = null;
  let currentMsg     = null;
  const queue        = [];

  /* -------------------------------------------------------------------------
   *  UTILITIES
   * --------------------------------------------------------------------- */
  const portraitEnabled = () => game.settings.get("hearme-chat-notification", "portraitEnabled");
  const portraitSize    = ()  => game.settings.get("hearme-chat-notification", "portraitSize");

  function playChatSound () {
    const path = game.settings.get("hearme-chat-notification", "pingSound");
    if (!path) return;
    if (game.audio?.context?.state === "suspended") game.audio.context.resume();
    AudioHelper.play({ src: path, volume: 0.8, autoplay: true, loop: false }, true);
  }

  function allowedHtml (str) {
    // keep only <br>, <b>, <strong>, <i>, <em>, <u>
    return str.replace(/<(?!\/?(br|b|strong|i|em|u)\b)[^>]*>/gi, "");
  }

  /* -------------------------------------------------------------------------
   *  DOM CREATION / UPDATE
   * --------------------------------------------------------------------- */
  function ensureDom () {
    // Banner
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
        pointerEvents: "none",
      });
      banner.innerHTML = `
        <div id="vn-chat-name" style="font-weight:bold;font-size:1.2em;margin-bottom:4px;"></div>
        <div id="vn-chat-msg"  style="font-size:2.2em;"></div>
        <div id="vn-chat-arrow" style="position:absolute;bottom:8px;right:16px;font-size:1.5em;opacity:0.5;display:none;">&#8595;</div>
        <div id="vn-chat-timer" style="position:absolute;bottom:0;left:0;height:5px;width:100%;background:white;transform-origin:left;transform:scaleX(1);transition:transform linear;opacity:1;"></div>`;
      document.body.appendChild(banner);

      arrowElem = document.getElementById("vn-chat-arrow");
      timerBar  = document.getElementById("vn-chat-timer");
    }

    // Portrait
    if (!imgElem) {
      imgElem = document.createElement("img");
      imgElem.id = "vn-chat-image";
      Object.assign(imgElem.style, {
        position: "fixed",
        bottom: "0",
        left: "0",
        objectFit: "contain",
        zIndex: 98,
        transition: "left 0.5s ease, opacity 0.5s ease",
        opacity: "0",
        pointerEvents: "none",
        border: "none"
      });
      document.body.appendChild(imgElem);
    }

    applyPortraitSettings();
  }

  function applyPortraitSettings () {
    if (!imgElem) return;
    const size = portraitSize();
    imgElem.style.width  = `${size}vw`;
    imgElem.style.height = `${size}vw`;
    imgElem.dataset.hideOffset = `${-(size + 4)}vw`;
    imgElem.style.display = portraitEnabled() ? "block" : "none";
  }

  Hooks.on("closeSettingsConfig", applyPortraitSettings);

  /* -------------------------------------------------------------------------
   *  TEXT TYPING
   * --------------------------------------------------------------------- */
  function typeHtml (el, html, speed = 20, done) {
    typing = true;
    const safe = allowedHtml(html);
    const segments = safe.split(/(<[^>]+>)/).filter(Boolean);
    el.innerHTML = "";

    let sIdx = 0, cIdx = 0;

    const advance = () => {
      if (sIdx >= segments.length) { typing = false; done?.(); return; }
      const seg = segments[sIdx];
      if (seg.startsWith("<")) { el.innerHTML += seg; sIdx++; advance(); }
      else {
        if (cIdx < seg.length) { el.innerHTML += seg.charAt(cIdx++); setTimeout(advance, speed); }
        else { sIdx++; cIdx = 0; advance(); }
      }
    };
    advance();
  }

  /* -------------------------------------------------------------------------
   *  AUTO‑SKIP TIMER
   * --------------------------------------------------------------------- */
  function resetTimer () {
    clearTimeout(autoSkipTimer);
    autoSkipTimer = null;
    timerBar.style.transition = "none";
    timerBar.style.transform  = "scaleX(1)";
    timerBar.style.opacity    = "1";
  }

  function startTimer (charCount) {
    const duration = Math.max(AUTO_SKIP_MIN_SECONDS * 1000, AUTO_SKIP_BASE_DELAY + charCount * AUTO_SKIP_CHAR_DELAY);
    autoSkipStart  = Date.now();
    autoSkipRemain = duration;

    timerBar.style.transition = "none";
    timerBar.style.transform  = "scaleX(1)";

    // Defer to allow property to take
    setTimeout(() => {
      timerBar.style.transition = `transform ${duration}ms linear`;
      timerBar.style.transform  = "scaleX(0)";
    }, 20);

    autoSkipTimer = setTimeout(() => skipMessage(), duration);
  }

  function pauseTimer () {
    if (!autoSkipTimer) return;
    clearTimeout(autoSkipTimer);
    autoSkipTimer = null;
    autoSkipRemain -= Date.now() - autoSkipStart;
    const progress = autoSkipRemain / (AUTO_SKIP_BASE_DELAY + 1000 * AUTO_SKIP_MIN_SECONDS);
    timerBar.style.transition = "none";
    timerBar.style.transform  = `scaleX(${progress})`;
  }

  function resumeTimer () {
    if (autoSkipTimer || !autoSkipRemain) return;
    autoSkipStart = Date.now();
    timerBar.style.transition = `transform ${autoSkipRemain}ms linear`;
    timerBar.style.transform  = "scaleX(0)";
    autoSkipTimer = setTimeout(() => skipMessage(), autoSkipRemain);
  }

  /* -------------------------------------------------------------------------
   *  MESSAGE DISPLAY
   * --------------------------------------------------------------------- */
  function updateArrow () { arrowElem.style.display = queue.length ? "block" : "none"; }

  function displayMessage ({ name, msg, image, userId }) {
    resetTimer();
    currentMsg = msg;

    const nameEl = banner.querySelector("#vn-chat-name");
    const msgEl  = banner.querySelector("#vn-chat-msg");

    nameEl.textContent = name;
    banner.style.display = "flex";
    requestAnimationFrame(() => banner.style.opacity = "1");

    // Portrait switching
    if (portraitEnabled()) {
      if (name !== currentSpeaker) {
        imgElem.style.opacity = "0";
        imgElem.style.left    = imgElem.dataset.hideOffset;
        if (image) imgElem.src = image;
        setTimeout(() => { imgElem.style.left = "0"; imgElem.style.opacity = "1"; }, 50);
        currentSpeaker = name;
      }
    }

    // Sound only for local user
    if (userId === game.user.id) playChatSound();

    typeHtml(msgEl, msg, 20, () => {
      updateArrow();
      if (document.hasFocus()) startTimer(msgEl.textContent.length);
    });
  }

  function skipMessage () {
    if (typing) return;
    resetTimer();
    if (queue.length) displayMessage(queue.shift());
    else {
      banner.style.opacity = "0";
      imgElem.style.opacity = "0";
      setTimeout(() => { banner.style.display = "none"; currentSpeaker = null; currentMsg = null; }, 250);
    }
  }

  /* -------------------------------------------------------------------------
   *  EVENT HANDLERS
   * --------------------------------------------------------------------- */
  document.addEventListener("keydown", ev => {
    if (document.activeElement?.closest(".chat-message") || document.activeElement?.tagName === "TEXTAREA") return; // typing in chat
    const sheetOpen = !!document.querySelector(".app.window-app.sheet:not(.minimized)");
    if (sheetOpen) return;

    const key = game.settings.get("hearme-chat-notification", "skipKey").toLowerCase();
    if (ev.key.toLowerCase() === key || ev.key === "Tab") { ev.preventDefault(); skipMessage(); }
  });

  window.addEventListener("blur",  pauseTimer);
  window.addEventListener("focus", resumeTimer);

  Hooks.on("createChatMessage", message => {
    if (!message.visible || message.isRoll) return; // ignore hidden & dice rolls
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

  /* -------------------------------------------------------------------------
   *  INITIALISATION
   * --------------------------------------------------------------------- */
  ensureDom();
})();

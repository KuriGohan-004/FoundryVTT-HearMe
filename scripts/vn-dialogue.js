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
  let queueIconsContainer = null;

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
        pointerEvents: "none",
        borderRadius: "8px",
        boxSizing: "border-box"
      });
      banner.innerHTML = `
        <div id="vn-chat-queue-icons" style="position:absolute;top:-40px;right:0;display:flex;gap:6px;pointer-events:none;z-index:101;"></div>
        <div id="vn-chat-name" style="font-weight:bold;font-size:1.2em;margin-bottom:4px;"></div>
        <div id="vn-chat-msg"  style="font-size:2.2em;"></div>
        <div id="vn-chat-arrow" style="position:absolute;bottom:8px;right:16px;font-size:1.5em;opacity:0.5;display:none;color:white;">&#8595;</div>
        <div id="vn-chat-timer" style="position:absolute;bottom:0;left:0;height:5px;width:100%;background:white;transform-origin:left;transform:scaleX(1);transition:transform linear;opacity:1;border-radius: 0 0 8px 8px;"></div>`;
      document.body.appendChild(banner);
      arrow    = document.getElementById("vn-chat-arrow");
      timerBar = document.getElementById("vn-chat-timer");
      queueIconsContainer = document.getElementById("vn-chat-queue-icons");

      // Add pulse animation CSS for arrow
      const style = document.createElement('style');
      style.textContent = `
        @keyframes arrowPulse {
          0%   { color: white; opacity: 1; }
          50%  { color: #222; opacity: 0.3; }
          100% { color: white; opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    /* Portrait --------------------------------------------------- */
    if (!imgElem) {
      imgElem = document.createElement("img");
      imgElem.id = "vn-chat-image";
      Object.assign(imgElem.style, {
        position: "fixed",
        objectFit: "contain",
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
      width:  `${sizePx}px`,
      height: `${sizePx}px`,
      left:   `${leftPx}px`,
      bottom: `${bottomPx}px`
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
    if (!timerBar) return;
    timerBar.style.transition = "none";
    timerBar.style.transform = "scaleX(1)";
    timerBar.style.opacity = "1";
    if (autoSkipTimer) clearTimeout(autoSkipTimer);
  }

  function startTimer(duration) {
    if (!timerBar) return;
    timerBar.style.transition = `transform ${duration}ms linear`;
    timerBar.style.transform = "scaleX(0)";
    autoSkipTimer = setTimeout(() => {
      autoSkipTimer = null;
      advanceQueue();
    }, duration);
  }

  /* ---------------------- NEW MESSAGE ARROW ----------------------- */
  function showArrow() {
    if (!arrow) return;
    arrow.style.display = "block";
    arrow.style.animation = "arrowPulse 1500ms infinite ease-in-out";
  }

  function hideArrow() {
    if (!arrow) return;
    arrow.style.animation = "";
    arrow.style.display = "none";
  }

  /* ----------------------- QUEUE ICONS RENDER -------------------- */
  function renderQueueIcons() {
    if (!queueIconsContainer) return;
    queueIconsContainer.innerHTML = ""; // clear old

    queue.forEach(msg => {
      if (!msg.tokenImg) return;
      const icon = document.createElement("img");
      icon.src = msg.tokenImg;
      icon.alt = msg.name || "Speaker";
      Object.assign(icon.style, {
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        border: "1.5px solid white",
        filter: "drop-shadow(0 0 2px black)"
      });
      queueIconsContainer.appendChild(icon);
    });

    // Hide container if no icons
    queueIconsContainer.style.display = queue.length ? "flex" : "none";
  }

  /* -------------------- SHOW MESSAGE FROM QUEUE ------------------ */
  function showMessage(msg) {
    if (!banner) return;
    resetTimer();
    hideArrow();

    showPortraitForSpeaker(msg.name, msg.tokenImg);

    // Show banner
    banner.style.display = "flex";
    banner.style.opacity = "1";
    banner.style.pointerEvents = "auto";

    const nameElem = document.getElementById("vn-chat-name");
    const msgElem  = document.getElementById("vn-chat-msg");

    if (nameElem) nameElem.textContent = msg.name || "";

    // Start typing effect, then auto skip timer + arrow
    typeHtml(msgElem, msg.content, () => {
      typing = false;

      if (msg.autoSkip) {
        const delay = Math.max(
          AUTO_SKIP_MIN_SECONDS * 1000,
          AUTO_SKIP_BASE_DELAY + (msg.content.length * AUTO_SKIP_CHAR_DELAY)
        );
        startTimer(delay);
        showArrow();
      } else {
        hideArrow();
        if (timerBar) timerBar.style.opacity = "0";
      }
    });
  }

  /* -------------------- ADVANCE QUEUE ---------------------------- */
  function advanceQueue() {
    if (typing) return; // wait for typing to finish
    if (queue.length === 0) {
      // Hide banner if no more messages
      if (banner) {
        banner.style.opacity = "0";
        banner.style.pointerEvents = "none";
        setTimeout(() => {
          banner.style.display = "none";
          if (timerBar) timerBar.style.opacity = "0";
        }, 250);
      }
      currentSpeaker = null;
      renderQueueIcons();
      return;
    }

    const next = queue.shift();
    renderQueueIcons();
    showMessage(next);
  }

  /* -------------------- ADD MESSAGE TO QUEUE --------------------- */
  function queueMessage(name, content, tokenImg, autoSkip = true) {
    queue.push({ name, content, tokenImg, autoSkip });
    renderQueueIcons();

    // Major fix: if no message is currently displayed, immediately advance
    if (!typing && (banner.style.display === "none" || banner.style.opacity === "0")) {
      advanceQueue();
    }
  }

  /* -------------------- MESSAGE RECEIVED HOOK -------------------- */
  Hooks.on("chatMessageReceived", (msgData) => {
    // Example expected msgData: { name, content, tokenImg, autoSkip }
    // The game or module must call this hook with message data objects
    queueMessage(msgData.name, msgData.content, msgData.tokenImg, msgData.autoSkip);
  });

  /* ---------------------- INIT DOM & HOOKS ---------------------- */
  Hooks.once("ready", () => {
    ensureDom();

    // Example: Testing with dummy messages
    /*
    queueMessage("Alice", "Hello there! This is the first message.", "modules/mytokens/alice.png", true);
    queueMessage("Bob", "And here comes Bob with the next message.", "modules/mytokens/bob.png", true);
    queueMessage("Charlie", "Finally Charlie arrives!", "modules/mytokens/charlie.png", true);
    */
  });

  /* ---------------------- EXPOSE QUEUE MESSAGE ------------------- */
  // If you want to send a message externally, you can call this:
  window.vnChatNotify = queueMessage;

})();

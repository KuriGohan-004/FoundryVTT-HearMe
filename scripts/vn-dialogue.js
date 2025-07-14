// === INIT SOUND & SKIP KEY SETTINGS ===
Hooks.once("init", () => {
  /* ---------------------------------------------------------------------
   * STANDARD SETTINGS (unchanged)
   * ------------------------------------------------------------------ */
  game.settings.register("hearme-chat-notification", "pingSound", {
    name: "Chat Notification Sound",
    hint: "The sound to play when a new VN chat message is displayed.",
    scope: "world",                // world‑level, GM changeable
    config: true,
    type: String,
    default: "modules/hearme-chat-notification/ui/chat-ping.ogg",
    filePicker: "audio"
  });

  game.settings.register("hearme-chat-notification", "skipKey", {
    name: "Skip Key",
    hint: "Key to press to skip chat dialogue (default: Q).",
    scope: "client",               // client‑side preference
    config: true,
    type: String,
    default: "q"
  });

  /* ---------------------------------------------------------------------
   * PORTRAIT SETTINGS (now world‑level)
   * ------------------------------------------------------------------ */
  game.settings.register("hearme-chat-notification", "portraitEnabled", {
    name: "Enable Character Portrait",
    hint: "Toggle display of character portraits in the VN banner (GM‑only).",
    scope: "world",                // GM controls for all clients
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "portraitSize", {
    name: "Portrait Size (vw)",
    hint: "Width/height of the portrait as viewport‑width units (GM‑only).",
    scope: "world",                // GM controls for all clients
    config: true,
    type: Number,
    range: { min: 5, max: 23, step: 1 },
    default: 13
  });
});

/* ========================================================================
 *  MAIN MODULE LOGIC (IIFE)
 * ===================================================================== */
(() => {
  /* --------------------------- CONSTANTS ----------------------------- */
  const AUTO_SKIP_MIN_SECONDS = 3;
  const AUTO_SKIP_BASE_DELAY  = 5000;   // ms
  const AUTO_SKIP_CHAR_DELAY  = 50;     // ms / character

  /* --------------------------- STATE -------------------------------- */
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

  /* --------------------------- HELPERS ------------------------------ */
  const portraitEnabled = () => game.settings.get("hearme-chat-notification", "portraitEnabled");
  const portraitSize    = ()  => game.settings.get("hearme-chat-notification", "portraitSize");

  function playChatSound() {
    const src = game.settings.get("hearme-chat-notification", "pingSound");
    if (!src) return;
    if (game.audio?.context?.state === "suspended") game.audio.context.resume();
    AudioHelper.play({ src, volume: 0.8, autoplay: true, loop: false }, true);
  }

  function sanitizeHtml(str) {
    return str.replace(/<(?!\/?(br|b|strong|i|em|u)\b)[^>]*>/gi, "");
  }

  /* --------------------------- DOM SETUP ---------------------------- */
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
        <div id="vn-chat-msg" style="font-size:2.2em;"></div>
        <div id="vn-chat-arrow" style="position:absolute;bottom:8px;right:16px;font-size:1.5em;opacity:0.5;display:none;">&#8595;</div>
        <div id="vn-chat-timer" style="position:absolute;bottom:0;left:0;height:5px;width:100%;background:white;transform-origin:left;transform:scaleX(1);transition:transform linear;opacity:1;"></div>`;
      document.body.appendChild(banner);
      arrow    = document.getElementById("vn-chat-arrow");
      timerBar = document.getElementById("vn-chat-timer");
    }

    if (!imgElem) {
      imgElem = document.createElement("img");
      imgElem.id = "vn-chat-image";
      Object.assign(imgElem.style, {
        position: "fixed",
        objectFit: "contain",
        zIndex: 98,
        pointerEvents: "none",
        transition: "opacity 0.5s ease",
        opacity: "0",
        left: "0",
        top: "0"
      });
      document.body.appendChild(imgElem);
    }

    applyPortraitSettings();
  }

  function applyPortraitSettings() {
    if (!imgElem) return;
    const size = portraitSize();
    imgElem.style.width  = `${size}vw`;
    imgElem.style.height = `${size}vw`;
    imgElem.style.display = portraitEnabled() ? "block" : "none";
    positionPortrait();
  }

  Hooks.on("libWrapper.Ready", () => {
    game.settings.on("change", (setting) => {
      if (setting.key.startsWith("hearme-chat-notification.portrait")) applyPortraitSettings();
    });
  });

  window.addEventListener("resize", positionPortrait);

  function positionPortrait() {
    if (!portraitEnabled() || !banner || !imgElem) return;
    const bannerRect = banner.getBoundingClientRect();
    const imgWidth = imgElem.getBoundingClientRect().width;
    const imgHeight = imgElem.getBoundingClientRect().height;
    const left = bannerRect.left - imgWidth;
    const top  = bannerRect.top + (bannerRect.height / 2) - (imgHeight / 2);

    imgElem.style.left = `${left}px`;
    imgElem.style.top  = `${top}px`;
  }

  function typeHtml(el, html, speed = 20, done) {
    typing = true;
    const parts = sanitizeHtml(html).split(/(<[^>]+>)/).filter(Boolean);
    el.innerHTML = "";
    let p = 0, c = 0;
    const next = () => {
      if (p >= parts.length) { typing = false; done?.(); return; }
      const seg = parts[p];
      if (seg.startsWith("<")) { el.innerHTML += seg; p++; next(); }
      else {
        if (c < seg.length) { el.innerHTML += seg.charAt(c++); setTimeout(next, speed); }
        else { p++; c = 0; next(); }
      }
    };
    next();
  }

  function resetTimer() {
    clearTimeout(autoSkipTimer);
    autoSkipTimer = null;
    timerBar.style.transition = "none";
    timerBar.style.transform  = "scaleX(1)";
    timerBar.style.opacity    = "1";
  }

  function startTimer(chars) {
    const duration = Math.max(AUTO_SKIP_MIN_SECONDS * 1000, AUTO_SKIP_BASE_DELAY + chars * AUTO_SKIP_CHAR_DELAY);
    autoSkipStart  = Date.now();
    autoSkipRemain = duration;

    timerBar.style.transition = "none";
    timerBar.style.transform  = `scaleX(1)`;

    setTimeout(() => {
      timerBar.style.transition = `transform ${duration}ms linear`;
      timerBar.style.transform  = `scaleX(0)`;
      autoSkipTimer = setTimeout(() => {
        skipCurrentLine();
      }, duration);
    }, 10);
  }

  function skipCurrentLine() {
    if (typing) {
      const el = document.getElementById("vn-chat-msg");
      typing = false;
      el.innerHTML = queue[0]?.message || "";
      arrow.style.display = "block";
    } else {
      queue.shift();
      displayNext();
    }
  }

  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === game.settings.get("hearme-chat-notification", "skipKey")) {
      skipCurrentLine();
    }
  });

  function displayNext() {
    if (!queue.length) {
      banner.style.opacity = "0";
      imgElem.style.opacity = "0";
      return;
    }

    ensureDom();
    const next = queue[0];
    const nameEl = document.getElementById("vn-chat-name");
    const msgEl  = document.getElementById("vn-chat-msg");

    nameEl.textContent = next.speaker || "";
    arrow.style.display = "none";
    banner.style.display = "flex";
    banner.style.opacity = "1";

    if (next.image && portraitEnabled()) {
      imgElem.src = next.image;
      imgElem.onload = () => {
        imgElem.style.opacity = "1";
        positionPortrait();
      };
    } else {
      imgElem.style.opacity = "0";
    }

    playChatSound();
    typeHtml(msgEl, next.message, 20, () => {
      arrow.style.display = "block";
      startTimer(next.message.length);
    });
  }

  game.socket.on("module.hearme-chat-notification", ({ speaker, message, image }) => {
    queue.push({ speaker, message, image });
    if (!typing) displayNext();
  });
})();

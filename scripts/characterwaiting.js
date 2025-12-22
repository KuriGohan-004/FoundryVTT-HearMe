// CharactersWaiting.js
// Fresh, simple, reliable version

Hooks.once("init", () => {
  game.settings.register("hearme-chat-notification", "vnWaitingBarEnabled", {
    name: "Enable Characters Waiting Bar",
    hint: "Shows a row of portraits for upcoming speakers.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "vnWaitingShowCurrent", {
    name: "Show Current Speaker",
    hint: "Include the active speaker's portrait in the bar.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "vnWaitingAlignRight", {
    name: "Align Bar to Right",
    hint: "If enabled, bar is right-aligned and queue grows right-to-left (next speaker on right).",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("hearme-chat-notification", "vnWaitingMaxUpcoming", {
    name: "Max Upcoming Speakers Shown",
    hint: "How many future speakers to show (not counting current).",
    scope: "world",
    config: true,
    type: Number,
    default: 4,
    range: { min: 1, max: 10, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingSizePct", {
    name: "Waiting Portrait Size (%)",
    hint: "Size as percentage of screen width.",
    scope: "world",
    config: true,
    type: Number,
    default: 8,
    range: { min: 3, max: 20, step: 0.5 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingGapPx", {
    name: "Gap Between Portraits (px)",
    hint: "Positive = space, negative = overlap.",
    scope: "world",
    config: true,
    type: Number,
    default: 10,
    range: { min: -50, max: 100, step: 5 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingOffsetXPct", {
    name: "Horizontal Margin from Edge (%)",
    hint: "Distance from left (normal) or right (mirrored) edge.",
    scope: "world",
    config: true,
    type: Number,
    default: 5,
    range: { min: 0, max: 50, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingOffsetYPct", {
    name: "Distance from Bottom (%)",
    hint: "How far up from bottom the bar appears.",
    scope: "world",
    config: true,
    type: Number,
    default: 25,
    range: { min: 0, max: 80, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingGrayscale", {
    name: "Grayscale Upcoming Speakers",
    hint: "Only the current speaker is in color.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

Hooks.once("ready", () => {
  if (!game.settings.get("hearme-chat-notification", "vnEnabled")) return;

  const waitingBar = document.createElement("div");
  waitingBar.id = "vn-waiting-bar";
  Object.assign(waitingBar.style, {
    position: "fixed",
    display: "flex",
    pointerEvents: "none",
    zIndex: 998,
    opacity: 0,
    transition: "opacity 0.4s ease",
    gap: "10px",
    bottom: "25%",
  });
  document.body.appendChild(waitingBar);

  let queue = []; // [message, message, ...] — upcoming only
  let currentMsg = null; // currently displayed message

  function getSrc(msg) {
    if (msg.speaker?.token) {
      const token = game.scenes.active?.tokens.get(msg.speaker.token);
      if (token) return token.texture.src;
    }
    return game.actors.get(msg.speaker?.actor)?.img || "";
  }

  function rebuild() {
    if (!game.settings.get("hearme-chat-notification", "vnWaitingBarEnabled")) {
      waitingBar.innerHTML = "";
      waitingBar.style.opacity = "0";
      return;
    }

    const showCurrent = game.settings.get("hearme-chat-notification", "vnWaitingShowCurrent");
    const alignRight = game.settings.get("hearme-chat-notification", "vnWaitingAlignRight");
    const maxUpcoming = game.settings.get("hearme-chat-notification", "vnWaitingMaxUpcoming");
    const size = game.settings.get("hearme-chat-notification", "vnWaitingSizePct") / 100 * window.innerWidth;
    const gap = game.settings.get("hearme-chat-notification", "vnWaitingGapPx");
    const offsetX = game.settings.get("hearme-chat-notification", "vnWaitingOffsetXPct") / 100 * window.innerWidth;
    const bottom = game.settings.get("hearme-chat-notification", "vnWaitingOffsetYPct") / 100 * window.innerHeight;

    waitingBar.style.gap = `${gap}px`;
    waitingBar.style.bottom = `${bottom}px`;
    waitingBar.style.flexDirection = alignRight ? "row-reverse" : "row";
    if (alignRight) {
      waitingBar.style.right = `${offsetX}px`;
      waitingBar.style.left = "auto";
    } else {
      waitingBar.style.left = `${offsetX}px`;
      waitingBar.style.right = "auto";
    }

    // Build list of messages to show
    const toShow = [];
    if (showCurrent && currentMsg) toShow.push({msg: currentMsg, current: true});
    toShow.push(...queue.slice(0, maxUpcoming).map(m => ({msg: m, current: false})));

    // Clear removed portraits with animation
    Array.from(waitingBar.children).forEach((el, i) => {
      if (i >= toShow.length || el.dataset.msgId !== toShow[i]?.msg.id) {
        el.style.opacity = "0";
        el.style.transform = alignRight ? "translateX(-100%)" : "translateX(100%)";
        setTimeout(() => el.remove(), 400);
      }
    });

    // Add/update portraits
    toShow.forEach((item, i) => {
      let el = [...waitingBar.children].find(e => e.dataset.msgId === item.msg.id);
      if (!el) {
        el = document.createElement("img");
        el.dataset.msgId = item.msg.id;
        el.style.opacity = "0";
        el.style.transform = alignRight ? "translateX(-50%)" : "translateX(50%)";
        el.style.transition = "all 0.4s ease";
        waitingBar.appendChild(el);
        setTimeout(() => {
          el.style.opacity = "1";
          el.style.transform = "translateX(0)";
        }, 50);
      }

      el.src = getSrc(item.msg);
      el.style.width = el.style.height = `${size}px`;
      el.style.borderRadius = "50%";
      el.style.objectFit = "cover";

      if (game.settings.get("hearme-chat-notification", "vnWaitingGrayscale")) {
        el.style.filter = item.current ? "none" : "grayscale(100%)";
      } else {
        el.style.filter = "none";
      }

      // Ensure correct order
      if (waitingBar.children[i] !== el) {
        waitingBar.insertBefore(el, waitingBar.children[i] || null);
      }
    });

    waitingBar.style.opacity = toShow.length > 0 ? "1" : "0";
  }

  // When a qualifying message is created → add to queue
  Hooks.on("createChatMessage", (msg) => {
    if (!msg.visible || msg.isRoll || msg.type === CONST.CHAT_MESSAGE_TYPES.WHISPER) return;
    const content = msg.content?.trim();
    if (!content || content.startsWith("/ooc") || !msg.speaker?.actor) return;

    queue.push(msg);
    rebuild();
  });

  // Detect when banner shows a new speaker (name changes)
  function watchBanner() {
    const nameEl = document.getElementById("vn-chat-name");
    const bannerEl = document.getElementById("vn-chat-banner");
    if (!nameEl || !bannerEl) {
      setTimeout(watchBanner, 500);
      return;
    }

    let lastName = "";

    const observer = new MutationObserver(() => {
      const currentName = nameEl.textContent.trim();
      const visible = bannerEl.style.display !== "none";

      if (visible && currentName && currentName !== lastName) {
        // New speaker started
        lastName = currentName;
        if (queue.length > 0) {
          currentMsg = queue.shift();
        }
        rebuild();
      } else if (!visible && queue.length > 0 && currentMsg) {
        // Banner hidden, but we already advanced on name change
        // Nothing needed here
      }
    });

    observer.observe(nameEl, { childList: true, characterData: true, subtree: true });
    observer.observe(bannerEl, { attributes: true, attributeFilter: ["style"] });
  }

  watchBanner();

  // Settings/resizing
  window.addEventListener("resize", rebuild);
  Hooks.on("renderSettingsConfig", rebuild);
});

// CharactersWaiting.js
// Fully standalone "Characters Waiting" portrait bar
// No dependency on main script variables or hooks

Hooks.once("init", () => {
  game.settings.register("hearme-chat-notification", "vnWaitingBarEnabled", {
    name: "Enable Characters Waiting Bar",
    hint: "Show a horizontal row of upcoming speaker portraits.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "vnWaitingMaxShown", {
    name: "Max Portraits Shown",
    hint: "Maximum number of upcoming portraits to display.",
    scope: "world",
    config: true,
    type: Number,
    default: 4,
    range: { min: 1, max: 10, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingSizePct", {
    name: "Waiting Portrait Size (%)",
    hint: "Size of each portrait as % of screen width.",
    scope: "world",
    config: true,
    type: Number,
    default: 8,
    range: { min: 3, max: 20, step: 0.5 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingGapPx", {
    name: "Gap Between Portraits (px)",
    hint: "Space between portraits. Negative values allow overlap.",
    scope: "world",
    config: true,
    type: Number,
    default: 10,
    range: { min: -50, max: 100, step: 5 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingOffsetXPct", {
    name: "Waiting Bar Offset X (%)",
    hint: "Horizontal position (left edge = 0, right edge = 100).",
    scope: "world",
    config: true,
    type: Number,
    default: 50,
    range: { min: 0, max: 100, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingOffsetYPct", {
    name: "Waiting Bar Offset Y (%)",
    hint: "Distance from bottom of screen.",
    scope: "world",
    config: true,
    type: Number,
    default: 25,
    range: { min: 0, max: 80, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingGrayscale", {
    name: "Grayscale Waiting Portraits",
    hint: "Show waiting portraits in grayscale (next speaker in full color).",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

Hooks.once("ready", () => {
  if (!game.settings.get("hearme-chat-notification", "vnEnabled")) return;

  let waitingBar = null;
  let waitingPortraits = []; // Array of { imgEl, messageId }
  let internalQueue = [];    // Our own copy of queued messages
  let currentMessageId = null; // ID of currently displayed message

  function createWaitingBar() {
    if (waitingBar) return;

    waitingBar = document.createElement("div");
    waitingBar.id = "vn-waiting-bar";
    waitingBar.style.position = "fixed";
    waitingBar.style.display = "flex";
    waitingBar.style.flexDirection = "row";
    waitingBar.style.pointerEvents = "none";
    waitingBar.style.zIndex = 998;
    waitingBar.style.opacity = "0";
    waitingBar.style.transition = "opacity 0.4s ease";
    waitingBar.style.transform = "translateX(-50%)";

    document.body.appendChild(waitingBar);

    applySettings();
    window.addEventListener("resize", applySettings);
  }

  function applySettings() {
    if (!waitingBar) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const size = game.settings.get("hearme-chat-notification", "vnWaitingSizePct") / 100 * vw;
    const gap = game.settings.get("hearme-chat-notification", "vnWaitingGapPx");
    const left = game.settings.get("hearme-chat-notification", "vnWaitingOffsetXPct") / 100 * vw;
    const bottom = game.settings.get("hearme-chat-notification", "vnWaitingOffsetYPct") / 100 * vh;

    waitingBar.style.gap = `${gap}px`;
    waitingBar.style.left = `${left}px`;
    waitingBar.style.bottom = `${bottom}px`;

    waitingPortraits.forEach((port, index) => {
      port.imgEl.style.width = `${size}px`;
      port.imgEl.style.height = `${size}px`;
      port.imgEl.style.borderRadius = "50%";
      port.imgEl.style.objectFit = "cover";
      port.imgEl.style.boxShadow = "0 4px 12px rgba(0,0,0,0.6)";
      port.imgEl.style.transition = "all 0.4s ease";

      const isNext = index === 0;
      if (game.settings.get("hearme-chat-notification", "vnWaitingGrayscale")) {
        port.imgEl.style.filter = isNext ? "none" : "grayscale(100%)";
      } else {
        port.imgEl.style.filter = "none";
      }
    });

    updateVisibility();
  }

  function updateVisibility() {
    if (!waitingBar) return;
    const enabled = game.settings.get("hearme-chat-notification", "vnWaitingBarEnabled");
    waitingBar.style.opacity = enabled && waitingPortraits.length > 0 ? "1" : "0";
  }

  function getPortraitSrc(message) {
    if (message.speaker?.token) {
      const scene = game.scenes.active;
      const token = scene?.tokens.get(message.speaker.token);
      return token?.texture.src || game.actors.get(message.speaker.actor)?.img || "";
    }
    return game.actors.get(message.speaker?.actor)?.img || "";
  }

  function rebuildWaitingBar() {
    if (!game.settings.get("hearme-chat-notification", "vnWaitingBarEnabled")) {
      waitingPortraits.forEach(p => p.imgEl.remove());
      waitingPortraits = [];
      updateVisibility();
      return;
    }

    createWaitingBar();

    const max = game.settings.get("hearme-chat-notification", "vnWaitingMaxShown");
    const upcoming = internalQueue.slice(0, max);

    const currentIds = upcoming.map(m => m.id);
    const toRemove = waitingPortraits.filter(p => !currentIds.includes(p.messageId));

    // Animate out removed portraits
    toRemove.forEach(port => {
      port.imgEl.style.transform = "translateX(100%)";
      port.imgEl.style.opacity = "0";
      setTimeout(() => port.imgEl.remove(), 400);
    });

    waitingPortraits = waitingPortraits.filter(p => currentIds.includes(p.messageId));

    // Add new ones
    upcoming.forEach((msg, index) => {
      if (!waitingPortraits.find(p => p.messageId === msg.id)) {
        const img = document.createElement("img");
        img.src = getPortraitSrc(msg);
        img.style.opacity = "0";
        img.style.transform = "translateX(50%)";
        waitingBar.appendChild(img);

        img.offsetHeight; // force reflow
        img.style.opacity = "1";
        img.style.transform = "translateX(0)";

        waitingPortraits.push({ imgEl: img, messageId: msg.id });
      }
    });

    // Reorder to match queue
    upcoming.forEach((msg, index) => {
      const port = waitingPortraits.find(p => p.messageId === msg.id);
      if (port && waitingBar.children[index] !== port.imgEl) {
        waitingBar.insertBefore(port.imgEl, waitingBar.children[index] || null);
      }
    });

    applySettings();
  }

  // Listen to chat messages that would trigger the VN banner
  Hooks.on("createChatMessage", (message) => {
    if (!message.visible) return;
    if (message.isRoll) return;
    if (message.type === CONST.CHAT_MESSAGE_TYPES.WHISPER) return;
    const content = message.content?.trim();
    if (!content || content.startsWith("/ooc") || !message.speaker?.actor) return;

    // Add to our internal queue
    internalQueue.push(message);
    rebuildWaitingBar();
  });

  // When the banner hides (auto or skip), advance the queue
  // We detect this by watching when the VN banner disappears
  const observer = new MutationObserver(() => {
    const bannerEl = document.getElementById("vn-chat-banner");
    if (bannerEl && bannerEl.style.display === "none" && currentMessageId && internalQueue.length > 0) {
      // First in queue just finished
      if (internalQueue[0]?.id === currentMessageId) {
        internalQueue.shift();
        currentMessageId = internalQueue[0]?.id || null;
        rebuildWaitingBar();
      }
    } else if (bannerEl && bannerEl.style.display !== "none") {
      // Banner appeared - mark current
      const visibleMessages = internalQueue.filter(m => m.id); // all have id
      if (visibleMessages.length > 0) {
        currentMessageId = visibleMessages[0].id;
      }
    }
  });

  // Start observing once the body is ready
  observer.observe(document.body, { attributes: true, childList: true, subtree: true });

  // Also rebuild on setting changes
  Hooks.on("renderSettingsConfig", () => {
    rebuildWaitingBar();
  });
});

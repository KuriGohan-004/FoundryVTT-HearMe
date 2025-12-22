// CharactersWaiting.js
// Fixed: Queue advances immediately when next message starts (banner reappears with new name)

Hooks.once("init", () => {
  game.settings.register("hearme-chat-notification", "waitingQueueSeparator", {
    name: "=== HearMe Waiting Queue ===",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("hearme-chat-notification", "vnWaitingBarEnabled", {
    name: "Enable Waiting Queue Bar",
    hint: "Show a row of upcoming (and optionally current) speaker portraits.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "vnWaitingShowCurrent", {
    name: "Show Current Speaker",
    hint: "Include the currently speaking character's portrait at the start of the queue.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "vnWaitingMirrorQueue", {
    name: "Mirror Queue Direction",
    hint: "Reverse the order: upcoming portraits appear from right to left.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("hearme-chat-notification", "vnWaitingMaxShown", {
    name: "Max Upcoming Portraits",
    hint: "Maximum number of upcoming portraits (not including current if enabled).",
    scope: "world",
    config: true,
    type: Number,
    default: 4,
    range: { min: 1, max: 10, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingSizePct", {
    name: "Portrait Size (%)",
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
    name: "Bar Horizontal Position (%)",
    hint: "Position from left edge (0–100). Bar is centered around this point.",
    scope: "world",
    config: true,
    type: Number,
    default: 50,
    range: { min: 0, max: 100, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingOffsetYPct", {
    name: "Bar Distance from Bottom (%)",
    hint: "Distance from bottom of screen.",
    scope: "world",
    config: true,
    type: Number,
    default: 25,
    range: { min: 0, max: 80, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingGrayscale", {
    name: "Grayscale Waiting Portraits",
    hint: "Upcoming portraits in grayscale; current/next speaker in full color.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

Hooks.once("ready", () => {
  if (!game.settings.get("hearme-chat-notification", "vnEnabled")) return;

  let waitingBar = null;
  let waitingPortraits = [];
  let internalQueue = [];
  let currentMessageId = null;
  let lastSpeakerName = "";
  let debounceTimer = null;

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
    const mirror = game.settings.get("hearme-chat-notification", "vnWaitingMirrorQueue");

    const size = game.settings.get("hearme-chat-notification", "vnWaitingSizePct") / 100 * vw;
    const gap = game.settings.get("hearme-chat-notification", "vnWaitingGapPx");
    const left = game.settings.get("hearme-chat-notification", "vnWaitingOffsetXPct") / 100 * vw;
    const bottom = game.settings.get("hearme-chat-notification", "vnWaitingOffsetYPct") / 100 * vh;

    waitingBar.style.gap = `${gap}px`;
    waitingBar.style.left = `${left}px`;
    waitingBar.style.bottom = `${bottom}px`;
    waitingBar.style.flexDirection = mirror ? "row-reverse" : "row";

    waitingPortraits.forEach((port, index) => {
      port.imgEl.style.width = `${size}px`;
      port.imgEl.style.height = `${size}px`;
      port.imgEl.style.borderRadius = "50%";
      port.imgEl.style.objectFit = "cover";
      port.imgEl.style.transition = "all 0.4s ease";

      const isCurrentOrNext = port.isCurrent || index === (port.isCurrent ? 1 : 0);
      if (game.settings.get("hearme-chat-notification", "vnWaitingGrayscale")) {
        port.imgEl.style.filter = isCurrentOrNext ? "none" : "grayscale(100%)";
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
    const enabled = game.settings.get("hearme-chat-notification", "vnWaitingBarEnabled");
    if (!enabled) {
      waitingPortraits.forEach(p => p.imgEl.remove());
      waitingPortraits = [];
      updateVisibility();
      return;
    }

    createWaitingBar();

    const showCurrent = game.settings.get("hearme-chat-notification", "vnWaitingShowCurrent");
    const maxUpcoming = game.settings.get("hearme-chat-notification", "vnWaitingMaxShown");

    let displayList = [];

    if (showCurrent && currentMessageId) {
      const currentMsg = internalQueue.find(m => m.id === currentMessageId) ||
                         game.messages.get(currentMessageId);
      if (currentMsg) displayList.push({ msg: currentMsg, isCurrent: true });
    }

    const upcoming = internalQueue.slice(0, maxUpcoming);
    displayList = displayList.concat(upcoming.map(msg => ({ msg, isCurrent: false })));

    const desiredIds = displayList.map(item => item.msg.id);

    const toRemove = waitingPortraits.filter(p => !desiredIds.includes(p.messageId));
    toRemove.forEach(port => {
      const direction = game.settings.get("hearme-chat-notification", "vnWaitingMirrorQueue") ? "-100%" : "100%";
      port.imgEl.style.transform = `translateX(${direction})`;
      port.imgEl.style.opacity = "0";
      setTimeout(() => port.imgEl.remove(), 400);
    });
    waitingPortraits = waitingPortraits.filter(p => desiredIds.includes(p.messageId));

    displayList.forEach((item, index) => {
      if (!waitingPortraits.find(p => p.messageId === item.msg.id)) {
        const img = document.createElement("img");
        img.src = getPortraitSrc(item.msg);
        img.style.opacity = "0";
        const slideFrom = game.settings.get("hearme-chat-notification", "vnWaitingMirrorQueue") ? "-50%" : "50%";
        img.style.transform = `translateX(${slideFrom})`;
        waitingBar.appendChild(img);

        img.offsetHeight;
        img.style.opacity = "1";
        img.style.transform = "translateX(0)";

        waitingPortraits.push({
          imgEl: img,
          messageId: item.msg.id,
          isCurrent: item.isCurrent
        });
      }
    });

    displayList.forEach((item, index) => {
      const port = waitingPortraits.find(p => p.messageId === item.msg.id);
      if (port && waitingBar.children[index] !== port.imgEl) {
        waitingBar.insertBefore(port.imgEl, waitingBar.children[index] || null);
      }
    });

    applySettings();
  }

  // Queue new messages
  Hooks.on("createChatMessage", (message) => {
    if (!message.visible) return;
    if (message.isRoll) return;
    if (message.type === CONST.CHAT_MESSAGE_TYPES.WHISPER) return;
    const content = message.content?.trim();
    if (!content || content.startsWith("/ooc") || !message.speaker?.actor) return;

    internalQueue.push(message);
    rebuildWaitingBar();
  });

  // Watch for banner show/hide AND name changes
  function startObservers() {
    const bannerEl = document.getElementById("vn-chat-banner");
    const nameEl = document.getElementById("vn-chat-name");

    if (!bannerEl || !nameEl) {
      setTimeout(startObservers, 500);
      return;
    }

    // Observe banner visibility
    const visibilityObserver = new MutationObserver(() => {
      const nowVisible = bannerEl.style.display !== "none";

      if (nowVisible && internalQueue.length > 0) {
        currentMessageId = internalQueue[0].id;
      }

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(rebuildWaitingBar, 150);
    });

    visibilityObserver.observe(bannerEl, { attributes: true, attributeFilter: ["style"] });

    // Observe name changes — this fires immediately when next message starts
    const nameObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList" || mutation.type === "characterData") {
          const newName = nameEl.textContent.trim();
          if (newName && newName !== lastSpeakerName) {
            lastSpeakerName = newName;

            // Next message just started — advance queue
            if (internalQueue.length > 0) {
              internalQueue.shift();
              currentMessageId = internalQueue[0]?.id || null;
            }

            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(rebuildWaitingBar, 100);
            break;
          }
        }
      }
    });

    nameObserver.observe(nameEl, { childList: true, characterData: true, subtree: true });
  }

  startObservers();

  // Rebuild on settings
  Hooks.on("renderSettingsConfig", () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(rebuildWaitingBar, 100);
  });

  // Initial build
  rebuildWaitingBar();
});

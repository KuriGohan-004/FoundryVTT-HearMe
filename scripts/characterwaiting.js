// CharactersWaiting.js
// Final version: proper coloring, true left/right alignment with mirror

Hooks.once("init", () => {
  game.settings.register("hearme-chat-notification", "vnWaitingBarEnabled", {
    name: "Enable Characters Waiting Bar",
    hint: "Show a row of upcoming (and optionally current) speaker portraits.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "vnWaitingShowCurrent", {
    name: "Show Current Speaker in Waiting Bar",
    hint: "Include the currently speaking character's portrait at the front of the queue.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "vnWaitingMirrorQueue", {
    name: "Align Waiting Bar to Right",
    hint: "If enabled, bar aligns to the right and queue grows right-to-left (next speaker on right). If disabled, aligns left and grows left-to-right.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("hearme-chat-notification", "vnWaitingMaxShown", {
    name: "Max Upcoming Portraits Shown",
    hint: "How many upcoming speakers to display (excluding current if enabled).",
    scope: "world",
    config: true,
    type: Number,
    default: 4,
    range: { min: 1, max: 10, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingSizePct", {
    name: "Waiting Portrait Size (%)",
    hint: "Size of portraits as percentage of screen width.",
    scope: "world",
    config: true,
    type: Number,
    default: 8,
    range: { min: 3, max: 20, step: 0.5 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingGapPx", {
    name: "Gap Between Waiting Portraits (px)",
    hint: "Space between portraits. Use negative values to overlap.",
    scope: "world",
    config: true,
    type: Number,
    default: 10,
    range: { min: -50, max: 100, step: 5 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingOffsetXPct", {
    name: "Waiting Bar Horizontal Offset (%)",
    hint: "Left offset when aligned left, right offset when aligned right.",
    scope: "world",
    config: true,
    type: Number,
    default: 5,
    range: { min: 0, max: 50, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingOffsetYPct", {
    name: "Waiting Bar Distance from Bottom (%)",
    hint: "How far up from the bottom of the screen the bar appears.",
    scope: "world",
    config: true,
    type: Number,
    default: 25,
    range: { min: 0, max: 80, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingGrayscale", {
    name: "Grayscale Upcoming Portraits",
    hint: "Show only the current speaker in color; all waiting ones in grayscale.",
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

    document.body.appendChild(waitingBar);

    applySettings();
    window.addEventListener("resize", applySettings);
  }

  function applySettings() {
    if (!waitingBar) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mirror = game.settings.get("hearme-chat-notification", "vnWaitingMirrorQueue");
    const offsetX = game.settings.get("hearme-chat-notification", "vnWaitingOffsetXPct") / 100 * vw;

    const size = game.settings.get("hearme-chat-notification", "vnWaitingSizePct") / 100 * vw;
    const gap = game.settings.get("hearme-chat-notification", "vnWaitingGapPx");
    const bottom = game.settings.get("hearme-chat-notification", "vnWaitingOffsetYPct") / 100 * vh;

    waitingBar.style.gap = `${gap}px`;
    waitingBar.style.bottom = `${bottom}px`;
    waitingBar.style.flexDirection = mirror ? "row-reverse" : "row";

    // Alignment: left or right, not centered
    if (mirror) {
      waitingBar.style.right = `${offsetX}px`;
      waitingBar.style.left = "auto";
      waitingBar.style.transform = "none";
    } else {
      waitingBar.style.left = `${offsetX}px`;
      waitingBar.style.right = "auto";
      waitingBar.style.transform = "none";
    }

    waitingPortraits.forEach((port) => {
      port.imgEl.style.width = `${size}px`;
      port.imgEl.style.height = `${size}px`;
      port.imgEl.style.borderRadius = "50%";
      port.imgEl.style.objectFit = "cover";
      port.imgEl.style.transition = "all 0.4s ease";

      // Only current speaker in color; all others grayscale
      if (game.settings.get("hearme-chat-notification", "vnWaitingGrayscale")) {
        port.imgEl.style.filter = port.isCurrent ? "none" : "grayscale(100%)";
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
    if (!enabled || (internalQueue.length === 0 && !currentMessageId)) {
      waitingPortraits.forEach(p => {
        const direction = game.settings.get("hearme-chat-notification", "vnWaitingMirrorQueue") ? "-100%" : "100%";
        p.imgEl.style.transform = `translateX(${direction})`;
        p.imgEl.style.opacity = "0";
        setTimeout(() => { if (p.imgEl.parentElement) p.imgEl.remove(); }, 400);
      });
      waitingPortraits = [];
      updateVisibility();
      return;
    }

    createWaitingBar();

    const showCurrent = game.settings.get("hearme-chat-notification", "vnWaitingShowCurrent");
    const maxUpcoming = game.settings.get("hearme-chat-notification", "vnWaitingMaxShown");
    const mirror = game.settings.get("hearme-chat-notification", "vnWaitingMirrorQueue");

    let displayList = [];

    if (showCurrent && currentMessageId) {
      const currentMsg = internalQueue.find(m => m.id === currentMessageId) || game.messages.get(currentMessageId);
      if (currentMsg) displayList.push({ msg: currentMsg, isCurrent: true });
    }

    const upcoming = internalQueue.slice(0, maxUpcoming);
    displayList = displayList.concat(upcoming.map(msg => ({ msg, isCurrent: false })));

    const desiredIds = displayList.map(item => item.msg.id);

    // Remove old
    const toRemove = waitingPortraits.filter(p => !desiredIds.includes(p.messageId));
    toRemove.forEach(port => {
      const direction = mirror ? "-100%" : "100%";
      port.imgEl.style.transform = `translateX(${direction})`;
      port.imgEl.style.opacity = "0";
      setTimeout(() => { if (port.imgEl.parentElement) port.imgEl.remove(); }, 400);
    });
    waitingPortraits = waitingPortraits.filter(p => desiredIds.includes(p.messageId));

    // Add new
    displayList.forEach((item, index) => {
      if (!waitingPortraits.find(p => p.messageId === item.msg.id)) {
        const img = document.createElement("img");
        img.src = getPortraitSrc(item.msg);
        img.style.opacity = "0";
        const slideFrom = mirror ? "-50%" : "50%";
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

    // Reorder (important for correct flex direction)
    displayList.forEach((item, index) => {
      const port = waitingPortraits.find(p => p.messageId === item.msg.id);
      if (port && waitingBar.children[index] !== port.imgEl) {
        waitingBar.insertBefore(port.imgEl, waitingBar.children[index] || null);
      }
    });

    applySettings();
  }

  Hooks.on("createChatMessage", (message) => {
    if (!message.visible) return;
    if (message.isRoll) return;
    if (message.type === CONST.CHAT_MESSAGE_TYPES.WHISPER) return;
    const content = message.content?.trim();
    if (!content || content.startsWith("/ooc") || !message.speaker?.actor) return;

    internalQueue.push(message);
    rebuildWaitingBar();
  });

  function startObservers() {
    const bannerEl = document.getElementById("vn-chat-banner");
    const nameEl = document.getElementById("vn-chat-name");

    if (!bannerEl || !nameEl) {
      setTimeout(startObservers, 500);
      return;
    }

    const visibilityObserver = new MutationObserver(() => {
      const visible = bannerEl.style.display !== "none";
      if (visible && internalQueue.length > 0) {
        currentMessageId = internalQueue[0].id;
      }
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(rebuildWaitingBar, 150);
    });
    visibilityObserver.observe(bannerEl, { attributes: true, attributeFilter: ["style"] });

    const nameObserver = new MutationObserver(() => {
      const newName = nameEl.textContent.trim();
      if (newName && newName !== lastSpeakerName) {
        lastSpeakerName = newName;
        if (internalQueue.length > 0) {
          internalQueue.shift();
          currentMessageId = internalQueue[0]?.id || null;
        }
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(rebuildWaitingBar, 100);
      }
    });
    nameObserver.observe(nameEl, { childList: true, characterData: true, subtree: true });
  }

  startObservers();

  Hooks.on("renderSettingsConfig", () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(rebuildWaitingBar, 100);
  });

  rebuildWaitingBar();
});

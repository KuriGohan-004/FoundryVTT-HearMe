// CharactersWaiting.js
// Visual Novel-style "waiting characters" portrait queue bar

Hooks.once("init", () => {
  // -----------------------------
  // Settings for Characters Waiting Bar
  // -----------------------------
  game.settings.register("hearme-chat-notification", "vnWaitingBarEnabled", {
    name: "Enable Characters Waiting Bar",
    hint: "Show a row of upcoming character portraits in the speaking queue.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "vnWaitingMaxShown", {
    name: "Max Portraits Shown",
    hint: "Maximum number of upcoming character portraits to display.",
    scope: "world",
    config: true,
    type: Number,
    default: 4,
    range: { min: 1, max: 10, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingSizePct", {
    name: "Waiting Portrait Size (%)",
    hint: "Size of each waiting portrait as % of screen width.",
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
    hint: "Distance from left edge of screen.",
    scope: "world",
    config: true,
    type: Number,
    default: 50,
    range: { min: 0, max: 100, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingOffsetYPct", {
    name: "Waiting Bar Offset Y (%)",
    hint: "Distance from bottom edge of screen.",
    scope: "world",
    config: true,
    type: Number,
    default: 25,
    range: { min: 0, max: 80, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingGrayscale", {
    name: "Grayscale Non-Speaking Portraits",
    hint: "Display waiting portraits in grayscale until they speak.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

Hooks.once("ready", () => {
  if (!game.settings.get("hearme-chat-notification", "vnEnabled")) return;

  let waitingBar = null;
  let waitingPortraits = []; // Array of { imgEl, actorId }

  function createWaitingBar() {
    if (waitingBar) return;

    waitingBar = document.createElement("div");
    waitingBar.id = "vn-waiting-bar";
    waitingBar.style.position = "fixed";
    waitingBar.style.bottom = "0";
    waitingBar.style.left = "0";
    waitingBar.style.display = "flex";
    waitingBar.style.flexDirection = "row";
    waitingBar.style.gap = "0px";
    waitingBar.style.pointerEvents = "none";
    waitingBar.style.zIndex = 998; // Below main banner
    waitingBar.style.transition = "all 0.3s ease";
    waitingBar.style.opacity = "0";

    document.body.appendChild(waitingBar);

    applyWaitingBarSettings();
    window.addEventListener("resize", applyWaitingBarSettings);
  }

  function applyWaitingBarSettings() {
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
    waitingBar.style.transform = "translateX(-50%)"; // Center horizontally around offset

    // Update existing portraits
    waitingPortraits.forEach(port => {
      port.imgEl.style.width = `${size}px`;
      port.imgEl.style.height = `${size}px`;
      port.imgEl.style.borderRadius = "50%";
      port.imgEl.style.objectFit = "cover";
      port.imgEl.style.boxShadow = "0 4px 12px rgba(0,0,0,0.6)";
      port.imgEl.style.transition = "all 0.4s ease";
      if (game.settings.get("hearme-chat-notification", "vnWaitingGrayscale")) {
        port.imgEl.style.filter = port.isNext ? "none" : "grayscale(100%)";
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

  function getTokenImage(message) {
    if (message.speaker?.token) {
      const scene = game.scenes.active;
      const token = scene?.tokens.get(message.speaker.token);
      return token?.texture.src || game.actors.get(message.speaker.actor)?.img || "";
    }
    return game.actors.get(message.speaker.actor)?.img || "";
  }

  function getActorId(message) {
    return message.speaker?.actor || null;
  }

  // Called when queue changes or current speaker changes
  function updateWaitingQueue(currentMessage, messageQueue) {
    if (!game.settings.get("hearme-chat-notification", "vnWaitingBarEnabled")) {
      waitingPortraits.forEach(p => p.imgEl.remove());
      waitingPortraits = [];
      updateVisibility();
      return;
    }

    createWaitingBar();

    const maxShown = game.settings.get("hearme-chat-notification", "vnWaitingMaxShown");
    const upcoming = messageQueue.slice(0, maxShown);

    const currentActorId = currentMessage ? getActorId(currentMessage) : null;
    const desiredActorIds = upcoming.map(msg => getActorId(msg));

    // Remove portraits no longer in upcoming queue
    waitingPortraits = waitingPortraits.filter(port => {
      if (!desiredActorIds.includes(port.actorId)) {
        port.imgEl.style.transform = "translateX(100%)";
        port.imgEl.style.opacity = "0";
        setTimeout(() => port.imgEl.remove(), 400);
        return false;
      }
      return true;
    });

    // Add new ones
    upcoming.forEach((msg, index) => {
      const actorId = getActorId(msg);
      if (!waitingPortraits.find(p => p.actorId === actorId)) {
        const img = document.createElement("img");
        img.src = getTokenImage(msg);
        img.style.opacity = "0";
        img.style.transform = "translateX(50%)";
        waitingBar.appendChild(img);

        // Trigger reflow for animation
        img.offsetHeight;

        img.style.opacity = "1";
        img.style.transform = "translateX(0)";

        waitingPortraits.push({
          imgEl: img,
          actorId: actorId,
          isNext: index === 0
        });
      }
    });

    // Reorder DOM to match queue order
    upcoming.forEach((msg, index) => {
      const actorId = getActorId(msg);
      const port = waitingPortraits.find(p => p.actorId === actorId);
      if (port && waitingBar.children[index] !== port.imgEl) {
        waitingBar.insertBefore(port.imgEl, waitingBar.children[index] || null);
      }
    });

    // Update grayscale and size
    applyWaitingBarSettings();

    updateVisibility();
  }

  // Hook into the main module's queue system
  // We override the queueMessage and processNextMessage to track the queue
  const originalQueueMessage = window.vnQueueMessage || (() => {});
  const originalProcessNextMessage = window.vnProcessNextMessage || (() => {});
  const originalShowBanner = window.vnShowBanner || (() => {});

  let localMessageQueue = [];
  let localCurrentMessage = null;

  window.vnQueueMessage = function(message) {
    originalQueueMessage(message);
    localMessageQueue.push(message);
    updateWaitingQueue(localCurrentMessage, localMessageQueue);
  };

  window.vnProcessNextMessage = function() {
    originalProcessNextMessage();
    if (localMessageQueue.length > 0) {
      localCurrentMessage = localMessageQueue.shift();
      updateWaitingQueue(localCurrentMessage, localMessageQueue);
    }
  };

  window.vnShowBanner = async function(message) {
    await originalShowBanner(message);
    // When current message changes (after show), shift queue
    if (message === localCurrentMessage) {
      updateWaitingQueue(localCurrentMessage, localMessageQueue);
    }
  };

  // On skip or auto-advance, remove the current speaker's waiting portrait
  Hooks.on("vnBannerHidden", () => { // You may need to dispatch this event in your main script
    localCurrentMessage = null;
    if (localMessageQueue.length > 0) {
      localCurrentMessage = localMessageQueue.shift();
    }
    updateWaitingQueue(localCurrentMessage, localMessageQueue);
  });

  // Initial cleanup on load
  updateWaitingQueue(null, []);

  // Listen for setting changes
  Hooks.on("modifyDocument", () => {}, ""); // Dummy to trigger on settings
  game.settings.sheet?.render(false); // Force settings to register hooks
});

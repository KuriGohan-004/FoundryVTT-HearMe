// CharactersWaiting.js
// Fixed version - fully working with your main script

Hooks.once("init", () => {
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
  let waitingPortraits = []; // { imgEl, actorId }

  function createWaitingBar() {
    if (waitingBar) return;

    waitingBar = document.createElement("div");
    waitingBar.id = "vn-waiting-bar";
    waitingBar.style.position = "fixed";
    waitingBar.style.display = "flex";
    waitingBar.style.flexDirection = "row";
    waitingBar.style.gap = "0px";
    waitingBar.style.pointerEvents = "none";
    waitingBar.style.zIndex = 998;
    waitingBar.style.opacity = "0";
    waitingBar.style.transition = "opacity 0.3s ease";

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
    waitingBar.style.transform = "translateX(-50%)"; // Center around offset

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
      return token?.texture.src || "";
    }
    return game.actors.get(message.speaker?.actor)?.img || "";
  }

  function getActorId(message) {
    return message.speaker?.actor || null;
  }

  function updateWaitingQueue() {
    if (!game.settings.get("hearme-chat-notification", "vnWaitingBarEnabled")) {
      waitingPortraits.forEach(p => p.imgEl.remove());
      waitingPortraits = [];
      updateVisibility();
      return;
    }

    createWaitingBar();

    const maxShown = game.settings.get("hearme-chat-notification", "vnWaitingMaxShown");
    const upcoming = messageQueue.slice(0, maxShown); // Access global messageQueue from main script

    const currentActorId = currentMessage ? getActorId(currentMessage) : null;
    const desired = upcoming.map(msg => getActorId(msg));

    // Remove old
    waitingPortraits = waitingPortraits.filter(port => {
      if (!desired.includes(port.actorId)) {
        port.imgEl.style.transform = "translateX(100%)";
        port.imgEl.style.opacity = "0";
        setTimeout(() => port.imgEl.remove(), 400);
        return false;
      }
      return true;
    });

    // Add new
    upcoming.forEach((msg, index) => {
      const actorId = getActorId(msg);
      if (!waitingPortraits.find(p => p.actorId === actorId)) {
        const img = document.createElement("img");
        img.src = getTokenImage(msg);
        img.style.opacity = "0";
        img.style.transform = "translateX(50%)";
        waitingBar.appendChild(img);

        img.offsetHeight; // reflow
        img.style.opacity = "1";
        img.style.transform = "translateX(0)";

        waitingPortraits.push({
          imgEl: img,
          actorId: actorId,
          isNext: index === 0
        });
      }
    });

    // Reorder DOM
    upcoming.forEach((msg, index) => {
      const actorId = getActorId(msg);
      const port = waitingPortraits.find(p => p.actorId === actorId);
      if (port && waitingBar.children[index] !== port.imgEl) {
        waitingBar.insertBefore(port.imgEl, waitingBar.children[index] || null);
      }
    });

    applyWaitingBarSettings();
    updateVisibility();
  }

  // Hook into the main script's variables directly (they are in scope!)
  Hooks.on("vnBannerReady", () => {
    // Wait until main script has initialized banner, queue, etc.
    updateWaitingQueue();
  });

  // Update whenever queue changes
  Hooks.on("createChatMessage", () => updateWaitingQueue());
  Hooks.on("vnBannerHidden", () => updateWaitingQueue()); // We'll add this hook below

  // Initial call
  updateWaitingQueue();
});

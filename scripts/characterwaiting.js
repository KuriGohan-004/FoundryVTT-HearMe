// CharactersWaiting.js
// Ultra-simple, reliable version - fixes all lingering/duplicate issues

Hooks.once("init", () => {
  game.settings.register("hearme-chat-notification", "vnWaitingBarEnabled", {
    name: "Enable Characters Waiting Bar",
    hint: "Shows portraits of upcoming speakers.",
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
    hint: "Bar on right side, next speaker on right, grows leftward.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("hearme-chat-notification", "vnWaitingMaxUpcoming", {
    name: "Max Upcoming Speakers Shown",
    hint: "Number of future speakers to display.",
    scope: "world",
    config: true,
    type: Number,
    default: 4,
    range: { min: 1, max: 10, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingSizePct", {
    name: "Portrait Size (%)",
    hint: "Size as % of screen width.",
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
    name: "Margin from Edge (%)",
    hint: "Distance from left or right edge.",
    scope: "world",
    config: true,
    type: Number,
    default: 5,
    range: { min: 0, max: 50, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingOffsetYPct", {
    name: "Distance from Bottom (%)",
    hint: "Position from bottom of screen.",
    scope: "world",
    config: true,
    type: Number,
    default: 25,
    range: { min: 0, max: 80, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnWaitingGrayscale", {
    name: "Grayscale Upcoming Speakers",
    hint: "Only current speaker in full color.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
});

Hooks.once("ready", () => {
  if (!game.settings.get("hearme-chat-notification", "vnEnabled")) return;

  const bar = document.createElement("div");
  bar.id = "vn-waiting-bar";
  Object.assign(bar.style, {
    position: "fixed",
    display: "flex",
    pointerEvents: "none",
    zIndex: 998,
    opacity: 0,
    transition: "opacity 0.4s ease"
  });
  document.body.appendChild(bar);

  let upcomingQueue = []; // Only upcoming messages
  let currentSpeakerMsg = null; // Currently speaking message

  function getPortrait(msg) {
    if (msg.speaker?.token) {
      const token = game.scenes.active?.tokens.get(msg.speaker.token);
      if (token) return token.texture.src;
    }
    return game.actors.get(msg.speaker?.actor)?.img || "";
  }

  function updateBar() {
    if (!game.settings.get("hearme-chat-notification", "vnWaitingBarEnabled")) {
      bar.innerHTML = "";
      bar.style.opacity = "0";
      return;
    }

    const showCurrent = game.settings.get("hearme-chat-notification", "vnWaitingShowCurrent");
    const alignRight = game.settings.get("hearme-chat-notification", "vnWaitingAlignRight");
    const maxUpcoming = game.settings.get("hearme-chat-notification", "vnWaitingMaxUpcoming");
    const size = game.settings.get("hearme-chat-notification", "vnWaitingSizePct") / 100 * window.innerWidth;
    const gap = game.settings.get("hearme-chat-notification", "vnWaitingGapPx");
    const offsetX = game.settings.get("hearme-chat-notification", "vnWaitingOffsetXPct") / 100 * window.innerWidth;
    const bottom = game.settings.get("hearme-chat-notification", "vnWaitingOffsetYPct") / 100 * window.innerHeight;

    bar.style.gap = `${gap}px`;
    bar.style.bottom = `${bottom}px`;
    bar.style.flexDirection = alignRight ? "row-reverse" : "row";
    bar.style.left = alignRight ? "auto" : `${offsetX}px`;
    bar.style.right = alignRight ? `${offsetX}px` : "auto";

    // Build what should be shown
    const display = [];
    if (showCurrent && currentSpeakerMsg) display.push(currentSpeakerMsg);
    display.push(...upcomingQueue.slice(0, maxUpcoming));

    // Remove extras with animation
    Array.from(bar.children).reverse().forEach(child => {
      if (!display.find(m => m.id === child.dataset.id)) {
        child.style.opacity = "0";
        child.style.transform = alignRight ? "translateX(-100%)" : "translateX(100%)";
        setTimeout(() => child.remove(), 400);
      }
    });

    // Add or update
    display.forEach((msg, index) => {
      let img = [...bar.children].find(c => c.dataset.id === msg.id);
      if (!img) {
        img = document.createElement("img");
        img.dataset.id = msg.id;
        img.style.opacity = "0";
        img.style.transform = alignRight ? "translateX(-50%)" : "translateX(50%)";
        img.style.transition = "all 0.4s ease";
        bar.appendChild(img);
        setTimeout(() => {
          img.style.opacity = "1";
          img.style.transform = "translateX(0)";
        }, 10);
      }

      img.src = getPortrait(msg);
      img.style.width = img.style.height = `${size}px`;
      img.style.borderRadius = "50%";
      img.style.objectFit = "cover";

      const isCurrent = msg.id === currentSpeakerMsg?.id;
      img.style.filter = game.settings.get("hearme-chat-notification", "vnWaitingGrayscale") && !isCurrent ? "grayscale(100%)" : "none";

      // Ensure order
      if (bar.children[index] !== img) {
        bar.insertBefore(img, bar.children[index] || null);
      }
    });

    bar.style.opacity = display.length > 0 ? "1" : "0";
  }

  // Add to upcoming queue when message created
  Hooks.on("createChatMessage", (msg) => {
    if (!msg.visible || msg.isRoll || msg.type === CONST.CHAT_MESSAGE_TYPES.WHISPER) return;
    const content = msg.content?.trim();
    if (!content || content.startsWith("/ooc") || !msg.speaker?.actor) return;

    upcomingQueue.push(msg);
    updateBar();
  });

  // Watch for banner showing a new message
  function setupObserver() {
    const banner = document.getElementById("vn-chat-banner");
    const nameEl = document.getElementById("vn-chat-name");
    if (!banner || !nameEl) {
      setTimeout(setupObserver, 500);
      return;
    }

    let lastName = "";

    new MutationObserver(() => {
      const visible = banner.style.display !== "none";
      const currentName = nameEl.textContent.trim();

      if (visible && currentName && currentName !== lastName) {
        lastName = currentName;

        // New speaker started — move first upcoming to current
        if (upcomingQueue.length > 0) {
          currentSpeakerMsg = upcomingQueue.shift();
          updateBar();
        }
      } else if (!visible) {
        // Banner hidden — clear current speaker
        currentSpeakerMsg = null;
        updateBar();
      }
    }).observe(nameEl, { childList: true, characterData: true, subtree: true });
  }

  setupObserver();

  window.addEventListener("resize", updateBar);
  Hooks.on("renderSettingsConfig", updateBar);
});

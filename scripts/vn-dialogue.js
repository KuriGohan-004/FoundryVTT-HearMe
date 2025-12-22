Hooks.once("init", () => {

  // -----------------------------
  // Visual separator in settings
  // -----------------------------
  game.settings.register("hearme-chat-notification", "vnBannerEnabled", {
    name: "--- VN Chat Banner Settings ---",
    hint: "",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  // -----------------------------
  // Core enable
  // -----------------------------
  game.settings.register("hearme-chat-notification", "vnEnabled", {
    name: "Enable VN Chat Banner",
    hint: "Show a Visual Novel style banner for chat messages.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Banner sizing & position (% of screen)
  game.settings.register("hearme-chat-notification", "vnWidthPct", {
    name: "Banner Width (%)",
    hint: "Width of the VN banner as % of screen width.",
    scope: "world",
    config: true,
    type: Number,
    default: 60,
    range: { min: 10, max: 100, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnHeightPct", {
    name: "Banner Height (%)",
    hint: "Height of the VN banner as % of screen height.",
    scope: "world",
    config: true,
    type: Number,
    default: 20,
    range: { min: 5, max: 50, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnOffsetXPct", {
    name: "Banner Offset X (%)",
    hint: "Distance from left edge of screen.",
    scope: "world",
    config: true,
    type: Number,
    default: 20,
    range: { min: 0, max: 100, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnOffsetYPct", {
    name: "Banner Offset Y (%)",
    hint: "Distance from bottom edge of screen.",
    scope: "world",
    config: true,
    type: Number,
    default: 5,
    range: { min: 0, max: 50, step: 1 }
  });

  // Text customization
  game.settings.register("hearme-chat-notification", "vnFontSizeNamePct", {
    name: "Font Size Name (%)",
    hint: "Font size of the character's name (percentage of screen width).",
    scope: "world",
    config: true,
    type: Number,
    default: 2,
    range: { min: 0.5, max: 10, step: 0.1 }
  });

  game.settings.register("hearme-chat-notification", "vnFontSizeMsgPct", {
    name: "Font Size Message (%)",
    hint: "Font size of the message text (percentage of screen width).",
    scope: "world",
    config: true,
    type: Number,
    default: 3,
    range: { min: 0.5, max: 10, step: 0.1 }
  });

  // Font color (color picker)
  game.settings.register("hearme-chat-notification", "vnFontColor", {
    name: "Font Color",
    hint: "Color of the text in the VN banner.",
    scope: "world",
    config: true,
    type: String,
    default: "#ffffff",
    color: true
  });

  // Background color (color picker)
  game.settings.register("hearme-chat-notification", "vnBackgroundColor", {
    name: "Background Color",
    hint: "Background color of the VN banner.",
    scope: "world",
    config: true,
    type: String,
    default: "rgba(0,0,0,0.75)",
    color: true
  });

  // VN Banner Background Image
  game.settings.register("hearme-chat-notification", "vnBackgroundImage", {
    name: "Background Image",
    hint: "Upload an image to use as the VN banner background. If none is selected, the solid background color will be used.",
    scope: "world",
    config: true,
    type: String,
    filePicker: "image",
    default: ""
  });
  
  game.settings.register("hearme-chat-notification", "vnFontFamily", {
    name: "Font Family",
    hint: "Font used for VN banner text.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "Arial, sans-serif": "Arial",
      "Courier New, monospace": "Courier New",
      "Georgia, serif": "Georgia",
      "Times New Roman, serif": "Times New Roman",
      "Verdana, sans-serif": "Verdana"
    },
    default: "Arial, sans-serif"
  });

  // Auto-hide / skip options
  game.settings.register("hearme-chat-notification", "vnAutoHideTimePerChar", {
    name: "Auto-hide Delay (s/char)",
    hint: "Time in seconds per character before banner disappears. 0 disables.",
    scope: "world",
    config: true,
    type: Number,
    default: 0.3,
    range: { min: 0, max: 10, step: 0.1 }
  });

  game.settings.register("hearme-chat-notification", "vnSkipKey", {
    name: "Skip Key",
    hint: "Key to skip VN banner (while no input focused).",
    scope: "world",
    config: true,
    type: String,
    default: " "
  });

  game.settings.register("hearme-chat-notification", "vnHideInCombat", {
    name: "Hide Banner In Combat",
    hint: "If enabled, VN banners are hidden during combat.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Portrait
  game.settings.register("hearme-chat-notification", "vnPortraitEnabled", {
    name: "Enable Portrait",
    hint: "Show a character portrait below the VN banner.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "vnPortraitSizePct", {
    name: "Portrait Size (%)",
    hint: "Width/height of the portrait as % of screen width.",
    scope: "world",
    config: true,
    type: Number,
    default: 15,
    range: { min: 5, max: 75, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnPortraitOffsetXPct", {
    name: "Portrait Offset X (%)",
    hint: "Distance from left screen edge.",
    scope: "world",
    config: true,
    type: Number,
    default: 0,
    range: { min: 0, max: 75, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnPortraitOffsetYPct", {
    name: "Portrait Offset Y (%)",
    hint: "Distance from bottom of screen.",
    scope: "world",
    config: true,
    type: Number,
    default: 0,
    range: { min: 0, max: 75, step: 1 }
  });

  // Padding (top) for Name
  game.settings.register("hearme-chat-notification", "vnNamePaddingTop", {
    name: "Name Padding Top (px)",
    hint: "Top padding for the character name in the VN banner.",
    scope: "world",
    config: true,
    type: Number,
    default: 2,
    range: { min: 0, max: 50, step: 1 }
  });

  // Left margin for Name
  game.settings.register("hearme-chat-notification", "vnNameMarginLeft", {
    name: "Name Left Margin (px)",
    hint: "Left margin/indent for the character name in the VN banner.",
    scope: "world",
    config: true,
    type: Number,
    default: 0,
    range: { min: 0, max: 100, step: 1 }
  });

  // Padding (top) for Message
  game.settings.register("hearme-chat-notification", "vnMsgPaddingTop", {
    name: "Message Padding Top (px)",
    hint: "Top padding for the message text in the VN banner.",
    scope: "world",
    config: true,
    type: Number,
    default: 2,
    range: { min: 0, max: 50, step: 1 }
  });

  // Left margin for Message
  game.settings.register("hearme-chat-notification", "vnMsgMarginLeft", {
    name: "Message Left Margin (px)",
    hint: "Left margin/indent for the message text in the VN banner.",
    scope: "world",
    config: true,
    type: Number,
    default: 10,
    range: { min: 0, max: 100, step: 1 }
  });

  // Border customization
  game.settings.register("hearme-chat-notification", "vnBorderWidth", {
    name: "Border Width (px)",
    hint: "Width of the border around the VN banner. Set to 0 to disable the border.",
    scope: "world",
    config: true,
    type: Number,
    default: 0,
    range: { min: 0, max: 20, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnBorderColor", {
    name: "Border Color",
    hint: "Color of the border around the VN banner.",
    scope: "world",
    config: true,
    type: String,
    default: "#000000",
    color: true
  });

  game.settings.register("hearme-chat-notification", "vnBorderRadius", {
    name: "Border Radius (px)",
    hint: "Radius for rounded corners on the VN banner. Set to 0 for a sharp rectangle.",
    scope: "world",
    config: true,
    type: Number,
    default: 0,
    range: { min: 0, max: 50, step: 1 }
  });

// Next message indicator
game.settings.register("hearme-chat-notification", "vnNextIconImage", {
  name: "Next Message Icon (image)",
  hint: "Custom image for the 'next message' indicator. Leave blank for default down arrow.",
  scope: "world",
  config: true,
  type: String,
  filePicker: "image",
  default: ""
});

game.settings.register("hearme-chat-notification", "vnNextIconAnimation", {
  name: "Next Message Animation",
  hint: "Animation for the next message indicator.",
  scope: "world",
  config: true,
  type: String,
  choices: {
    "none": "None",
    "spin": "Spinning",
    "bob":  "Bobbing"
  },
  default: "bob"
});
});

Hooks.once("ready", () => {
  if (!game.settings.get("hearme-chat-notification", "vnEnabled")) return;

  let banner, nameEl, msgEl, portrait, nextIcon;
  let hideTimeout = null;
  let typing = false;
  let messageQueue = [];
  let currentMessage = null;

  // -----------------------------
  // DOM Setup
  // -----------------------------
  function createBannerDom() {
    if (banner) return;
    banner = document.createElement("div");
    banner.id = "vn-chat-banner";
    banner.style.position = "fixed";
    banner.style.display = "none";
    banner.style.flexDirection = "column";
    banner.style.justifyContent = "flex-start";
    banner.style.zIndex = 999;
    banner.style.padding = "0.5em";
    banner.style.backdropFilter = "blur(4px)";
    banner.style.boxShadow = "0 -2px 10px rgba(0,0,0,0.7)";
    banner.style.opacity = "0";
    banner.style.transition = "opacity 0.25s ease";
    banner.style.overflowY = "auto"; // Allow scrolling
    banner.style.pointerEvents = "none";
    banner.style.scrollBehavior = "smooth"; // Smooth scroll

    nameEl = document.createElement("div");
    nameEl.id = "vn-chat-name";
    nameEl.style.fontWeight = "bold";
    banner.appendChild(nameEl);

    msgEl = document.createElement("div");
    msgEl.id = "vn-chat-msg";
    msgEl.style.overflowWrap = "break-word";
    msgEl.style.wordBreak = "break-word";
    banner.appendChild(msgEl);

    // Next message indicator
    nextIcon = document.createElement("div");
    nextIcon.id = "vn-next-icon";
    nextIcon.style.position = "absolute";
    nextIcon.style.bottom = "8px";
    nextIcon.style.right = "12px";
    nextIcon.style.fontSize = "1.6em";
    nextIcon.style.opacity = "0";
    nextIcon.style.transition = "opacity 0.4s ease";
    nextIcon.style.pointerEvents = "none";
    nextIcon.textContent = "▼"; // Default: thick down arrow
    banner.appendChild(nextIcon);

    document.body.appendChild(banner);

    portrait = document.createElement("img");
    portrait.id = "vn-chat-portrait";
    portrait.style.position = "fixed";
    portrait.style.opacity = "0";
    portrait.style.transition = "opacity 0.5s ease";
    portrait.style.pointerEvents = "none";
    document.body.appendChild(portrait);

    applyBannerSettings();
    window.addEventListener("resize", applyBannerSettings);

    // Notify the waiting bar that the main banner is fully ready
    Hooks.callAll("vnBannerReady");
  }

  function applyBannerSettings() {
    if (!banner) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const widthPx = game.settings.get("hearme-chat-notification", "vnWidthPct") / 100 * vw;
    const heightPx = game.settings.get("hearme-chat-notification", "vnHeightPct") / 100 * vh;

    banner.style.width = `${widthPx}px`;
    banner.style.height = `${heightPx}px`; // Fixed height
    banner.style.minHeight = `${heightPx}px`;
    banner.style.maxHeight = `${heightPx}px`;
    banner.style.left = (game.settings.get("hearme-chat-notification", "vnOffsetXPct") / 100 * vw) + "px";
    banner.style.bottom = (game.settings.get("hearme-chat-notification", "vnOffsetYPct") / 100 * vh) + "px";

    const fontSizeNamePx = game.settings.get("hearme-chat-notification", "vnFontSizeNamePct") / 100 * vw;
    const fontSizeMsgPx = game.settings.get("hearme-chat-notification", "vnFontSizeMsgPct") / 100 * vw;
    nameEl.style.fontSize = `${fontSizeNamePx}px`;
    msgEl.style.fontSize = `${fontSizeMsgPx}px`;

    nameEl.style.color = msgEl.style.color = nextIcon.style.color = game.settings.get("hearme-chat-notification", "vnFontColor");
    nameEl.style.fontFamily = msgEl.style.fontFamily = game.settings.get("hearme-chat-notification", "vnFontFamily");

    const bgImage = game.settings.get("hearme-chat-notification", "vnBackgroundImage");
    if (bgImage) {
      banner.style.background = `url("${bgImage}") no-repeat center center / cover`;
    } else {
      banner.style.background = game.settings.get("hearme-chat-notification", "vnBackgroundColor");
    }

    // Next icon image override
    const nextIconImage = game.settings.get("hearme-chat-notification", "vnNextIconImage");
    if (nextIconImage) {
      nextIcon.innerHTML = `<img src="${nextIconImage}" style="width:1.4em;height:1.4em;object-fit:contain;">`;
    } else {
      nextIcon.textContent = "▼";
    }

    // Apply animation
    const anim = game.settings.get("hearme-chat-notification", "vnNextIconAnimation");
    nextIcon.className = "";
    if (anim === "spin") {
      nextIcon.classList.add("vn-next-spin");
    } else if (anim === "bob") {
      nextIcon.classList.add("vn-next-bob");
    }

    if (game.settings.get("hearme-chat-notification", "vnPortraitEnabled")) {
      portrait.style.display = "block";
      const size = game.settings.get("hearme-chat-notification", "vnPortraitSizePct") / 100 * vw;
      const left = game.settings.get("hearme-chat-notification", "vnPortraitOffsetXPct") / 100 * vw;
      const bottom = game.settings.get("hearme-chat-notification", "vnPortraitOffsetYPct") / 100 * vh;
      portrait.style.width = portrait.style.height = size + "px";
      portrait.style.left = left + "px";
      portrait.style.bottom = bottom + "px";
    } else portrait.style.display = "none";

    // Padding and margin
    nameEl.style.paddingTop = `${game.settings.get("hearme-chat-notification", "vnNamePaddingTop")}px`;
    nameEl.style.marginLeft = `${game.settings.get("hearme-chat-notification", "vnNameMarginLeft")}px`;
    msgEl.style.paddingTop = `${game.settings.get("hearme-chat-notification", "vnMsgPaddingTop")}px`;
    msgEl.style.marginLeft = `${game.settings.get("hearme-chat-notification", "vnMsgMarginLeft")}px`;

    // Border
    const borderWidth = game.settings.get("hearme-chat-notification", "vnBorderWidth");
    const borderColor = game.settings.get("hearme-chat-notification", "vnBorderColor");
    const borderRadius = game.settings.get("hearme-chat-notification", "vnBorderRadius");
    if (borderWidth > 0) {
      banner.style.border = `${borderWidth}px solid ${borderColor}`;
      banner.style.borderRadius = `${borderRadius}px`;
    } else {
      banner.style.border = "none";
      banner.style.borderRadius = "0px";
    }
  }

  // Add CSS animations + scrollbar hiding (injected once)
  if (!document.getElementById("vn-next-icon-styles")) {
    const style = document.createElement("style");
    style.id = "vn-next-icon-styles";
    style.textContent = `
      @keyframes vnSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes vnBob {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      .vn-next-spin { animation: vnSpin 2s linear infinite; }
      .vn-next-bob { animation: vnBob 1.6s ease-in-out infinite; }

      /* Hide scrollbar but keep functionality */
      #vn-chat-banner::-webkit-scrollbar { display: none; }
      #vn-chat-banner { -ms-overflow-style: none; scrollbar-width: none; }
    `;
    document.head.appendChild(style);
  }

  async function enrichMessageContent(content) {
    return await TextEditor.enrichHTML(content, { async: true });
  }

  function typeWriter(element, html, callback) {
    typing = true;
    element.innerHTML = "";
    let i = 0;
    function nextChar() {
      if (i >= html.length) {
        typing = false;
        nextIcon.style.opacity = "1";
        element.scrollTop = element.scrollHeight; // Final scroll
        callback?.();
        return;
      }
      i++;
      element.innerHTML = html.substring(0, i);
      element.scrollTop = element.scrollHeight; // Auto-scroll during typing
      let delay = 30;
      const char = html[i - 1];
      if (char === "." || char === "!" || char === "?") delay = 200;
      if (char === "," || char === ";") delay = 100;
      setTimeout(nextChar, delay);
    }
    nextChar();
  }

  function hideBanner() {
    if (!banner) return;
    banner.style.opacity = "0";
    portrait.style.opacity = "0";
    nextIcon.style.opacity = "0";
    setTimeout(() => {
      banner.style.display = "none";
      currentMessage = null;
      Hooks.callAll("vnBannerHidden"); // Notify waiting bar that current message finished
      processNextMessage();
    }, 250);
  }

  async function showBanner(message) {
    if (!game.settings.get("hearme-chat-notification", "vnEnabled")) return;
    if (!banner) createBannerDom();

    if (game.settings.get("hearme-chat-notification", "vnHideInCombat") && game.combat) {
      currentMessage = null;
      processNextMessage();
      return;
    }

    currentMessage = message;
    applyBannerSettings();

    const actorName = message.speaker?.actor ? game.actors.get(message.speaker.actor)?.name : message.user?.name || "Unknown";
    nameEl.innerHTML = actorName;

    if (game.settings.get("hearme-chat-notification", "vnPortraitEnabled")) {
      if (message.speaker?.token) {
        const scene = game.scenes.active;
        const token = scene?.tokens.get(message.speaker.token);
        portrait.src = token?.texture.src || game.actors.get(message.speaker.actor)?.img || "";
      } else portrait.src = game.actors.get(message.speaker.actor)?.img || "";
      portrait.style.opacity = "1";
    }

    banner.style.display = "flex";
    banner.style.opacity = "1";
    nextIcon.style.opacity = "0";

    const enrichedContent = await enrichMessageContent(message.content);
    typeWriter(msgEl, enrichedContent, () => {
      const delayPerChar = game.settings.get("hearme-chat-notification", "vnAutoHideTimePerChar");
      if (delayPerChar > 0) {
        const visibleLength = msgEl.textContent.length;
        const timePerChar = delayPerChar * visibleLength * 1000;
        const minTime = 2000;
        const totalTime = Math.max(minTime, timePerChar);
        hideTimeout = setTimeout(hideBanner, totalTime);
      }
    });
  }

  function queueMessage(message) {
    messageQueue.push(message);
    if (!typing && !currentMessage) processNextMessage();
  }

  function processNextMessage() {
    if (messageQueue.length === 0) return;
    const next = messageQueue.shift();
    showBanner(next);
  }

  document.addEventListener("keydown", (ev) => {
    if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;
    const skipKey = game.settings.get("hearme-chat-notification", "vnSkipKey");
    if (!currentMessage) return;
    if (ev.key === skipKey) {
      ev.preventDefault();
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      if (typing) {
        TextEditor.enrichHTML(currentMessage.content, { async: false }).then(fullHTML => {
          msgEl.innerHTML = fullHTML;
          typing = false;
          nextIcon.style.opacity = "1";
          msgEl.scrollTop = msgEl.scrollHeight;
          const delayPerChar = game.settings.get("hearme-chat-notification", "vnAutoHideTimePerChar");
          if (delayPerChar > 0) {
            const visibleLength = msgEl.textContent.length;
            const timePerChar = delayPerChar * visibleLength * 1000;
            const minTime = 2000;
            const totalTime = Math.max(minTime, timePerChar);
            hideTimeout = setTimeout(hideBanner, totalTime);
          }
        });
      } else {
        hideBanner();
      }
    }
  });

  // -----------------------------
  // Chat hook
  // -----------------------------
  createBannerDom();

  Hooks.on("createChatMessage", (message) => {
    if (!message.visible) return;
    if (message.isRoll) return;
    if (message.type === CONST.CHAT_MESSAGE_TYPES.WHISPER) return;
    const content = message.content.trim();
    if (!content || content.startsWith("/ooc") || !message.speaker?.actor) return;
    queueMessage(message);
  });
});

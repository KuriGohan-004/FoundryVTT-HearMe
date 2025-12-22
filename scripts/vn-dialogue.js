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

  // Core enable
  game.settings.register("hearme-chat-notification", "vnEnabled", {
    name: "Enable VN Chat Banner",
    hint: "Show a Visual Novel style banner for chat messages.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Banner sizing & position (% of screen)
  game.settings.register("hearme-chat-notification", "vnWidthPct", { /* unchanged */ });
  game.settings.register("hearme-chat-notification", "vnHeightPct", { /* unchanged */ });
  game.settings.register("hearme-chat-notification", "vnOffsetXPct", { /* unchanged */ });
  game.settings.register("hearme-chat-notification", "vnOffsetYPct", { /* unchanged */ });

  // Text customization
  game.settings.register("hearme-chat-notification", "vnFontSizeNamePct", { /* unchanged */ });
  game.settings.register("hearme-chat-notification", "vnFontSizeMsgPct", { /* unchanged */ });
  game.settings.register("hearme-chat-notification", "vnFontColor", { /* unchanged */ });
  game.settings.register("hearme-chat-notification", "vnBackgroundColor", { /* unchanged */ });
  game.settings.register("hearme-chat-notification", "vnBackgroundImage", { /* unchanged */ });
  game.settings.register("hearme-chat-notification", "vnFontFamily", { /* unchanged */ });

  // Auto-hide / skip options
  game.settings.register("hearme-chat-notification", "vnAutoHideTimePerChar", { /* unchanged */ });
  game.settings.register("hearme-chat-notification", "vnSkipKey", { /* unchanged */ });
  game.settings.register("hearme-chat-notification", "vnHideInCombat", { /* unchanged */ });

  // Portrait
  game.settings.register("hearme-chat-notification", "vnPortraitEnabled", { /* unchanged */ });
  game.settings.register("hearme-chat-notification", "vnPortraitSizePct", { /* unchanged */ });
  game.settings.register("hearme-chat-notification", "vnPortraitOffsetXPct", { /* unchanged */ });
  game.settings.register("hearme-chat-notification", "vnPortraitOffsetYPct", { /* unchanged */ });

  // Padding & margin
  game.settings.register("hearme-chat-notification", "vnNamePaddingTop", { /* unchanged */ });
  game.settings.register("hearme-chat-notification", "vnNameMarginLeft", { /* unchanged */ });
  game.settings.register("hearme-chat-notification", "vnMsgPaddingTop", { /* unchanged */ });
  game.settings.register("hearme-chat-notification", "vnMsgMarginLeft", { /* unchanged */ });

  // Border
  game.settings.register("hearme-chat-notification", "vnBorderWidth", { /* unchanged */ });
  game.settings.register("hearme-chat-notification", "vnBorderColor", { /* unchanged */ });
  game.settings.register("hearme-chat-notification", "vnBorderRadius", { /* unchanged */ });

  // --- NEW SETTINGS ---
  game.settings.register("hearme-chat-notification", "vnNextIcon", {
    name: "Next Message Icon",
    hint: "Custom image for the 'next message' indicator (leave blank for default down arrow)",
    scope: "world",
    config: true,
    type: String,
    filePicker: "image",
    default: ""
  });

  game.settings.register("hearme-chat-notification", "vnNextIconAnimation", {
    name: "Next Icon Animation",
    hint: "How the completion icon should animate",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "spin": "Spin in place",
      "bounce": "Bounce up and down",
      "none": "No animation"
    },
    default: "bounce"
  });
});

Hooks.once("ready", () => {
  if (!game.settings.get("hearme-chat-notification", "vnEnabled")) return;

  let banner, nameEl, msgEl, portrait, nextIcon;
  let hideTimeout = null;
  let typing = false;
  let messageQueue = [];
  let currentMessage = null;
  let currentPageIndex = 0;
  let currentPages = [];

  // DOM Setup
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
    banner.style.overflow = "hidden"; // Changed from auto to hidden
    banner.style.pointerEvents = "none";

    nameEl = document.createElement("div");
    nameEl.id = "vn-chat-name";
    nameEl.style.fontWeight = "bold";
    banner.appendChild(nameEl);

    msgEl = document.createElement("div");
    msgEl.id = "vn-chat-msg";
    msgEl.style.overflow = "hidden";
    msgEl.style.flex = "1";
    banner.appendChild(msgEl);

    // Next icon container
    nextIcon = document.createElement("div");
    nextIcon.id = "vn-next-icon";
    nextIcon.style.position = "absolute";
    nextIcon.style.bottom = "8px";
    nextIcon.style.right = "12px";
    nextIcon.style.fontSize = "24px";
    nextIcon.style.color = "#ffffff";
    nextIcon.style.opacity = "0";
    nextIcon.style.transition = "opacity 0.3s ease, transform 0.5s ease";
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
  }

  function applyBannerSettings() {
    if (!banner) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const widthPx = game.settings.get("hearme-chat-notification", "vnWidthPct") / 100 * vw;
    const heightPx = game.settings.get("hearme-chat-notification", "vnHeightPct") / 100 * vh;

    banner.style.width = `${widthPx}px`;
    banner.style.height = `${heightPx}px`;
    banner.style.left = (game.settings.get("hearme-chat-notification", "vnOffsetXPct") / 100 * vw) + "px";
    banner.style.bottom = (game.settings.get("hearme-chat-notification", "vnOffsetYPct") / 100 * vh) + "px";

    const fontSizeNamePx = game.settings.get("hearme-chat-notification", "vnFontSizeNamePct") / 100 * vw;
    const fontSizeMsgPx = game.settings.get("hearme-chat-notification", "vnFontSizeMsgPct") / 100 * vw;

    nameEl.style.fontSize = `${fontSizeNamePx}px`;
    msgEl.style.fontSize = `${fontSizeMsgPx}px`;

    nameEl.style.color = msgEl.style.color = game.settings.get("hearme-chat-notification", "vnFontColor");
    nameEl.style.fontFamily = msgEl.style.fontFamily = game.settings.get("hearme-chat-notification", "vnFontFamily");

    const bgImage = game.settings.get("hearme-chat-notification", "vnBackgroundImage");
    banner.style.background = bgImage
      ? `url("${bgImage}") no-repeat center center / cover`
      : game.settings.get("hearme-chat-notification", "vnBackgroundColor");

    // Portrait
    if (game.settings.get("hearme-chat-notification", "vnPortraitEnabled")) {
      portrait.style.display = "block";
      const size = game.settings.get("hearme-chat-notification", "vnPortraitSizePct") / 100 * vw;
      const left = game.settings.get("hearme-chat-notification", "vnPortraitOffsetXPct") / 100 * vw;
      const bottom = game.settings.get("hearme-chat-notification", "vnPortraitOffsetYPct") / 100 * vh;
      portrait.style.width = portrait.style.height = size + "px";
      portrait.style.left = left + "px";
      portrait.style.bottom = bottom + "px";
    } else {
      portrait.style.display = "none";
    }

    // Padding & margin
    nameEl.style.paddingTop = `${game.settings.get("hearme-chat-notification", "vnNamePaddingTop")}px`;
    nameEl.style.marginLeft = `${game.settings.get("hearme-chat-notification", "vnNameMarginLeft")}px`;
    msgEl.style.paddingTop = `${game.settings.get("hearme-chat-notification", "vnMsgPaddingTop")}px`;
    msgEl.style.marginLeft = `${game.settings.get("hearme-chat-notification", "vnMsgMarginLeft")}px`;

    // Border
    const borderWidth = game.settings.get("hearme-chat-notification", "vnBorderWidth");
    const borderColor = game.settings.get("hearme-chat-notification", "vnBorderColor");
    const borderRadius = game.settings.get("hearme-chat-notification", "vnBorderRadius");
    banner.style.border = borderWidth > 0 ? `${borderWidth}px solid ${borderColor}` : "none";
    banner.style.borderRadius = `${borderRadius}px`;

    // Next icon styling
    const customIcon = game.settings.get("hearme-chat-notification", "vnNextIcon");
    const animation = game.settings.get("hearme-chat-notification", "vnNextIconAnimation");

    if (customIcon) {
      nextIcon.innerHTML = `<img src="${customIcon}" style="width:24px;height:24px;">`;
    } else {
      nextIcon.innerHTML = "▼"; // default down arrow
    }

    nextIcon.style.animation = "";
    if (animation === "spin") {
      nextIcon.style.animation = "vnSpin 1.5s linear infinite";
    } else if (animation === "bounce") {
      nextIcon.style.animation = "vnBounce 1.2s infinite";
    }
  }

  // CSS animations
  const style = document.createElement("style");
  style.textContent = `
    @keyframes vnSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes vnBounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
  `;
  document.head.appendChild(style);

  async function enrichMessageContent(content) {
    return await TextEditor.enrichHTML(content, { async: true });
  }

  function splitIntoPages(html, maxHeight) {
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.visibility = "hidden";
    tempDiv.style.width = msgEl.clientWidth + "px";
    tempDiv.style.fontSize = msgEl.style.fontSize;
    tempDiv.style.fontFamily = msgEl.style.fontFamily;
    tempDiv.style.lineHeight = "1.4";
    tempDiv.innerHTML = html;
    document.body.appendChild(tempDiv);

    const pages = [];
    let currentPage = "";
    let currentHeight = 0;

    const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT);
    let node;
    while (node = walker.nextNode()) {
      const text = node.nodeValue;
      let start = 0;
      while (start < text.length) {
        let low = start, high = text.length;
        while (low < high) {
          const mid = Math.floor((low + high + 1) / 2);
          node.nodeValue = text.slice(0, mid);
          if (tempDiv.scrollHeight <= maxHeight) {
            low = mid;
          } else {
            high = mid - 1;
          }
        }
        const chunk = text.slice(start, low);
        currentPage += chunk;
        node.nodeValue = text.slice(0, low);
        if (tempDiv.scrollHeight > maxHeight) {
          if (currentPage) pages.push(currentPage);
          currentPage = chunk;
        }
        start = low;
      }
      node.nodeValue = text;
    }
    if (currentPage) pages.push(currentPage);

    document.body.removeChild(tempDiv);
    return pages.map(p => p.trim());
  }

  function typeWriter(element, html, callback) {
    typing = true;
    element.innerHTML = "";
    let i = 0;
    function nextChar() {
      if (i >= html.length) {
        typing = false;
        callback?.();
        return;
      }
      i++;
      element.innerHTML = html.substring(0, i);
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
    setTimeout(() => {
      banner.style.display = "none";
      currentMessage = null;
      currentPages = [];
      currentPageIndex = 0;
      nextIcon.style.opacity = "0";
      processNextMessage();
    }, 250);
  }

  async function showNextPage() {
    if (currentPageIndex >= currentPages.length) {
      hideBanner();
      return;
    }

    const pageContent = currentPages[currentPageIndex];
    nameEl.innerHTML = currentMessage.speaker?.actor ? game.actors.get(currentMessage.speaker.actor)?.name : currentMessage.user?.name || "Unknown";

    if (game.settings.get("hearme-chat-notification", "vnPortraitEnabled")) {
      if (currentMessage.speaker?.token) {
        const scene = game.scenes.active;
        const token = scene?.tokens.get(currentMessage.speaker.token);
        portrait.src = token?.texture.src || game.actors.get(currentMessage.speaker.actor)?.img || "";
      } else {
        portrait.src = game.actors.get(currentMessage.speaker.actor)?.img || "";
      }
      portrait.style.opacity = "1";
    }

    banner.style.display = "flex";
    banner.style.opacity = "1";

    typeWriter(msgEl, pageContent, () => {
      nextIcon.style.opacity = "1";
      const delayPerChar = game.settings.get("hearme-chat-notification", "vnAutoHideTimePerChar");
      if (delayPerChar > 0) {
        const visibleLength = msgEl.textContent.length;
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
          nextIcon.style.opacity = "0";
          currentPageIndex++;
          showNextPage();
        }, visibleLength * delayPerChar * 1000);
      }
    });
  }

  async function showBanner(message) {
    if (!game.settings.get("hearme-chat-notification", "vnEnabled")) return;
    if (!banner) createBannerDom();

    if (game.settings.get("hearme-chat-notification", "vnHideInCombat") && game.combat) {
      processNextMessage();
      return;
    }

    currentMessage = message;
    currentPageIndex = 0;

    applyBannerSettings();

    const enriched = await enrichMessageContent(message.content);
    const maxContentHeight = banner.clientHeight - nameEl.offsetHeight - 40; // rough padding estimate
    currentPages = splitIntoPages(enriched, maxContentHeight);

    if (currentPages.length === 0) {
      currentPages = [enriched];
    }

    showNextPage();
  }

  function queueMessage(message) {
    messageQueue.push(message);
    if (!currentMessage && !typing) processNextMessage();
  }

  function processNextMessage() {
    if (messageQueue.length === 0) return;
    const next = messageQueue.shift();
    showBanner(next);
  }

  // Skip handling (now resets timer and shows next page)
  document.addEventListener("keydown", (ev) => {
    if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") return;
    const skipKey = game.settings.get("hearme-chat-notification", "vnSkipKey");
    if (!currentMessage) return;
    if (ev.key === skipKey) {
      ev.preventDefault();

      clearTimeout(hideTimeout);

      if (typing) {
        // Finish typing current page
        msgEl.innerHTML = currentPages[currentPageIndex];
        typing = false;
        nextIcon.style.opacity = "1";
      } else {
        // Go to next page
        nextIcon.style.opacity = "0";
        currentPageIndex++;
        showNextPage();
      }
    }
  });

  // Initial setup
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

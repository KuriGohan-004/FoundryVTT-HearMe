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

// ... (all init settings remain the same) ...

Hooks.once("ready", () => {
  if (!game.settings.get("hearme-chat-notification", "vnEnabled")) return;

  let banner, nameEl, msgEl, portrait, nextIcon;
  let hideTimeout = null;
  let typing = false;
  let messageQueue = [];
  let currentMessage = null;
  let currentPageIndex = 0;
  let currentPages = [];

  // DOM Setup (unchanged except overflow handling)
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
    banner.style.overflow = "hidden"; // critical
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

  // applyBannerSettings remains mostly unchanged
  function applyBannerSettings() {
    // ... (same as before) ...

    // Next icon
    const customIcon = game.settings.get("hearme-chat-notification", "vnNextIcon");
    const animation = game.settings.get("hearme-chat-notification", "vnNextIconAnimation");

    if (customIcon) {
      nextIcon.innerHTML = `<img src="${customIcon}" style="width:32px;height:32px;object-fit:contain;">`;
    } else {
      nextIcon.innerHTML = "▼";
    }

    nextIcon.style.animation = "";
    if (animation === "spin") {
      nextIcon.style.animation = "vnSpin 1.5s linear infinite";
    } else if (animation === "bounce") {
      nextIcon.style.animation = "vnBounce 1.2s infinite";
    }
  }

  // Safe CSS animations
  if (!document.getElementById("vn-styles")) {
    const style = document.createElement("style");
    style.id = "vn-styles";
    style.textContent = `
      @keyframes vnSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes vnBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    `;
    document.head.appendChild(style);
  }

  async function enrichMessageContent(content) {
    return await TextEditor.enrichHTML(content, { async: true, secrets: false });
  }

  // IMPROVED: Safer page splitting using a temporary clone
  function splitIntoPages(html, maxHeight) {
    const temp = msgEl.cloneNode(true);
    temp.style.position = "absolute";
    temp.style.visibility = "hidden";
    temp.style.width = `${msgEl.clientWidth}px`;
    temp.style.height = "auto";
    temp.style.maxHeight = "none";
    temp.innerHTML = html;
    document.body.appendChild(temp);

    const pages = [];
    let currentPage = "";
    let accumulatedHeight = 0;

    // Split on <br>, <p>, or plain text lines
    const nodes = Array.from(temp.childNodes);
    for (const node of nodes) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === "BR") {
        if (currentPage) pages.push(currentPage);
        currentPage = "";
        accumulatedHeight += 24; // rough line height
      } else if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        const lines = text.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          temp.innerHTML = currentPage + line;
          if (temp.scrollHeight > maxHeight) {
            if (currentPage) pages.push(currentPage);
            currentPage = line + (i < lines.length - 1 ? "\n" : "");
          } else {
            currentPage += line + (i < lines.length - 1 ? "\n" : "");
          }
        }
      } else {
        // HTML elements (span, strong, etc.)
        temp.innerHTML = currentPage + node.outerHTML;
        if (temp.scrollHeight > maxHeight) {
          if (currentPage) pages.push(currentPage);
          currentPage = node.outerHTML;
        } else {
          currentPage += node.outerHTML;
        }
      }
    }
    if (currentPage) pages.push(currentPage);

    document.body.removeChild(temp);
    return pages.map(p => p.trim()).filter(p => p);
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
      clearTimeout(hideTimeout);
      processNextMessage();
    }, 250);
  }

  async function showNextPage() {
    if (currentPageIndex >= currentPages.length) {
      hideBanner();
      return;
    }

    const pageContent = currentPages[currentPageIndex];

    nameEl.innerHTML = currentMessage.speaker?.actor
      ? game.actors.get(currentMessage.speaker.actor)?.name || "Unknown"
      : currentMessage.user?.name || "Unknown";

    if (game.settings.get("hearme-chat-notification", "vnPortraitEnabled")) {
      if (currentMessage.speaker?.token) {
        const token = game.scenes.active?.tokens.get(currentMessage.speaker.token);
        portrait.src = token?.texture?.src || game.actors.get(currentMessage.speaker.actor)?.img || "";
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

    if (game.settings.get("hearme-chat-notification", "vnHideInCombat") && game.combat?.active) {
      processNextMessage();
      return;
    }

    currentMessage = message;
    currentPageIndex = 0;

    applyBannerSettings();

    const enriched = await enrichMessageContent(message.content);
    const maxHeight = banner.clientHeight - (nameEl.offsetHeight || 0) - 60; // extra padding for icon/name

    currentPages = splitIntoPages(enriched, maxHeight);
    if (currentPages.length === 0) currentPages = [enriched];

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

  // Skip handling (resets timer)
  document.addEventListener("keydown", (ev) => {
    if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
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
        // Next page
        nextIcon.style.opacity = "0";
        currentPageIndex++;
        showNextPage();
      }
    }
  });

  createBannerDom();

  Hooks.on("createChatMessage", (message) => {
    if (!message.visible) return;
    if (message.isRoll) return;
    if (message.type === CONST.CHAT_MESSAGE_TYPES.WHISPER) return;
    const content = message.content?.trim();
    if (!content || content.startsWith("/ooc") || !message.speaker?.actor) return;
    queueMessage(message);
  });
});


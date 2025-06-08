// === INIT SETTINGS ===
Hooks.once("init", () => {
  game.settings.register("hearme-chat-notification", "pingSound", {
    name: "Chat Notification Sound",
    hint: "The sound to play when a new VN chat message is displayed.",
    scope: "world",
    config: true,
    type: String,
    default: "modules/hearme-chat-notification/ui/chat-ping.ogg",
    filePicker: "audio"
  });

  game.settings.register("hearme-chat-notification", "skipKey", {
    name: "Skip Dialogue Key",
    hint: "Click the box and press a key to assign it as the skip key.",
    scope: "client",
    config: true,
    type: String,
    default: "KeyQ",
    onChange: val => console.log(`Skip key set to: ${val}`)
  });

  game.settings.register("hearme-chat-notification", "minAutoSkipTime", {
    name: "Minimum Auto-Skip Time (seconds)",
    hint: "Minimum time before auto-skipping a message (whole seconds, 1-30). Default is 5.",
    scope: "client",
    config: true,
    type: Number,
    default: 5,
    range: {
      min: 1,
      max: 30,
      step: 1
    }
  });

  // SET BOTH TO DEFAULT TRUE
  game.settings.register("hearme-chat-notification", "showLinkedIcon", {
    name: "Show Linked Icon",
    hint: "Show the icon for linked messages in the VN banner.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "showUnlinkedIcon", {
    name: "Show Unlinked Icon",
    hint: "Show the icon for unlinked messages in the VN banner.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });
});

(() => {
  let banner = document.getElementById("vn-chat-banner");
  let imgElem = document.getElementById("vn-chat-image");
  let arrowElem = document.getElementById("vn-chat-arrow");
  let timerBar = null;
  let linkedIcon = null;
  let unlinkedIcon = null;

  let currentSpeaker = null;
  let currentMessage = null;
  let messageQueue = [];
  let typing = false;
  let autoSkipTimeout = null;
  let autoSkipDuration = 0;
  let autoSkipStart = 0;
  let timerPaused = false;
  let timerRemaining = 0;

  // PLAY SOUND
  const playChatSound = () => {
    const soundPath = game.settings.get("hearme-chat-notification", "pingSound");
    if (!soundPath) return;
    if (game.audio?.context?.state === "suspended") {
      game.audio.context.resume();
    }
    AudioHelper.play({
      src: soundPath,
      volume: 0.8,
      autoplay: true,
      loop: false,
    }, true);
  };

  // CREATE BANNER IF MISSING
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "vn-chat-banner";
    Object.assign(banner.style, {
      position: "fixed",
      bottom: "calc(5% + 48px)",
      left: "20%",
      width: "60%",
      background: "rgba(0,0,0,0.75)",
      color: "white",
      fontFamily: "Arial, sans-serif",
      padding: "12px 20px",
      zIndex: 99,
      display: "none",
      flexDirection: "column",
      alignItems: "flex-start",
      userSelect: "none",
      backdropFilter: "blur(4px)",
      boxShadow: "0 -2px 10px rgba(0,0,0,0.7)",
      minHeight: "25vh",
      maxHeight: "50vh",
      overflowY: "auto",
      transition: "opacity 0.25s ease",
      opacity: "0",
      pointerEvents: "none",
      position: "fixed"
    });

    const nameElem = document.createElement("div");
    nameElem.id = "vn-chat-name";
    nameElem.style.fontWeight = "bold";
    nameElem.style.fontSize = "1.2em";
    nameElem.style.marginBottom = "4px";
    banner.appendChild(nameElem);

    const msgElem = document.createElement("div");
    msgElem.id = "vn-chat-msg";
    msgElem.style.fontSize = "2.2em";
    banner.appendChild(msgElem);

    arrowElem = document.createElement("div");
    arrowElem.id = "vn-chat-arrow";
    arrowElem.innerHTML = "&#8595;";
    Object.assign(arrowElem.style, {
      position: "absolute",
      bottom: "8px",
      right: "16px",
      fontSize: "1.5em",
      opacity: "0.5",
      display: "none"
    });
    banner.appendChild(arrowElem);

    timerBar = document.createElement("div");
    timerBar.id = "vn-chat-timer";
    Object.assign(timerBar.style, {
      position: "absolute",
      bottom: "0",
      left: "0",
      height: "5px",
      width: "100%",
      background: "white",
      transformOrigin: "left",
      transform: "scaleX(1)",
      transition: "transform linear"
    });
    banner.appendChild(timerBar);

    linkedIcon = document.createElement("div");
    linkedIcon.id = "vn-chat-linked-icon";
    linkedIcon.textContent = "🔗";
    Object.assign(linkedIcon.style, {
      position: "absolute",
      top: "8px",
      right: "48px",
      fontSize: "1.2em",
      opacity: "0.7",
      cursor: "default",
      display: "inline-block"
    });
    banner.appendChild(linkedIcon);

    unlinkedIcon = document.createElement("div");
    unlinkedIcon.id = "vn-chat-unlinked-icon";
    unlinkedIcon.textContent = "⛔";
    Object.assign(unlinkedIcon.style, {
      position: "absolute",
      top: "8px",
      right: "72px",
      fontSize: "1.2em",
      opacity: "0.7",
      cursor: "default",
      display: "inline-block"
    });
    banner.appendChild(unlinkedIcon);

    document.body.appendChild(banner);
  } else {
    linkedIcon = document.getElementById("vn-chat-linked-icon");
    unlinkedIcon = document.getElementById("vn-chat-unlinked-icon");
    timerBar = document.getElementById("vn-chat-timer");
    arrowElem = document.getElementById("vn-chat-arrow");
  }

  if (!imgElem) {
    imgElem = document.createElement("img");
    imgElem.id = "vn-chat-image";
    Object.assign(imgElem.style, {
      position: "fixed",
      bottom: "0",
      left: "0",
      width: "31vw",
      height: "31vw",
      objectFit: "contain",
      zIndex: 98,
      transition: "left 0.5s ease, opacity 0.5s ease",
      opacity: "0",
      pointerEvents: "none",
      border: "none"
    });
    document.body.appendChild(imgElem);
  }

  // Update linked/unlinked icons visibility from settings defaults
  function updateIconsVisibility() {
    const showLinked = game.settings.get("hearme-chat-notification", "showLinkedIcon");
    const showUnlinked = game.settings.get("hearme-chat-notification", "showUnlinkedIcon");
    if (linkedIcon) linkedIcon.style.display = showLinked ? "inline-block" : "none";
    if (unlinkedIcon) unlinkedIcon.style.display = showUnlinked ? "inline-block" : "none";
  }

  updateIconsVisibility();

  // Show or hide arrow skip indicator
  function updateNextArrow() {
    if (!arrowElem) return;
    arrowElem.style.display = messageQueue.length > 0 ? "block" : "none";
  }

  // Typewriter effect
  function typeText(element, text, speed = 20, callback) {
    typing = true;
    element.innerHTML = "";
    let i = 0;
    function typeChar() {
      if (i < text.length) {
        element.innerHTML += text.charAt(i);
        i++;
        setTimeout(typeChar, speed);
      } else {
        typing = false;
        if (callback) callback();
      }
    }
    typeChar();
  }

  function clearAutoSkip() {
    clearTimeout(autoSkipTimeout);
    autoSkipTimeout = null;
    timerBar.style.transition = "none";
    timerBar.style.transform = "scaleX(1)";
    timerBar.style.display = "block";
    timerPaused = false;
    timerRemaining = 0;
  }

  function startAutoSkipTimer(textLength) {
    clearAutoSkip();
    const minTime = game.settings.get("hearme-chat-notification", "minAutoSkipTime") || 5;
    autoSkipDuration = Math.max(minTime * 1000, textLength * 50); // 50ms per char, min minimum
    autoSkipStart = Date.now();

    timerBar.style.transition = `transform ${autoSkipDuration}ms linear`;
    timerBar.style.transform = "scaleX(0)";
    timerBar.style.display = "block";

    autoSkipTimeout = setTimeout(() => {
      skipMessage();
    }, autoSkipDuration);
  }

  function pauseAutoSkipTimer() {
    if (autoSkipTimeout && !timerPaused) {
      timerPaused = true;
      timerRemaining = autoSkipDuration - (Date.now() - autoSkipStart);
      clearTimeout(autoSkipTimeout);
      timerBar.style.transition = "none";
      const scaleX = timerRemaining / autoSkipDuration;
      timerBar.style.transform = `scaleX(${scaleX})`;
      timerBar.style.display = "none"; // Hide timer bar on blur
    }
  }

  function resumeAutoSkipTimer() {
    if (timerPaused) {
      timerPaused = false;
      autoSkipDuration = timerRemaining;
      autoSkipStart = Date.now();

      timerBar.style.display = "block";
      timerBar.style.transition = `transform ${timerRemaining}ms linear`;
      timerBar.style.transform = "scaleX(0)";

      autoSkipTimeout = setTimeout(() => {
        skipMessage();
      }, timerRemaining);
    }
  }

  // Skip current message and advance
  function skipMessage() {
    clearAutoSkip();

    if (typing) {
      // Finish typing immediately
      const msgElem = document.getElementById("vn-chat-msg");
      msgElem.innerHTML = currentMessage.text;
      typing = false;
      // Start timer for auto skip now after instant show
      startAutoSkipTimer(currentMessage.text.length);
      return;
    }

    if (messageQueue.length > 0) {
      displayMessage(messageQueue.shift());
    } else {
      hideBanner();
    }
  }

  // Display the banner and message
  function displayMessage(message) {
    currentMessage = message;

    if (!banner) return;

    playChatSound();

    // Set speaker name and message
    const nameElem = banner.querySelector("#vn-chat-name");
    const msgElem = banner.querySelector("#vn-chat-msg");
    nameElem.textContent = message.speaker || "";
    currentSpeaker = message.speaker;

    // Show banner
    banner.style.display = "flex";
    banner.style.opacity = "1";
    banner.style.pointerEvents = "auto";

    // Set image if any
    if (message.image) {
      imgElem.src = message.image;
      imgElem.style.opacity = "1";
      imgElem.style.left = "0";
      imgElem.style.pointerEvents = "auto";
    } else {
      imgElem.style.opacity = "0";
      imgElem.style.left = "-40vw";
      imgElem.style.pointerEvents = "none";
    }

    // Type the text with effect, then start auto skip timer
    typeText(msgElem, message.text, 20, () => {
      startAutoSkipTimer(message.text.length);
    });

    // Update icons visibility depending on linked/unlinked property
    const showLinked = game.settings.get("hearme-chat-notification", "showLinkedIcon");
    const showUnlinked = game.settings.get("hearme-chat-notification", "showUnlinkedIcon");

    if (linkedIcon && unlinkedIcon) {
      if (message.linked === true) {
        linkedIcon.style.display = showLinked ? "inline-block" : "none";
        unlinkedIcon.style.display = "none";
      } else if (message.linked === false) {
        unlinkedIcon.style.display = showUnlinked ? "inline-block" : "none";
        linkedIcon.style.display = "none";
      } else {
        linkedIcon.style.display = showLinked ? "inline-block" : "none";
        unlinkedIcon.style.display = showUnlinked ? "inline-block" : "none";
      }
    }

    updateNextArrow();
  }

  // Hide the banner and reset states
  function hideBanner() {
    if (!banner) return;
    banner.style.opacity = "0";
    banner.style.pointerEvents = "none";
    setTimeout(() => {
      banner.style.display = "none";
    }, 250);

    if (imgElem) {
      imgElem.style.opacity = "0";
      imgElem.style.left = "-40vw";
      imgElem.style.pointerEvents = "none";
    }

    clearAutoSkip();
    messageQueue = [];
    currentMessage = null;
    currentSpeaker = null;
    updateNextArrow();

    // Hide icons on hide
    if (linkedIcon) linkedIcon.style.display = "none";
    if (unlinkedIcon) unlinkedIcon.style.display = "none";
  }

  // Public API to queue messages
  window.VNShowMessage = (message) => {
    if (typing || currentMessage) {
      messageQueue.push(message);
    } else {
      displayMessage(message);
    }
  };

  // Listen for keydown events for skipping
  document.addEventListener("keydown", (e) => {
    const isTypingChat = document.activeElement?.closest(".chat-message") || document.activeElement?.tagName === "TEXTAREA";
    const sheetOpen = !!document.querySelector(".app.window-app.sheet:not(.minimized)") ||
                      !!document.querySelector(".app.window-app.journal-entry:not(.minimized)");

    const skipKey = game.settings.get("hearme-chat-notification", "skipKey") || "KeyQ";

    if (!isTypingChat && !sheetOpen) {
      if (e.code === skipKey) skipMessage();
      if (e.key === "Tab") {
        e.preventDefault();
        skipMessage();
      }
    }
  });

  // Window focus/blur handler to pause/resume timer and show/hide timer bar
  window.addEventListener("blur", () => {
    pauseAutoSkipTimer();
  });
  window.addEventListener("focus", () => {
    resumeAutoSkipTimer();
  });

  // For the skip key settings input, add listener to convert any key pressed into the code string
  Hooks.on("renderSettingsConfig", (app, html) => {
    const skipKeyInput = html.find("input[name='hearme-chat-notification.skipKey']");
    if (!skipKeyInput.length) return;

    skipKeyInput.prop("readonly", true);
    skipKeyInput.off("keydown").on("keydown", (event) => {
      event.preventDefault();
      const code = event.originalEvent.code;
      if (code) {
        game.settings.set("hearme-chat-notification", "skipKey", code);
        skipKeyInput.val(code);
      }
    });
  });
})();

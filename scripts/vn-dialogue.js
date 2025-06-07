// === INIT SOUND SETTING ===
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
});

(() => {
  let banner = document.getElementById("vn-chat-banner");
  let imgElem = document.getElementById("vn-chat-image");
  let arrowElem = document.getElementById("vn-chat-arrow");
  let timerBar = null;
  let currentSpeaker = null;
  let currentMessage = null;
  let messageQueue = [];
  let typing = false;
  let autoSkipTimeout = null;
  let autoSkipDuration = 0;
  let autoSkipStart = 0;
  let timerPaused = false;
  let timerRemaining = 0;

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

  if (!banner) {
    banner = document.createElement("div");
    banner.id = "vn-chat-banner";
    Object.assign(banner.style, {
      position: "fixed",
      bottom: "5%",
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
      position: "fixed",
      bottom: "calc(5% + 48px)", // Adjust this to appear below the character sheet UI if needed
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

    document.body.appendChild(banner);
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

  function updateNextArrow() {
    arrowElem.style.display = messageQueue.length > 0 ? "block" : "none";
  }

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
    timerPaused = false;
    timerRemaining = 0;
  }

  function startAutoSkipTimer(textLength) {
    clearAutoSkip();

    // Calculate duration: 5 seconds + 0.05 sec per character
    autoSkipDuration = 5000 + textLength * 50;
    timerRemaining = autoSkipDuration;
    autoSkipStart = Date.now();
    timerBar.style.transition = "none";
    timerBar.style.transform = "scaleX(1)";

    setTimeout(() => {
      timerBar.style.transition = `transform ${autoSkipDuration}ms linear`;
      timerBar.style.transform = "scaleX(0)";
    }, 10);

    autoSkipTimeout = setTimeout(() => {
      // Check if tab/window is focused & no sheet/journal open
      const isFocused = document.hasFocus();
      const sheetOpen = !!document.querySelector(".app.window-app.sheet:not(.minimized)") ||
                        !!document.querySelector(".app.window-app.journal-entry:not(.minimized)");
      if (isFocused && !sheetOpen) {
        skipMessage();
      } else {
        // If not focused or sheet open, pause timer
        pauseAutoSkipTimer();
      }
    }, autoSkipDuration);

    timerPaused = false;
  }

  function pauseAutoSkipTimer() {
    if (!autoSkipTimeout || timerPaused) return;
    timerPaused = true;
    clearTimeout(autoSkipTimeout);

    // Calculate remaining time
    const elapsed = Date.now() - autoSkipStart;
    timerRemaining = Math.max(autoSkipDuration - elapsed, 0);

    timerBar.style.transition = "none";
    // Calculate current scaleX based on elapsed
    const progress = timerRemaining / autoSkipDuration;
    timerBar.style.transform = `scaleX(${progress})`;
  }

  function resumeAutoSkipTimer() {
    if (!timerPaused || !currentMessage) return;
    timerPaused = false;
    autoSkipStart = Date.now();

    timerBar.style.transition = `transform ${timerRemaining}ms linear`;
    timerBar.style.transform = "scaleX(0)";

    autoSkipTimeout = setTimeout(() => {
      const isFocused = document.hasFocus();
      const sheetOpen = !!document.querySelector(".app.window-app.sheet:not(.minimized)") ||
                        !!document.querySelector(".app.window-app.journal-entry:not(.minimized)");
      if (isFocused && !sheetOpen) {
        skipMessage();
      } else {
        pauseAutoSkipTimer();
      }
    }, timerRemaining);
  }

  function displayMessage(entry) {
    clearAutoSkip();
    currentMessage = entry;
    const nameElem = document.getElementById("vn-chat-name");
    const msgElem = document.getElementById("vn-chat-msg");

    console.log("Displaying message:", entry);

    nameElem.textContent = entry.name;
    banner.style.display = "flex";
    banner.style.opacity = "1";

    if (entry.name !== currentSpeaker) {
      imgElem.style.opacity = "0";
      imgElem.style.left = "-35vw";
      if (entry.image) {
        imgElem.src = entry.image;
        setTimeout(() => {
          imgElem.style.left = "0";
          imgElem.style.opacity = "1";
        }, 50);
      }
      currentSpeaker = entry.name;
    }

    if (entry.userId === game.user.id) {
      console.log("Playing chat sound for local user");
      playChatSound();
    }

    typeText(msgElem, entry.msg, 20, () => {
      updateNextArrow();
      // Only start timer if window is focused and no sheet/journal open
      const isFocused = document.hasFocus();
      const sheetOpen = !!document.querySelector(".app.window-app.sheet:not(.minimized)") ||
                        !!document.querySelector(".app.window-app.journal-entry:not(.minimized)");
      if (isFocused && !sheetOpen) {
        startAutoSkipTimer(entry.msg.length);
      }
    });
  }

  function skipMessage() {
    if (typing) return;
    clearAutoSkip();
    if (messageQueue.length > 0) {
      const next = messageQueue.shift();
      displayMessage(next);
    } else {
      banner.style.opacity = "0";
      imgElem.style.opacity = "0";
      timerBar.style.transition = "none";
      timerBar.style.transform = "scaleX(1)";
      setTimeout(() => {
        banner.style.display = "none";
        currentSpeaker = null;
        currentMessage = null;
      }, 250);
    }
  }

  document.addEventListener("keydown", (e) => {
    const isTypingChat = document.activeElement?.closest(".chat-message") || document.activeElement?.tagName === "TEXTAREA";
    const sheetOpen = !!document.querySelector(".app.window-app.sheet:not(.minimized)");

    if ((e.key === "q" || e.key === "Q") && !isTypingChat && !sheetOpen) skipMessage();
    if (e.key === "Tab") {
      e.preventDefault();
      skipMessage();
    }
  });

  window.addEventListener("blur", () => {
    pauseAutoSkipTimer();
  });

  window.addEventListener("focus", () => {
    resumeAutoSkipTimer();
  });

  Hooks.on("createChatMessage", (message) => {
    if (!message.visible || message.isRoll) return;
    const content = message.content.trim();
    let name = "";
    let image = null;

    if (!message.speaker || !message.speaker.actor) return;
    const actor = game.actors.get(message.speaker.actor);
    if (!actor) return;

    if (message.speaker.token) {
      const scene = game.scenes.active;
      const token = scene?.tokens.get(message.speaker.token);
      if (token) {
        name = token.name;
        image = token.texture.src;
      } else {
        name = actor.name;
        image = actor.img;
      }
    } else {
      name = actor.name;
      image = actor.img;
    }

    const entry = { name, msg: content, image, userId: message.user.id };

    if (!currentMessage) {
      displayMessage(entry);
    } else {
      messageQueue.push(entry);
      updateNextArrow();
    }
  });
})();

(() => {
  let banner = document.getElementById("vn-chat-banner");
  let imgElem = document.getElementById("vn-chat-image");
  let arrowElem = document.getElementById("vn-chat-arrow");
  let currentSpeaker = null;
  let currentMessage = null;
  let messageQueue = [];
  let typing = false;
  let autoSkipTimer = null;

  if (!banner) {
    banner = document.createElement("div");
    banner.id = "vn-chat-banner";
    banner.style.position = "fixed";
    banner.style.bottom = "5%";
    banner.style.left = "20%";
    banner.style.width = "60%";
    banner.style.background = "rgba(0,0,0,0.75)";
    banner.style.color = "white";
    banner.style.fontFamily = "Arial, sans-serif";
    banner.style.padding = "12px 20px";
    banner.style.zIndex = 50; // LOWERED z-index to appear under character sheets
    banner.style.display = "none";
    banner.style.flexDirection = "column";
    banner.style.alignItems = "flex-start";
    banner.style.userSelect = "none";
    banner.style.backdropFilter = "blur(4px)";
    banner.style.boxShadow = "0 -2px 10px rgba(0,0,0,0.7)";
    banner.style.minHeight = "25vh";
    banner.style.maxHeight = "50vh";
    banner.style.overflowY = "auto";
    banner.style.transition = "opacity 0.25s ease";
    banner.style.opacity = "0";

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
    arrowElem.style.position = "absolute";
    arrowElem.style.bottom = "8px";
    arrowElem.style.right = "16px";
    arrowElem.style.fontSize = "1.5em";
    arrowElem.style.opacity = "0.5";
    arrowElem.style.display = "none";
    banner.appendChild(arrowElem);

    document.body.appendChild(banner);
  }

  if (!imgElem) {
    imgElem = document.createElement("img");
    imgElem.id = "vn-chat-image";
    imgElem.style.position = "fixed";
    imgElem.style.bottom = "0";
    imgElem.style.left = "0";
    imgElem.style.width = "31vw";
    imgElem.style.height = "31vw";
    imgElem.style.objectFit = "contain";
    imgElem.style.zIndex = 49; // LOWERED z-index to appear under character sheets
    imgElem.style.transition = "left 0.5s ease, opacity 0.5s ease";
    imgElem.style.opacity = "0";
    imgElem.style.pointerEvents = "none";
    imgElem.style.border = "none";
    document.body.appendChild(imgElem);
  }

  function updateNextArrow() {
    arrowElem.style.display = messageQueue.length > 0 ? "block" : "none";
  }

  function clearAutoSkipTimer() {
    if (autoSkipTimer) {
      clearTimeout(autoSkipTimer);
      autoSkipTimer = null;
    }
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

  function displayMessage(entry) {
    currentMessage = entry;
    const nameElem = document.getElementById("vn-chat-name");
    const msgElem = document.getElementById("vn-chat-msg");

    nameElem.textContent = entry.name;
    banner.style.display = "flex";
    banner.style.opacity = "1";

    clearAutoSkipTimer(); // Cancel any pending timers

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

    typeText(msgElem, entry.msg, 20, () => {
      updateNextArrow();
      autoSkipTimer = setTimeout(() => {
        skipMessage(); // Auto skip after 6 seconds
      }, 6000);
    });
  }

  function skipMessage() {
    clearAutoSkipTimer(); // Stop auto-timer on manual skip
    if (typing) return;
    if (messageQueue.length > 0) {
      const next = messageQueue.shift();
      displayMessage(next);
    } else {
      banner.style.opacity = "0";
      imgElem.style.opacity = "0";
      setTimeout(() => {
        banner.style.display = "none";
        currentSpeaker = null;
        currentMessage = null;
      }, 250);
    }
  }

  banner.style.pointerEvents = "none";

  document.addEventListener("keydown", (e) => {
    const isTypingChat = document.activeElement?.closest(".chat-message") || document.activeElement?.tagName === "TEXTAREA";
    const sheetOpen = document.querySelector(".app.window-app.sheet")?.classList.contains("minimized") === false;

    if ((e.key === "q" || e.key === "Q") && !isTypingChat && !sheetOpen) skipMessage();
    if (e.key === "Tab") {
      e.preventDefault();
      skipMessage();
    }
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

    const chatText = content;
    const entry = {
      name,
      msg: chatText,
      image
    };

    if (!currentMessage) {
      displayMessage(entry);
    } else {
      messageQueue.push(entry);
      updateNextArrow();
    }
  });
})();

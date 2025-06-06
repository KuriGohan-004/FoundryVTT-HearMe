(() => {
  let banner = document.getElementById("vn-chat-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "vn-chat-banner";

    banner.style.position = "fixed";
    banner.style.bottom = "5%";
    banner.style.left = "20%";
    banner.style.width = "60%";
    banner.style.maxWidth = "calc(100vw - 20%)";
    banner.style.minHeight = "25vh";
    banner.style.maxHeight = "60vh";
    banner.style.height = "auto";
    banner.style.background = "rgba(0,0,0,0.75)";
    banner.style.color = "white";
    banner.style.fontFamily = "Arial, sans-serif";
    banner.style.padding = "12px 20px";
    banner.style.zIndex = "99999";
    banner.style.display = "none";
    banner.style.flexDirection = "column";
    banner.style.alignItems = "flex-start";
    banner.style.userSelect = "none";
    banner.style.backdropFilter = "blur(4px)";
    banner.style.boxShadow = "0 -2px 10px rgba(0,0,0,0.7)";
    banner.style.overflowY = "auto";
    banner.style.boxSizing = "border-box";
    banner.style.margin = "0";
    banner.style.border = "none";
    banner.style.outline = "none";
    banner.style.cursor = "pointer";
    banner.style.pointerEvents = "auto";

    const nameElem = document.createElement("div");
    nameElem.id = "vn-chat-name";
    nameElem.style.fontWeight = "bold";
    nameElem.style.fontSize = "2.2em";
    nameElem.style.marginBottom = "4px";
    banner.appendChild(nameElem);

    const msgElem = document.createElement("div");
    msgElem.id = "vn-chat-msg";
    msgElem.style.fontSize = "2.2em";
    banner.appendChild(msgElem);

    const nextArrow = document.createElement("div");
    nextArrow.id = "vn-chat-next-arrow";
    nextArrow.textContent = "↓";
    nextArrow.style.position = "absolute";
    nextArrow.style.bottom = "10px";
    nextArrow.style.right = "10px";
    nextArrow.style.fontSize = "2em";
    nextArrow.style.display = "none";
    banner.appendChild(nextArrow);

    document.body.appendChild(banner);
  }

  let imageElem = document.getElementById("vn-chat-image");
  if (!imageElem) {
    imageElem = document.createElement("img");
    imageElem.id = "vn-chat-image";

    imageElem.style.position = "fixed";
    imageElem.style.bottom = "0";
    imageElem.style.left = "0";  // << fixed left side of screen
    imageElem.style.width = "31vw";
    imageElem.style.height = "31vw";
    imageElem.style.objectFit = "cover";
    imageElem.style.zIndex = "99998";
    imageElem.style.display = "none";
    imageElem.style.border = "none";
    imageElem.style.outline = "none";
    imageElem.style.boxShadow = "none";
    imageElem.style.pointerEvents = "none";
    imageElem.style.boxSizing = "border-box";
    imageElem.style.margin = "0";

    document.body.appendChild(imageElem);
  }

  let messageQueue = [];
  let currentMessage = null;
  let isTyping = false;
  const fadeDuration = 1000; // ms

  const nameElem = document.getElementById("vn-chat-name");
  const msgElem = document.getElementById("vn-chat-msg");
  const nextArrow = document.getElementById("vn-chat-next-arrow");

  function isInputFocused() {
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea" || active.isContentEditable) return true;
    if (active.closest(".app.sheet") || active.closest(".chat-message")) return true;
    return false;
  }

  async function displayMessage({ name, msg, image }) {
    currentMessage = { name, msg, image };
    nameElem.textContent = name;

    if (image) {
      imageElem.src = image;
      imageElem.style.display = "block";
    } else {
      imageElem.style.display = "none";
    }

    msgElem.textContent = "";
    banner.style.display = "flex";
    banner.style.opacity = "1";
    banner.style.transition = ""; // reset transition
    nextArrow.style.display = "none";

    isTyping = true;
    for (let i = 0; i < msg.length; i++) {
      msgElem.textContent += msg.charAt(i);
      await new Promise((r) => setTimeout(r, 15));
    }
    isTyping = false;
    updateNextArrow();
  }

  function updateNextArrow() {
    if (messageQueue.length > 0 && !isTyping) {
      nextArrow.style.display = "block";
    } else {
      nextArrow.style.display = "none";
    }
  }

  function hideBanner() {
    banner.style.transition = `opacity ${fadeDuration}ms`;
    banner.style.opacity = "0";
    setTimeout(() => {
      banner.style.display = "none";
      imageElem.style.display = "none";
      currentMessage = null;
    }, fadeDuration);
  }

  function nextMessage() {
    if (isTyping) return;

    if (messageQueue.length > 0) {
      const next = messageQueue.shift();
      displayMessage(next);
    } else {
      hideBanner();
    }
  }

  function skipOrNext() {
    if (isTyping) {
      msgElem.textContent = currentMessage.msg;
      isTyping = false;
      updateNextArrow();
    } else {
      nextMessage();
    }
  }

  banner.onclick = () => {
    if (!isInputFocused()) {
      skipOrNext();
    }
  };

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (key === "q" && !isInputFocused() && currentMessage) {
      event.preventDefault();
      skipOrNext();
    }

    if (key === "tab" && currentMessage) {
      event.preventDefault();
      skipOrNext();
    }
  });

  Hooks.on("createChatMessage", (message) => {
    if (!message.visible || message.isRoll) return;

    const content = message.content.trim();
    const isActCommand = content.startsWith("/act");

    let name = "";
    let image = null;

    if (isActCommand) {
      name = "";
      image = null;
    } else {
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
    }

    const chatText = isActCommand ? content.replace(/^\/act\s*/, "") : content;

    const entry = { name, msg: chatText, image };

    if (!currentMessage) {
      displayMessage(entry);
    } else {
      messageQueue.push(entry);
      updateNextArrow();
    }
  });
})();

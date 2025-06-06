(() => {
  // IMAGE ELEMENT
  let imageElem = document.getElementById("vn-chat-image");
  if (!imageElem) {
    imageElem = document.createElement("img");
    imageElem.id = "vn-chat-image";
    imageElem.style.position = "fixed";
    imageElem.style.bottom = "0";
    imageElem.style.left = "10px";
    imageElem.style.width = "31vw";       // Set image width to 31vw
    imageElem.style.height = "31vw";      // Set image height to 31vw
    imageElem.style.objectFit = "cover";
    imageElem.style.zIndex = 99998;
    imageElem.style.display = "none";
    imageElem.style.border = "none";
    imageElem.style.outline = "none";
    imageElem.style.boxShadow = "none";
    document.body.appendChild(imageElem);
  }

  // CHAT BANNER ELEMENT
  let banner = document.getElementById("vn-chat-banner");
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
    banner.style.zIndex = 99999;
    banner.style.display = "none";
    banner.style.flexDirection = "column";
    banner.style.alignItems = "flex-start";
    banner.style.userSelect = "none";
    banner.style.backdropFilter = "blur(4px)";
    banner.style.boxShadow = "0 -2px 10px rgba(0,0,0,0.7)";
    banner.style.overflowY = "auto";
    banner.style.minHeight = "25vh";
    banner.style.maxHeight = "60vh";
    banner.style.height = "auto";
    banner.style.position = "relative";
    banner.style.cursor = "pointer";

    const nameElem = document.createElement("div");
    nameElem.id = "vn-chat-name";
    nameElem.style.fontWeight = "bold";
    nameElem.style.fontSize = "1.2em";
    nameElem.style.marginBottom = "4px";
    banner.appendChild(nameElem);

    const msgElem = document.createElement("div");
    msgElem.id = "vn-chat-msg";
    msgElem.style.fontSize = "2.2em";
    msgElem.style.whiteSpace = "pre-wrap";
    banner.appendChild(msgElem);

    const iconElem = document.createElement("div");
    iconElem.id = "vn-chat-icon";
    iconElem.textContent = "↓";
    iconElem.style.fontSize = "2em";
    iconElem.style.position = "absolute";
    iconElem.style.bottom = "8px";
    iconElem.style.right = "16px";
    iconElem.style.opacity = "0.7";
    iconElem.style.display = "none";
    iconElem.style.pointerEvents = "none";
    banner.appendChild(iconElem);

    document.body.appendChild(banner);
  }

  const nameElem = document.getElementById("vn-chat-name");
  const msgElem = document.getElementById("vn-chat-msg");
  const iconElem = document.getElementById("vn-chat-icon");

  let messageQueue = [];
  let typing = false;
  let currentMessage = null;
  let typewriterTimeout = null;

  function updateNextArrow() {
    iconElem.style.display = messageQueue.length > 0 ? "block" : "none";
  }

  function typewriterEffect(html, callback) {
    msgElem.innerHTML = "";
    typing = true;

    let i = 0;
    const text = html;

    function type() {
      if (i <= text.length) {
        msgElem.innerHTML = text.slice(0, i);
        i++;
        typewriterTimeout = setTimeout(type, 15);
      } else {
        typing = false;
        if (callback) callback();
      }
    }
    type();
  }

  function displayMessage(entry) {
    currentMessage = entry;

    // Show or hide name element depending on if name is empty
    if (entry.name) {
      nameElem.style.display = "block";
      nameElem.textContent = entry.name;
    } else {
      nameElem.style.display = "none";
      nameElem.textContent = "";
    }

    // Show or hide image element depending on if image is provided
    if (entry.image) {
      imageElem.src = entry.image;
      imageElem.style.display = "block";
      imageElem.style.opacity = "1";
    } else {
      imageElem.style.display = "none";
      imageElem.src = "";
    }

    banner.style.display = "flex";
    banner.style.opacity = "1";

    typewriterEffect(entry.msg, () => {
      updateNextArrow();
    });
  }

  function advanceMessage() {
    if (typing) {
      clearTimeout(typewriterTimeout);
      typing = false;
      msgElem.innerHTML = currentMessage.msg;
      updateNextArrow();
      return;
    }

    if (messageQueue.length > 0) {
      displayMessage(messageQueue.shift());
    } else {
      banner.style.transition = "opacity 0.5s";
      imageElem.style.transition = "opacity 0.5s";
      banner.style.opacity = "0";
      imageElem.style.opacity = "0";
      setTimeout(() => {
        banner.style.display = "none";
        imageElem.style.display = "none";
      }, 500);
      currentMessage = null;
      iconElem.style.display = "none";
    }
  }

  function isVNInputAllowed() {
    const active = document.activeElement;
    const isTyping = active && (
      active.tagName === "INPUT" ||
      active.tagName === "TEXTAREA" ||
      active.isContentEditable
    );

    const sheetOpen = Object.values(ui.windows).some(app =>
      app.rendered && app.element?.hasClass("sheet")
    );

    return !isTyping && !sheetOpen;
  }

  Hooks.on("createChatMessage", (message) => {
    if (!message.visible || message.isRoll) return;

    const content = message.content.trim();

    // Check for /act command (narration)
    const isActCommand = content.startsWith("/act");

    let name = "";
    let image = null;

    if (isActCommand) {
      // Narration: no name, no image, just text after /act
      name = "";
      image = null;
    } else {
      // Normal message, get token name and image if possible
      if (!message.speaker || !message.speaker.actor) return;
      const actor = game.actors.get(message.speaker.actor);
      if (!actor) return;

      // Use token name if exists, else actor name
      if (message.speaker.token) {
        // Find token in current scene by id
        const scene = game.scenes.active;
        const token = scene?.tokens.get(message.speaker.token);
        if (token) {
          name = token.name;
          image = token.texture.src;
        } else {
          // fallback if token not found
          name = actor.name;
          image = actor.img;
        }
      } else {
        // No token, fallback to actor info
        name = actor.name;
        image = actor.img;
      }
    }

    // The actual text to show: if /act, strip the command from the content
    const chatText = isActCommand ? content.replace(/^\/act\s*/, "") : content;

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

  // Change key listener to Q:
  window.addEventListener("keydown", (ev) => {
    if ((ev.key === "tab" || ev.key === "tab") && isVNInputAllowed()) {
      advanceMessage();
    }
  });

  // Click banner to advance:
  banner.addEventListener("click", () => {
    if (isVNInputAllowed()) advanceMessage();
  });
})();

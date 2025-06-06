(() => {
  let banner = document.getElementById("vn-chat-banner");
  let imageElem = document.getElementById("vn-chat-image");
  let nextIcon = document.getElementById("vn-next-icon");

  if (!banner) {
    // IMAGE
    imageElem = document.createElement("img");
    imageElem.id = "vn-chat-image";
    imageElem.style.position = "fixed";
    imageElem.style.left = "0";
    imageElem.style.bottom = "5%";
    imageElem.style.width = "31vw";
    imageElem.style.height = "31vw";
    imageElem.style.objectFit = "cover";
    imageElem.style.zIndex = "99998";
    imageElem.style.display = "none";
    imageElem.style.opacity = "1";
    imageElem.style.transition = "opacity 0.5s";
    document.body.appendChild(imageElem);

    // BANNER
    banner = document.createElement("div");
    banner.id = "vn-chat-banner";
    banner.style.position = "fixed";
    banner.style.left = "20%";
    banner.style.bottom = "5%";
    banner.style.width = "60%";
    banner.style.background = "rgba(0,0,0,0.75)";
    banner.style.color = "white";
    banner.style.fontFamily = "Arial, sans-serif";
    banner.style.padding = "16px 24px";
    banner.style.zIndex = "99999";
    banner.style.display = "none";
    banner.style.flexDirection = "column";
    banner.style.alignItems = "flex-start";
    banner.style.userSelect = "none";
    banner.style.backdropFilter = "blur(4px)";
    banner.style.boxShadow = "0 -2px 10px rgba(0,0,0,0.7)";
    banner.style.overflowY = "auto";
    banner.style.minHeight = "25vh";
    banner.style.transition = "opacity 0.5s";
    banner.style.borderRadius = "10px";

    const nameElem = document.createElement("div");
    nameElem.id = "vn-chat-name";
    nameElem.style.fontWeight = "bold";
    nameElem.style.fontSize = "1.4em";
    nameElem.style.marginBottom = "8px";
    banner.appendChild(nameElem);

    const msgElem = document.createElement("div");
    msgElem.id = "vn-chat-msg";
    msgElem.style.fontSize = "2.2em";
    banner.appendChild(msgElem);

    // Next message icon
    nextIcon = document.createElement("div");
    nextIcon.id = "vn-next-icon";
    nextIcon.innerHTML = "&#8595;";
    nextIcon.style.position = "absolute";
    nextIcon.style.bottom = "8px";
    nextIcon.style.right = "16px";
    nextIcon.style.fontSize = "1.5em";
    nextIcon.style.opacity = "0.8";
    nextIcon.style.display = "none";
    banner.appendChild(nextIcon);

    document.body.appendChild(banner);
  }

  const fadeDuration = 500;
  const messageQueue = [];
  let currentMessage = null;
  let typingTimer = null;

  function displayMessage(entry) {
    currentMessage = entry;
    const nameElem = document.getElementById("vn-chat-name");
    const msgElem = document.getElementById("vn-chat-msg");

    nameElem.textContent = entry.name;
    msgElem.textContent = "";
    banner.style.display = "flex";
    banner.style.opacity = "1";

    // Image
    if (entry.image) {
      imageElem.src = entry.image;
      imageElem.style.display = "block";
      imageElem.style.opacity = "1";
    } else {
      imageElem.style.display = "none";
    }

    // Typing effect
    let i = 0;
    const text = entry.msg;
    function typeChar() {
      if (i <= text.length) {
        msgElem.innerHTML = text.slice(0, i);
        i++;
        typingTimer = setTimeout(typeChar, 15);
      } else {
        updateNextArrow();
      }
    }
    typeChar();
  }

  function updateNextArrow() {
    if (messageQueue.length > 0) {
      nextIcon.style.display = "block";
    } else {
      nextIcon.style.display = "none";
    }
  }

  function hideBanner() {
    banner.style.opacity = "0";
    imageElem.style.opacity = "0";
    setTimeout(() => {
      banner.style.display = "none";
      imageElem.style.display = "none";
      currentMessage = null;
    }, fadeDuration);
  }

  function advanceMessage() {
    if (typingTimer) {
      clearTimeout(typingTimer);
      typingTimer = null;
      document.getElementById("vn-chat-msg").innerHTML = currentMessage.msg;
      updateNextArrow();
      return;
    }

    if (messageQueue.length > 0) {
      displayMessage(messageQueue.shift());
    } else {
      hideBanner();
    }
  }

  function isUserTypingOrSheetOpen() {
    return (
      document.activeElement?.tagName === "TEXTAREA" ||
      document.activeElement?.tagName === "INPUT" ||
      document.querySelector(".app.window-app.sheet") !== null
    );
  }

  // Mouse click to advance
  banner.addEventListener("click", advanceMessage);

  // Q or TAB to advance
  document.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      advanceMessage();
    }
    if (e.key.toLowerCase() === "q" && !isUserTypingOrSheetOpen()) {
      advanceMessage();
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

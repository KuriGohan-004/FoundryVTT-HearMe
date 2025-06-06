(() => {
  let banner = document.getElementById("vn-chat-banner");
  let imageElem = document.getElementById("vn-chat-image");

  if (!banner) {
    // VN Chat Banner
    banner = document.createElement("div");
    banner.id = "vn-chat-banner";
    banner.style.position = "fixed";
    banner.style.left = "20%";
    banner.style.bottom = "5%";
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
    banner.style.minHeight = "25vh";
    banner.style.maxHeight = "75vh";
    banner.style.overflowY = "auto";
    banner.style.transition = "opacity 0.5s ease";

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

    const nextArrow = document.createElement("div");
    nextArrow.id = "vn-next-arrow";
    nextArrow.textContent = "▼";
    nextArrow.style.position = "absolute";
    nextArrow.style.bottom = "8px";
    nextArrow.style.right = "12px";
    nextArrow.style.fontSize = "1.2em";
    nextArrow.style.opacity = "0.6";
    nextArrow.style.display = "none";
    banner.appendChild(nextArrow);

    document.body.appendChild(banner);
  }

  if (!imageElem) {
    imageElem = document.createElement("img");
    imageElem.id = "vn-chat-image";
    imageElem.style.position = "fixed";
    imageElem.style.left = "0";
    imageElem.style.bottom = "5%";
    imageElem.style.width = "31vw";
    imageElem.style.height = "31vw";
    imageElem.style.objectFit = "cover";
    imageElem.style.zIndex = 99998;
    imageElem.style.display = "none";
    imageElem.style.opacity = "0";
    imageElem.style.transition = "transform 0.5s ease, opacity 0.5s ease";
    document.body.appendChild(imageElem);
  }

  let messageQueue = [];
  let currentMessage = null;
  let waitingForInput = false;

  function updateNextArrow() {
    const arrow = document.getElementById("vn-next-arrow");
    arrow.style.display = messageQueue.length > 0 ? "block" : "none";
  }

  function displayMessage(entry) {
    currentMessage = entry;
    waitingForInput = true;

    const nameElem = document.getElementById("vn-chat-name");
    const msgElem = document.getElementById("vn-chat-msg");

    nameElem.textContent = entry.name;
    msgElem.innerHTML = "";
    banner.style.display = "flex";
    banner.style.opacity = "1";

    let index = 0;
    const typeText = () => {
      if (index < entry.msg.length) {
        msgElem.innerHTML += entry.msg[index++];
        setTimeout(typeText, 10);
      }
    };
    typeText();

    // Animate image if changed
    if (entry.image !== imageElem.src) {
      imageElem.src = entry.image || "";
      imageElem.style.display = entry.image ? "block" : "none";
      imageElem.style.opacity = "0";
      imageElem.style.transform = "translateX(-100%)";
      void imageElem.offsetWidth; // force reflow
      setTimeout(() => {
        imageElem.style.opacity = "1";
        imageElem.style.transform = "translateX(0)";
      }, 20);
    } else if (entry.image) {
      imageElem.style.display = "block";
      imageElem.style.opacity = "1";
      imageElem.style.transform = "translateX(0)";
    }

    updateNextArrow();
  }

  function clearBanner() {
    banner.style.opacity = "0";
    imageElem.style.opacity = "0";
    setTimeout(() => {
      banner.style.display = "none";
      imageElem.style.display = "none";
      currentMessage = null;
      updateNextArrow();
    }, 250); // fade time halved
  }

  function advanceMessage() {
    if (!waitingForInput) return;
    waitingForInput = false;

    if (messageQueue.length > 0) {
      const next = messageQueue.shift();
      displayMessage(next);
    } else {
      clearBanner();
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "q" || e.key === "Q" || e.key === "Tab") {
      const active = document.activeElement;
      const isTyping = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
      const sheetOpen = document.querySelector(".app.window-app.actor") !== null;
      if (e.key === "Tab") e.preventDefault();
      if (!isTyping || e.key === "Tab") advanceMessage();
    }
  });

  banner.addEventListener("click", () => {
    advanceMessage();
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

(() => {
  let imageElem = document.getElementById("vn-chat-image");
  if (!imageElem) {
    imageElem = document.createElement("img");
    imageElem.id = "vn-chat-image";
    imageElem.style.position = "fixed";
    imageElem.style.bottom = "0";
    imageElem.style.left = "10px";
    imageElem.style.width = "31vw";
    imageElem.style.height = "31vw";
    imageElem.style.objectFit = "cover";
    imageElem.style.zIndex = 99998;
    imageElem.style.display = "none";
    imageElem.style.border = "none";
    imageElem.style.outline = "none";
    imageElem.style.boxShadow = "none";
    document.body.appendChild(imageElem);
  }

  let banner = document.getElementById("vn-chat-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "vn-chat-banner";
    banner.style.position = "fixed";
    banner.style.bottom = "5%";            // <-- raised 5% from bottom
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

    document.body.appendChild(banner);
  }

  const nameElem = document.getElementById("vn-chat-name");
  const msgElem = document.getElementById("vn-chat-msg");

  let messageQueue = [];
  let typing = false;
  let currentMessage = null;
  let typeIndex = 0;
  let typewriterTimeout = null;

  function typewriterEffect(html, callback) {
    msgElem.innerHTML = "";
    typing = true;

    const temp = document.createElement("div");
    temp.innerHTML = html;

    let nodes = [];
    temp.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        nodes.push(...node.textContent.split("").map(c => ({ type: "text", value: c })));
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        nodes.push({ type: "open", value: node.outerHTML.split(node.innerHTML)[0] });
        nodes.push(...node.innerHTML.split("").map(c => ({ type: "text", value: c })));
        nodes.push({ type: "close", value: `</${node.nodeName.toLowerCase()}>` });
      }
    });

    let buffer = "";
    typeIndex = 0;

    function typeNext() {
      if (typeIndex >= nodes.length) {
        typing = false;
        if (callback) callback();
        return;
      }
      const part = nodes[typeIndex];
      buffer += part.value;
      msgElem.innerHTML = buffer;
      typeIndex++;
      typewriterTimeout = setTimeout(typeNext, 20); // fast typing
    }

    typeNext();
  }

  function displayMessage(entry) {
    currentMessage = entry;
    nameElem.textContent = entry.name;
    imageElem.src = entry.image || "icons/svg/mystery-man.svg";

    banner.style.display = "flex";
    banner.style.opacity = "1";
    imageElem.style.display = "block";
    imageElem.style.opacity = "1";

    typewriterEffect(entry.msg, () => {
      // Finished typing — wait for E key
    });
  }

  function advanceMessage() {
    if (typing) {
      clearTimeout(typewriterTimeout);
      typing = false;
      msgElem.innerHTML = currentMessage.msg; // Show full message instantly
      return;
    }

    if (messageQueue.length > 0) {
      displayMessage(messageQueue.shift());
    } else {
      // Hide everything
      banner.style.transition = "opacity 0.5s";
      imageElem.style.transition = "opacity 0.5s";
      banner.style.opacity = "0";
      imageElem.style.opacity = "0";
      setTimeout(() => {
        banner.style.display = "none";
        imageElem.style.display = "none";
      }, 500);
      currentMessage = null;
    }
  }

  Hooks.on("createChatMessage", (message) => {
    if (!message.visible || !message.speaker?.actor || message.isRoll) return;

    const actor = game.actors.get(message.speaker.actor);
    if (!actor) return;

    const entry = {
      name: actor.name,
      msg: message.content,
      image: actor.token?.texture?.src || actor.img
    };

    if (!currentMessage) {
      displayMessage(entry);
    } else {
      messageQueue.push(entry);
    }
  });

  window.addEventListener("keydown", (ev) => {
    if (ev.key === "e" || ev.key === "E") {
      advanceMessage();
    }
  });
})();

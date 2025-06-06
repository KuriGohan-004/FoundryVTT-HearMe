(() => {
  // Create or reuse the speaker image element
  let imageElem = document.getElementById("vn-chat-image");
  if (!imageElem) {
    imageElem = document.createElement("img");
    imageElem.id = "vn-chat-image";
    imageElem.style.position = "fixed";
    imageElem.style.bottom = "0";
    imageElem.style.left = "10px";
    imageElem.style.width = "35vw";
    imageElem.style.height = "35vw";
    imageElem.style.objectFit = "cover";
    imageElem.style.zIndex = 99998;
    imageElem.style.display = "none";
    imageElem.style.border = "none";
    imageElem.style.outline = "none";
    imageElem.style.boxShadow = "none";
    document.body.appendChild(imageElem);
  }

  // Create or reuse the VN chat banner
  let banner = document.getElementById("vn-chat-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "vn-chat-banner";
    banner.style.position = "fixed";
    banner.style.bottom = "0";
    banner.style.left = "20%";              // <-- updated left align
    banner.style.width = "60%";             // <-- updated width
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

    // Speaker name
    const nameElem = document.createElement("div");
    nameElem.id = "vn-chat-name";
    nameElem.style.fontWeight = "bold";
    nameElem.style.fontSize = "1.2em";
    nameElem.style.marginBottom = "4px";
    banner.appendChild(nameElem);

    // Message text
    const msgElem = document.createElement("div");
    msgElem.id = "vn-chat-msg";
    msgElem.style.fontSize = "2.2em";
    msgElem.style.whiteSpace = "pre-wrap";
    banner.appendChild(msgElem);

    document.body.appendChild(banner);
  }

  let hideTimeout = null;
  let typingTimeout = null;
  const showDuration = 10000;
  const typeSpeed = 20; // ms per character

  // Simple typewriter effect that types HTML safely
  async function typewriterEffect(element, html) {
    // Stop any previous typing
    if (typingTimeout) clearTimeout(typingTimeout);

    element.innerHTML = ""; // Clear current content

    const temp = document.createElement("div");
    temp.innerHTML = html;

    let charArray = [];
    temp.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        charArray.push(...node.textContent.split("").map(c => ({ type: "text", value: c })));
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        charArray.push({ type: "open", value: node.outerHTML.split(node.innerHTML)[0] });
        charArray.push(...node.innerHTML.split("").map(c => ({ type: "text", value: c })));
        charArray.push({ type: "close", value: `</${node.nodeName.toLowerCase()}>` });
      }
    });

    element.innerHTML = ""; // start fresh
    let buffer = "";
    let index = 0;

    function typeNext() {
      if (index >= charArray.length) return;
      const chunk = charArray[index];

      if (chunk.type === "text") {
        buffer += chunk.value;
        element.innerHTML = buffer;
      } else if (chunk.type === "open" || chunk.type === "close") {
        buffer += chunk.value;
        element.innerHTML = buffer;
      }

      index++;
      typingTimeout = setTimeout(typeNext, typeSpeed);
    }

    typeNext();
  }

  async function showBanner(name, msg, actor) {
    const nameElem = document.getElementById("vn-chat-name");
    const msgElem = document.getElementById("vn-chat-msg");

    nameElem.textContent = name;

    // Get image
    let imageSrc = actor.token?.texture?.src || actor.img || "icons/svg/mystery-man.svg";
    imageElem.src = imageSrc;
    imageElem.style.display = "block";
    imageElem.style.opacity = "1";

    banner.style.display = "flex";
    banner.style.opacity = "1";
    banner.style.height = "auto";

    // Typewriter message
    await typewriterEffect(msgElem, msg);

    if (hideTimeout) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      banner.style.transition = "opacity 1s";
      imageElem.style.transition = "opacity 1s";
      banner.style.opacity = "0";
      imageElem.style.opacity = "0";
      setTimeout(() => {
        banner.style.display = "none";
        imageElem.style.display = "none";
      }, 1000);
    }, showDuration);
  }

  Hooks.on("createChatMessage", (message) => {
    if (!message.visible) return;
    const speaker = message.speaker;
    if (!speaker || !speaker.actor) return;
    if (message.isRoll) return;

    const actor = game.actors.get(speaker.actor);
    if (!actor) return;

    const speakerName = actor.name;
    const chatContent = message.content;

    showBanner(speakerName, chatContent, actor);
  });
})();

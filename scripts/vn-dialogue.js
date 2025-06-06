(() => {
  // Create or reuse the banner container in the DOM
  let banner = document.getElementById("vn-chat-banner");
  if (!banner) {
    // Main banner container
    banner = document.createElement("div");
    banner.id = "vn-chat-banner";
    banner.style.position = "fixed";
    banner.style.bottom = "0";
    banner.style.left = "100";
    banner.style.width = "55%";
    banner.style.background = "rgba(0,0,0,0.75)";
    banner.style.color = "white";
    banner.style.fontFamily = "Arial, sans-serif";
    banner.style.padding = "12px 20px";
    banner.style.zIndex = 99999;
    banner.style.display = "none";  // hidden initially
    banner.style.flexDirection = "column";
    banner.style.alignItems = "flex-start";
    banner.style.userSelect = "none";
    banner.style.backdropFilter = "blur(4px)";
    banner.style.boxShadow = "0 -2px 10px rgba(0,0,0,0.7)";
    banner.style.maxHeight = "85vh";
    banner.style.overflowY = "auto";
    banner.style.marginLeft = "10px";

    // Speaker image (above the text box)
    const imageElem = document.createElement("img");
    imageElem.id = "vn-chat-image";
    imageElem.style.width = "128px";
    imageElem.style.height = "128px";
    imageElem.style.objectFit = "cover";
    imageElem.style.border = "2px solid white";
    imageElem.style.borderRadius = "8px";
    imageElem.style.marginBottom = "10px";
    banner.appendChild(imageElem);

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
    msgElem.style.fontSize = "3em";
    banner.appendChild(msgElem);

    document.body.appendChild(banner);
  }

  let hideTimeout = null;
  const showDuration = 10000; // ms to show message before fading

  // Helper: Show banner with name, message, and image
  async function showBanner(name, msg, actor) {
    const nameElem = document.getElementById("vn-chat-name");
    const msgElem = document.getElementById("vn-chat-msg");
    const imageElem = document.getElementById("vn-chat-image");

    nameElem.textContent = name;
    msgElem.innerHTML = msg;

    // Get image: prefer token image, fallback to actor image
    let imageSrc = actor.token?.texture?.src || actor.img;
    if (!imageSrc) imageSrc = "icons/svg/mystery-man.svg";  // fallback image
    imageElem.src = imageSrc;

    banner.style.display = "flex";
    banner.style.opacity = "1";

    if (hideTimeout) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      banner.style.transition = "opacity 1s";
      banner.style.opacity = "0";
      setTimeout(() => (banner.style.display = "none"), 1000);
    }, showDuration);
  }

  // Hook to listen for new chat messages
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

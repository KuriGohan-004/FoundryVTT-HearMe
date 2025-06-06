(() => {
  // Create or reuse the image element
  let imageElem = document.getElementById("vn-chat-image");
  if (!imageElem) {
    imageElem = document.createElement("img");
    imageElem.id = "vn-chat-image";
    imageElem.style.position = "fixed";
    imageElem.style.bottom = "75vh";  // placed just above the banner
    imageElem.style.left = "10px";    // 10px margin to the left
    imageElem.style.width = "128px";
    imageElem.style.height = "128px";
    imageElem.style.objectFit = "cover";
    imageElem.style.zIndex = 99998;   // just behind the banner
    imageElem.style.display = "none"; // hidden initially
    document.body.appendChild(imageElem);
  }

  // Create or reuse the banner container
  let banner = document.getElementById("vn-chat-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "vn-chat-banner";
    banner.style.position = "fixed";
    banner.style.bottom = "0";
    banner.style.left = "20%";           // shifted right 20% of screen
    banner.style.width = "75%";
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
    banner.style.maxHeight = "75vh";
    banner.style.overflowY = "auto";

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
    msgElem.style.fontSize = "3em";  // larger font size
    banner.appendChild(msgElem);

    document.body.appendChild(banner);
  }

  let hideTimeout = null;
  const showDuration = 10000;

  // Show banner + image
  async function showBanner(name, msg, actor) {
    const nameElem = document.getElementById("vn-chat-name");
    const msgElem = document.getElementById("vn-chat-msg");

    nameElem.textContent = name;
    msgElem.innerHTML = msg;

    // Get image source: token or actor
    let imageSrc = actor.token?.texture?.src || actor.img || "icons/svg/mystery-man.svg";
    imageElem.src = imageSrc;
    imageElem.style.display = "block";
    imageElem.style.opacity = "1";

    banner.style.display = "flex";
    banner.style.opacity = "1";

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

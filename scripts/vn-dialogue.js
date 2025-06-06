(() => {
  // Create or reuse the banner container in the DOM
  let banner = document.getElementById("vn-chat-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "vn-chat-banner";
    banner.style.position = "fixed";
    banner.style.bottom = "0";
    banner.style.left = "0";
    banner.style.width = "75%";
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
    msgElem.style.fontSize = "3em";
    banner.appendChild(msgElem);

    document.body.appendChild(banner);
  }

  let hideTimeout = null;
  const showDuration = 10000; // ms to show message before fading

  // Helper: Show banner with name and message
  function showBanner(name, msg) {
    const nameElem = document.getElementById("vn-chat-name");
    const msgElem = document.getElementById("vn-chat-msg");

    nameElem.textContent = name;
    msgElem.innerHTML = msg;  // chat messages may contain HTML formatting

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
    if (!message.visible) return; // ignore hidden messages

    // We want only messages where the speaker is an Actor (character)
    const speaker = message.speaker;
    if (!speaker || !speaker.actor) return; // ignore player/OOC/system messages

    // Optional: Ignore rolls or other system messages
    if (message.isRoll) return;

    // Get actor's name (display name or actor name)
    const actor = game.actors.get(speaker.actor);
    if (!actor) return;

    const speakerName = actor.name;
    // Message text, cleaned for display
    const chatContent = message.content;

    showBanner(speakerName, chatContent);
  });
})();

(() => {
  const MODULE_ID = "hearme-chat-notification";

  // Register module settings on init
  Hooks.once("init", () => {
    game.settings.register(MODULE_ID, "bannerWidth", {
      name: "VN Banner Width (CSS units)",
      hint: "Set the width of the chat banner (e.g. 100%, 800px).",
      scope: "world",
      config: true,
      default: "100%",
      type: String
    });
    game.settings.register(MODULE_ID, "bannerHeight", {
      name: "VN Banner Max Height (CSS units)",
      hint: "Set max height of the chat banner (e.g. 25vh, 200px).",
      scope: "world",
      config: true,
      default: "25vh",
      type: String
    });
    game.settings.register(MODULE_ID, "fontSizeName", {
      name: "Font Size for Speaker Name",
      hint: "CSS font-size for the speaker name (e.g. 1.2em, 18px).",
      scope: "world",
      config: true,
      default: "1.2em",
      type: String
    });
    game.settings.register(MODULE_ID, "fontSizeMessage", {
      name: "Font Size for Dialogue Text",
      hint: "CSS font-size for the dialogue message (e.g. 1em, 16px).",
      scope: "world",
      config: true,
      default: "1em",
      type: String
    });
  });

  // Create or reuse the banner container in the DOM
  let banner = document.getElementById("vn-chat-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "vn-chat-banner";
    banner.style.position = "fixed";
    banner.style.bottom = "0";
    banner.style.left = "0";
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
    banner.style.overflowY = "auto";

    // Speaker name element
    const nameElem = document.createElement("div");
    nameElem.id = "vn-chat-name";
    nameElem.style.fontWeight = "bold";
    banner.appendChild(nameElem);

    // Message text element
    const msgElem = document.createElement("div");
    msgElem.id = "vn-chat-msg";
    banner.appendChild(msgElem);

    document.body.appendChild(banner);
  }

  // Apply settings to banner styles
  function applySettings() {
    banner.style.width = game.settings.get(MODULE_ID, "bannerWidth");
    banner.style.maxHeight = game.settings.get(MODULE_ID, "bannerHeight");

    const nameElem = document.getElementById("vn-chat-name");
    nameElem.style.fontSize = game.settings.get(MODULE_ID, "fontSizeName");

    const msgElem = document.getElementById("vn-chat-msg");
    msgElem.style.fontSize = game.settings.get(MODULE_ID, "fontSizeMessage");
  }
  applySettings();

  // Update banner style if settings change at runtime
  Hooks.on("settingChanged", (settingModule, settingName, data) => {
    if (settingModule === MODULE_ID && ["bannerWidth", "bannerHeight", "fontSizeName", "fontSizeMessage"].includes(settingName)) {
      applySettings();
    }
  });

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
    banner.style.transition = ""; // Reset any previous transition

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

    // Play sound on every message (replace sound path as needed)
    AudioHelper.play({
      src: "modules/hearme-chat-notification/ui/chat-ping.ogg",
      volume: 0.8,
      autoplay: true,
      loop: false
    }, true);

    // Show banner only if speaker is an Actor (ignore player/OOC/system messages)
    const speaker = message.speaker;
    if (!speaker || !speaker.actor) return;

    // Optional: ignore rolls
    if (message.isRoll) return;

    // Get actor's name (display name or actor name)
    const actor = game.actors.get(speaker.actor);
    if (!actor) return;

    const speakerName = actor.name;
    const chatContent = message.content;

    showBanner(speakerName, chatContent);
  });
})();

Hooks.once("init", () => {

  // -----------------------------
  // Visual separator in settings
  // -----------------------------
  game.settings.register("hearme-chat-notification", "vnBannerEnabled", {
    name: "--- VN Chat Banner Settings ---",
    hint: "",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  // -----------------------------
  // Core enable
  // -----------------------------
  game.settings.register("hearme-chat-notification", "vnEnabled", {
    name: "Enable VN Chat Banner",
    hint: "Show a Visual Novel style banner for chat messages.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Banner sizing & position (% of screen)
  game.settings.register("hearme-chat-notification", "vnWidthPct", {
    name: "Banner Width (%)",
    hint: "Width of the VN banner as % of screen width.",
    scope: "world",
    config: true,
    type: Number,
    default: 60,
    range: { min: 10, max: 100, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnHeightPct", {
    name: "Banner Height (%)",
    hint: "Height of the VN banner as % of screen height.",
    scope: "world",
    config: true,
    type: Number,
    default: 20,
    range: { min: 5, max: 50, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnOffsetXPct", {
    name: "Banner Offset X (%)",
    hint: "Distance from left edge of screen.",
    scope: "world",
    config: true,
    type: Number,
    default: 20,
    range: { min: 0, max: 100, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnOffsetYPct", {
    name: "Banner Offset Y (%)",
    hint: "Distance from bottom edge of screen.",
    scope: "world",
    config: true,
    type: Number,
    default: 5,
    range: { min: 0, max: 50, step: 1 }
  });

  // Text customization
  game.settings.register("hearme-chat-notification", "vnFontSizeNamePct", {
    name: "Font Size Name (%)",
    hint: "Font size of the character's name (percentage of screen width).",
    scope: "world",
    config: true,
    type: Number,
    default: 2,
    range: { min: 0.5, max: 10, step: 0.1 }
  });

  game.settings.register("hearme-chat-notification", "vnFontSizeMsgPct", {
    name: "Font Size Message (%)",
    hint: "Font size of the message text (percentage of screen width).",
    scope: "world",
    config: true,
    type: Number,
    default: 3,
    range: { min: 0.5, max: 10, step: 0.1 }
  });

  game.settings.register("hearme-chat-notification", "vnFontColor", {
    name: "Font Color",
    hint: "Color of the text in the VN banner.",
    scope: "world",
    config: true,
    type: String,
    default: "#ffffff"
  });

  game.settings.register("hearme-chat-notification", "vnBackgroundColor", {
    name: "Background Color",
    hint: "Background color of the VN banner.",
    scope: "world",
    config: true,
    type: String,
    default: "rgba(0,0,0,0.75)"
  });

  game.settings.register("hearme-chat-notification", "vnFontFamily", {
    name: "Font Family",
    hint: "Font used for VN banner text.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "Arial, sans-serif": "Arial",
      "Courier New, monospace": "Courier New",
      "Georgia, serif": "Georgia",
      "Times New Roman, serif": "Times New Roman",
      "Verdana, sans-serif": "Verdana"
    },
    default: "Arial, sans-serif"
  });

  // Auto-hide / skip options
  game.settings.register("hearme-chat-notification", "vnAutoHideTimePerChar", {
    name: "Auto-hide Delay (s/char)",
    hint: "Time in seconds per character before banner disappears. 0 disables.",
    scope: "world",
    config: true,
    type: Number,
    default: 0.3,
    range: { min: 0, max: 10, step: 0.1 }
  });

  game.settings.register("hearme-chat-notification", "vnSkipKey", {
    name: "Skip Key",
    hint: "Key to skip VN banner (while no input focused).",
    scope: "world",
    config: true,
    type: String,
    default: " "
  });

  game.settings.register("hearme-chat-notification", "vnHideUntilDismissed", {
    name: "Hide Chat Until Banner Dismissed",
    hint: "If enabled, the chat message is hidden until the VN banner disappears.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("hearme-chat-notification", "vnHideInCombat", {
    name: "Hide Banner In Combat",
    hint: "If enabled, VN banners are hidden during combat.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // Portrait
  game.settings.register("hearme-chat-notification", "vnPortraitEnabled", {
    name: "Enable Portrait",
    hint: "Show a character portrait below the VN banner.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "vnPortraitSizePct", {
    name: "Portrait Size (%)",
    hint: "Width/height of the portrait as % of screen width.",
    scope: "world",
    config: true,
    type: Number,
    default: 15,
    range: { min: 5, max: 50, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnPortraitOffsetXPct", {
    name: "Portrait Offset X (%)",
    hint: "Distance from left screen edge.",
    scope: "world",
    config: true,
    type: Number,
    default: 0,
    range: { min: 0, max: 50, step: 1 }
  });

  game.settings.register("hearme-chat-notification", "vnPortraitOffsetYPct", {
    name: "Portrait Offset Y (%)",
    hint: "Distance from bottom of screen.",
    scope: "world",
    config: true,
    type: Number,
    default: 0,
    range: { min: 0, max: 50, step: 1 }
  });

});

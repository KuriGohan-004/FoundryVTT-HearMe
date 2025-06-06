Hooks.once("init", () => {
  game.settings.register("hearme-chat-notification", "pingSound", {
    name: "Chat Notification Sound",
    hint: "The sound to play when a new chat message arrives.",
    scope: "world",
    config: true,
    type: String,
    default: "modules/hearme-chat-notification/ui/chat-ping.ogg",
    filePicker: "audio"
  });
});

Hooks.on("ready", () => {
  // Ensure audio context is resumed (if the user is alt-tabbed or page was inactive)
  if (game.audio?.context?.state === "suspended") {
    game.audio.context.resume();
  }

  Hooks.on("createChatMessage", (message) => {
    if (message.isRoll || !message.visible) return;

    const soundPath = game.settings.get("hearme-chat-notification", "pingSound");
    if (!soundPath) return;

    AudioHelper.play({
      src: soundPath,
      volume: 0.8,
      autoplay: true,
      loop: false
    }, true);
  });
});

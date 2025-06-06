Hooks.once("init", () => {
  game.settings.register("hearme-chat-notification", "pingSound", {
    name: "Chat Ping Sound",
    hint: "Path to the audio file to play when any new chat message arrives.",
    scope: "world",
    config: true,
    type: String,
    default: "modules/sleek-chat/ui/chat-ping.ogg",
    filePicker: "audio"
  });
});

Hooks.on("ready", () => {
  if (game.audio?.context?.state === "suspended") {
    game.audio.context.resume();
  }

  Hooks.on("createChatMessage", (message) => {
    if (message.isRoll) return;

    if (game.audio?.context?.state === "suspended") {
      game.audio.context.resume();
    }

    const soundPath = game.settings.get("hearme-chat-notification", "pingSound");

    AudioHelper.play({
      src: soundPath,
      volume: 0.8,
      autoplay: true,
      loop: false
    }, true);
  });
});

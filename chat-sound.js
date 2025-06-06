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
  // Resume audio context whenever the page becomes visible again
  const resumeAudio = () => {
    if (game.audio?.context?.state === "suspended") {
      game.audio.context.resume();
    }
  };

  // Listen for visibility change events
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      resumeAudio();
    }
  });

  Hooks.on("createChatMessage", async (message) => {
    if (message.isRoll || !message.visible) return;

    resumeAudio(); // Resume audio before playing sound

    const soundPath = game.settings.get("hearme-chat-notification", "pingSound");
    if (!soundPath) return;

    AudioHelper.play(
      {
        src: soundPath,
        volume: 0.8,
        autoplay: true,
        loop: false,
      },
      true
    );
  });
});

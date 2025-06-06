Hooks.on("ready", () => {
  // Resume audio context if needed
  if (game.audio?.context?.state === "suspended") {
    game.audio.context.resume();
  }

  Hooks.on("createChatMessage", (message) => {
    // Skip sound for rolls (optional)
    if (message.isRoll) return;

    // Force resume audio context again just in case
    if (game.audio?.context?.state === "suspended") {
      game.audio.context.resume();
    }

    // Play sound regardless of tab focus or chat visibility
    AudioHelper.play({
      src: "modules/sleek-chat/ui/chat-ping.ogg",  // Use your custom path
      volume: 0.8,
      autoplay: true,
      loop: false
    }, true);
  });
});

Hooks.on("ready", () => {
  Hooks.on("createChatMessage", (message) => {
    // Only play for messages visible to this user
    if (!message.isRoll && message.visible) {
      AudioHelper.play({
        src: "modules/sleek-chat/ui/chat-ping.ogg",  // You can replace this with a custom sound
        volume: 0.8,
        autoplay: true,
        loop: false
      }, true);
    }
  });
});
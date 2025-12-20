Hooks.once("init", () => {

  game.settings.register("hearme-chat-notification", "soundEnabled", {
    name: "Enable Notification Sound",
    hint: "Toggle chat notification sounds on or off.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "pingSound", {
    name: "Notification Sound",
    hint: "Sound file to play for notifications.",
    scope: "client",
    config: true,
    type: String,
    default: "modules/hearme-chat-notification/ui/chat-ping.ogg",
    filePicker: "audio"
  });

});

/**
 * Plays the configured notification sound.
 * Extracted directly from the original module logic.
 */
export function playNotificationSound() {
  if (!game.settings.get("hearme-chat-notification", "soundEnabled")) return;

  const src = game.settings.get("hearme-chat-notification", "pingSound");
  if (!src) return;

  if (game.audio?.context?.state === "suspended") {
    game.audio.context.resume();
  }

  AudioHelper.play(
    {
      src,
      volume: 0.8,
      autoplay: true,
      loop: false
    },
    true
  );
}

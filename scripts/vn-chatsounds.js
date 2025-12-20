Hooks.once("init", () => {

  game.settings.register("hearme-chat-notification", "soundEnabled", {
    name: "Enable Chat Notification Sound",
    hint: "Play a sound when a chat message appears.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "pingSound", {
    name: "Chat Notification Sound",
    hint: "Sound file to play when a chat message appears.",
    scope: "client",
    config: true,
    type: String,
    default: "modules/hearme-chat-notification/ui/chat-ping.ogg",
    filePicker: "audio"
  });

});

/* =========================================================
 *  SOUND LOGIC — DIRECTLY FROM YOUR ORIGINAL SCRIPT
 * =======================================================*/

function playChatSound() {
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

/* =========================================================
 *  CHAT HOOK — STANDALONE
 * =======================================================*/

Hooks.on("createChatMessage", (message) => {
  if (!message.visible) return;
  if (message.isRoll) return;

  // Ignore whispers
  if (message.type === CONST.CHAT_MESSAGE_TYPES.WHISPER) return;

  // Optional: ignore system messages
  if (!message.user) return;

  playChatSound();
});

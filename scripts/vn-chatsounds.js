Hooks.once("init", () => {

  game.settings.register("hearme-chat-notification", "soundEnabled", {
    name: "Enable Chat Notification Sound",
    hint: "Play a sound when a chat message appears.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("hearme-chat-notification", "pingSound", {
    name: "Chat Notification Sound",
    hint: "Sound file to play when a chat message appears.",
    scope: "world",
    config: true,
    type: String,
    default: "modules/hearme-chat-notification/ui/chat-ping.ogg",
    filePicker: "audio"
  });

});

/* =========================================================
 *  SOUND LOGIC — SAME AS ORIGINAL SCRIPT
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

  playChatSound();
});

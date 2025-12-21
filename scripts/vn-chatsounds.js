Hooks.once("init", () => {

  // Sound for normal messages
  game.settings.register("hearme-chat-notification", "pingSound", {
    name: "Chat Notification Sound (Normal)",
    hint: "Sound file to play when a regular chat message appears.",
    scope: "world",          // GM chooses the sound
    config: true,
    type: String,
    default: "modules/hearme-chat-notification/ui/chat-ping.ogg",
    filePicker: "audio"
  });

  // Sound for OOC messages
  game.settings.register("hearme-chat-notification", "oocPingSound", {
    name: "Chat Notification Sound (OOC)",
    hint: "Sound file to play when an OOC or player message appears.",
    scope: "world",          // GM chooses the sound
    config: true,
    type: String,
    default: "modules/hearme-chat-notification/ui/chat-ooc.ogg",
    filePicker: "audio"
  });

  // Toggle for sounds
  game.settings.register("hearme-chat-notification", "soundEnabled", {
    name: "Enable Chat Notification Sounds",
    hint: "Play sounds for chat messages.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

});

/* =========================================================
 *  SOUND LOGIC
 * =======================================================*/
function playChatSound(src) {
  if (!game.settings.get("hearme-chat-notification", "soundEnabled")) return;
  if (!src) return;

  if (game.audio?.context?.state === "suspended") game.audio.context.resume();

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
 *  CHAT HOOK — LOCAL ONLY
 * =======================================================*/
Hooks.on("createChatMessage", (message) => {
  // Only play for messages the local user can see
  if (!message.visible) return;
  if (message.isRoll) return;

  // ✅ Prevent duplicate playback across clients
  if (!message.isAuthor) return;

  const content = message.content.trim().toLowerCase();
  let isOOC = false;

  // Detect OOC
  if (content.startsWith("/ooc") || !message.speaker?.token) {
    isOOC = true;
  }

  const soundSrc = isOOC
    ? game.settings.get("hearme-chat-notification", "oocPingSound")
    : game.settings.get("hearme-chat-notification", "pingSound");

  playChatSound(soundSrc);
});

Hooks.once("init", () => {
  // === Sound Settings ===
  game.settings.register("hearme-chat-notification", "pingSound", {
    name: "Chat Notification Sound (Normal)",
    hint: "Sound file to play when a regular chat message appears.",
    scope: "world",
    config: true,
    type: String,
    default: "modules/hearme-chat-notification/ui/chat-ping.ogg",
    filePicker: "audio"
  });

  game.settings.register("hearme-chat-notification", "oocPingSound", {
    name: "Chat Notification Sound (OOC)",
    hint: "Sound file to play when an OOC or player message appears.",
    scope: "world",
    config: true,
    type: String,
    default: "modules/hearme-chat-notification/ui/chat-ooc.ogg",
    filePicker: "audio"
  });

  game.settings.register("hearme-chat-notification", "soundEnabled", {
    name: "Enable Chat Notification Sounds",
    hint: "Play sounds for chat messages.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // === Actor Groups ===
  game.settings.register("hearme-chat-notification", "actorGroups", {
    name: "Actor Notification Groups",
    scope: "world",
    config: false,
    type: Object,
    default: []
  });

  game.settings.registerMenu("hearme-chat-notification", "actorGroupsMenu", {
    name: "Configure Actor Notification Groups",
    label: "Open Configuration",
    hint: "Define groups using exact names or keywords in actor names.",
    icon: "fas fa-users-cog",
    type: ActorGroupsConfig,
    restricted: true
  });

  // === All your VN Banner settings here ===
  // (Keep ALL the vn* settings you posted earlier — vnEnabled, vnWidthPct, etc.)
  // I'm omitting them here for brevity, but paste them exactly as before

  loadTemplates(["modules/hearme-chat-notification/templates/actor-groups.hbs"]);
});

/* === ActorGroupsConfig class (unchanged from your last working version) === */
// Paste your full ActorGroupsConfig class here exactly as in your last message

/* =========================================================
 * SOUND LOGIC
 * =======================================================*/
function playChatSound(src) {
  if (!game.settings.get("hearme-chat-notification", "soundEnabled")) return;
  if (!src) return;
  if (game.audio?.context?.state === "suspended") game.audio.context.resume();
  AudioHelper.play({ src, volume: 0.8, autoplay: true, loop: false }, true);
}

function getCustomSoundForActor(actorNameLower) {
  const groups = game.settings.get("hearme-chat-notification", "actorGroups") || [];
  const match = groups.find(group => {
    if (group.exactNames) {
      const exacts = group.exactNames.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      if (exacts.includes(actorNameLower)) return true;
    }
    if (group.containsKeywords) {
      const keywords = group.containsKeywords.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      if (keywords.some(kw => actorNameLower.includes(kw))) return true;
    }
    return false;
  });
  return match?.sound || null;
}

/* =========================================================
 * VN BANNER + SOUND INTEGRATION
 * =======================================================*/
Hooks.once("ready", () => {
  if (!game.settings.get("hearme-chat-notification", "vnEnabled")) return;

  let banner, nameEl, msgEl, portrait, nextIcon;
  let hideTimeout = null;
  let typing = false;
  let messageQueue = [];
  let currentMessage = null;
  let soundPlayedForCurrent = false; // Prevent double sound

  // === Your full createBannerDom(), applyBannerSettings(), enrichMessageContent(), hideBanner() functions ===
  // Paste them exactly as in your original VN script

  function typeWriter(element, html, callback) {
    typing = true;
    soundPlayedForCurrent = false;
    element.innerHTML = "";
    let i = 0;

    function nextChar() {
      if (i >= html.length) {
        typing = false;
        nextIcon.style.opacity = "1";
        element.scrollTop = element.scrollHeight;
        callback?.();
        return;
      }

      // === PLAY SOUND ON FIRST CHARACTER (typewriter starts) ===
      if (i === 0 && !soundPlayedForCurrent) {
        soundPlayedForCurrent = true;

        const actor = currentMessage.speaker?.actor ? game.actors.get(currentMessage.speaker.actor) : null;
        const actorNameLower = actor?.name?.toLowerCase();

        let soundSrc = game.settings.get("hearme-chat-notification", "pingSound");

        if (actorNameLower) {
          const custom = getCustomSoundForActor(actorNameLower);
          if (custom) soundSrc = custom;
        }

        playChatSound(soundSrc);
      }

      i++;
      element.innerHTML = html.substring(0, i);
      element.scrollTop = element.scrollHeight;

      let delay = 30;
      const char = html[i - 1];
      if (char === "." || char === "!" || char === "?") delay = 200;
      if (char === "," || char === ";") delay = 100;

      setTimeout(nextChar, delay);
    }

    nextChar();
  }

  async function showBanner(message) {
    if (!game.settings.get("hearme-chat-notification", "vnEnabled")) return;
    if (!banner) createBannerDom();
    if (game.settings.get("hearme-chat-notification", "vnHideInCombat") && game.combat) {
      currentMessage = null;
      processNextMessage();
      return;
    }

    currentMessage = message;
    soundPlayedForCurrent = false; // Reset for this message

    applyBannerSettings();

    const actorName = message.speaker?.actor ? game.actors.get(message.speaker.actor)?.name : message.user?.name || "Unknown";
    nameEl.innerHTML = actorName;

    // Portrait handling (your original code)
    if (game.settings.get("hearme-chat-notification", "vnPortraitEnabled")) {
      // ... your portrait code ...
    }

    banner.style.display = "flex";
    banner.style.opacity = "1";
    nextIcon.style.opacity = "0";

    const enrichedContent = await enrichMessageContent(message.content);
    typeWriter(msgEl, enrichedContent, () => {
      // Auto-hide logic (your original)
      const delayPerChar = game.settings.get("hearme-chat-notification", "vnAutoHideTimePerChar");
      if (delayPerChar > 0) {
        const visibleLength = msgEl.textContent.length;
        const timePerChar = delayPerChar * visibleLength * 1000;
        const minTime = 3000;
        const totalTime = Math.max(minTime, timePerChar);
        hideTimeout = setTimeout(hideBanner, totalTime);
      }
    });
  }

  // === queueMessage, processNextMessage, keydown listener, CSS styles ===
  // Paste all your remaining VN functions exactly as before

  createBannerDom();

  Hooks.on("createChatMessage", (message) => {
    if (!message.visible) return;
    if (message.isRoll) return;
    if (message.type === CONST.CHAT_MESSAGE_TYPES.WHISPER) return;

    const content = message.content.trim();
    if (!content || content.startsWith("/ooc") || !message.speaker?.actor) return;

    messageQueue.push(message);
    if (!typing && !currentMessage) processNextMessage();
  });
});

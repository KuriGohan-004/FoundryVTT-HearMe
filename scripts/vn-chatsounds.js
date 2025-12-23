Hooks.once("init", () => {
  // =============================
  // Original sound settings
  // =============================
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

  // =============================
  // Actor group settings (same as before)
  // =============================
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

  // =============================
  // VN Banner settings (your original ones)
  // =============================
  game.settings.register("hearme-chat-notification", "vnBannerEnabled", {
    name: "--- VN Chat Banner Settings ---",
    hint: "",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });

  game.settings.register("hearme-chat-notification", "vnEnabled", {
    name: "Enable VN Chat Banner",
    hint: "Show a Visual Novel style banner for chat messages.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // ... (all your other vn* settings exactly as you posted them) ...
  // (I'll omit them here for brevity, but keep them all in your script)

  // Pre-load template for actor groups config
  loadTemplates(["modules/hearme-chat-notification/templates/actor-groups.hbs"]);
});

/* =========================================================
 * Actor Groups Config Form (same as last working version)
 * ========================================================= */
class ActorGroupsConfig extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: "Actor Chat Notification Groups",
      id: "hearme-actor-groups-config",
      template: "modules/hearme-chat-notification/templates/actor-groups.hbs",
      width: 650,
      height: "auto",
      closeOnSubmit: false
    });
  }

  getData() {
    const groups = game.settings.get("hearme-chat-notification", "actorGroups") || [];
    return { groups };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".add-group").click(async () => {
      const groups = game.settings.get("hearme-chat-notification", "actorGroups") || [];
      groups.push({ name: "New Group", sound: "", exactNames: "", containsKeywords: "" });
      await game.settings.set("hearme-chat-notification", "actorGroups", groups);
      this.render(true);
    });

    html.find(".remove-group").click(async (ev) => {
      const idx = parseInt($(ev.currentTarget).data("idx"));
      const groups = game.settings.get("hearme-chat-notification", "actorGroups") || [];
      groups.splice(idx, 1);
      await game.settings.set("hearme-chat-notification", "actorGroups", groups);
      this.render(true);
    });

    new Sortable(html.find(".groups-list")[0], {
      animation: 150,
      handle: ".drag-handle",
      onEnd: async (ev) => {
        const groups = game.settings.get("hearme-chat-notification", "actorGroups") || [];
        const [moved] = groups.splice(ev.oldIndex, 1);
        groups.splice(ev.newIndex, 0, moved);
        await game.settings.set("hearme-chat-notification", "actorGroups", groups);
      }
    });

    // File picker activation
    html.find('a.file-picker').on('click', async (ev) => {
      ev.preventDefault();
      const input = html.find(`input[name="${ev.currentTarget.dataset.target}"]`);
      const current = input.val() || "";
      const picker = new FilePicker({
        type: "audio",
        current: current,
        callback: path => {
          input.val(path);
          this._onChangeInput(ev);
        }
      });
      await picker.browse();
    });
  }

  async _updateObject(event, formData) {
    const expanded = expandObject(formData);
    const newGroups = [];
    for (const [key, data] of Object.entries(expanded)) {
      if (data.name?.trim()) {
        newGroups.push({
          name: data.name.trim(),
          sound: data.sound?.trim() || "",
          exactNames: data.exactNames?.trim() || "",
          containsKeywords: data.containsKeywords?.trim() || ""
        });
      }
    }
    await game.settings.set("hearme-chat-notification", "actorGroups", newGroups);
    ui.notifications.info("Actor notification groups saved.");
  }
}

/* =========================================================
 * Sound playback & lookup
 * ========================================================= */
function playChatSound(src) {
  if (!game.settings.get("hearme-chat-notification", "soundEnabled")) return;
  if (!src) return;
  if (game.audio?.context?.state === "suspended") game.audio.context.resume();
  AudioHelper.play({ src, volume: 0.8, autoplay: true, loop: false }, true);
}

function getSoundForActor(actorNameLower) {
  if (!actorNameLower) return null;

  const groups = game.settings.get("hearme-chat-notification", "actorGroups") || [];
  const matchingGroup = groups.find(group => {
    if (group.exactNames) {
      const exactList = group.exactNames.split(",").map(s => s.trim().toLowerCase()).filter(s => s);
      if (exactList.includes(actorNameLower)) return true;
    }
    if (group.containsKeywords) {
      const keywords = group.containsKeywords.split(",").map(s => s.trim().toLowerCase()).filter(s => s);
      if (keywords.some(kw => actorNameLower.includes(kw))) return true;
    }
    return false;
  });

  return matchingGroup?.sound || null;
}

/* =========================================================
 * VN Banner Logic (your code + sound integration)
 * ========================================================= */
Hooks.once("ready", () => {
  if (!game.settings.get("hearme-chat-notification", "vnEnabled")) return;

  let banner, nameEl, msgEl, portrait, nextIcon;
  let hideTimeout = null;
  let typing = false;
  let messageQueue = [];
  let currentMessage = null;

  function createBannerDom() {
    if (banner) return;
    // ... (your full createBannerDom function unchanged) ...
    // (keep everything exactly as you had it)
  }

  function applyBannerSettings() {
    // ... (your full applyBannerSettings function unchanged) ...
  }

  async function enrichMessageContent(content) {
    return await TextEditor.enrichHTML(content, { async: true });
  }

  function typeWriter(element, html, callback) {
    // ... (unchanged) ...
  }

  function hideBanner() {
    // ... (unchanged) ...
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
    applyBannerSettings();

    const actor = message.speaker?.actor ? game.actors.get(message.speaker.actor) : null;
    const actorName = actor?.name || message.user?.name || "Unknown";
    const actorNameLower = actor?.name?.toLowerCase();

    nameEl.innerHTML = actorName;

    // === PLAY NOTIFICATION SOUND WHEN BANNER APPEARS ===
    const customSound = getSoundForActor(actorNameLower);
    const defaultSound = game.settings.get("hearme-chat-notification", "pingSound");
    playChatSound(customSound || defaultSound);

    // Portrait handling (unchanged)
    if (game.settings.get("hearme-chat-notification", "vnPortraitEnabled")) {
      if (message.speaker?.token) {
        const scene = game.scenes.active;
        const token = scene?.tokens.get(message.speaker.token);
        portrait.src = token?.texture.src || actor?.img || "";
      } else {
        portrait.src = actor?.img || "";
      }
      portrait.style.opacity = "1";
    }

    banner.style.display = "flex";
    banner.style.opacity = "1";
    nextIcon.style.opacity = "0";

    const enrichedContent = await enrichMessageContent(message.content);
    typeWriter(msgEl, enrichedContent, () => {
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

  function queueMessage(message) {
    messageQueue.push(message);
    if (!typing && !currentMessage) processNextMessage();
  }

  function processNextMessage() {
    if (messageQueue.length === 0) return;
    const next = messageQueue.shift();
    showBanner(next);
  }

  // Skip key listener (unchanged)
  document.addEventListener("keydown", (ev) => {
    // ... (your existing skip key code unchanged) ...
  });

  // CSS animations (unchanged)
  if (!document.getElementById("vn-next-icon-styles")) {
    // ... (your style block unchanged) ...
  }

  createBannerDom();

  // =============================
  // Chat hook — only queues IC messages for VN banner
  // =============================
  Hooks.on("createChatMessage", (message) => {
    if (!message.visible) return;
    if (message.isRoll) return;
    if (message.type === CONST.CHAT_MESSAGE_TYPES.WHISPER) return;

    const content = message.content.trim();
    if (!content) return;
    if (content.startsWith("/ooc")) return;
    if (!message.speaker?.actor) return; // Only actor-spoken lines get VN banner

    queueMessage(message);
  });
});

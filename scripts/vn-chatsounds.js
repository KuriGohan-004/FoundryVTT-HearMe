Hooks.once("init", () => {
  // Sound for normal messages
  game.settings.register("hearme-chat-notification", "pingSound", {
    name: "Chat Notification Sound (Normal)",
    hint: "Sound file to play when a regular chat message appears.",
    scope: "world",
    config: true,
    type: String,
    default: "modules/hearme-chat-notification/ui/chat-ping.ogg",
    filePicker: "audio"
  });

  // Sound for OOC messages
  game.settings.register("hearme-chat-notification", "oocPingSound", {
    name: "Chat Notification Sound (OOC)",
    hint: "Sound file to play when an OOC or player message appears.",
    scope: "world",
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

  // New: Actor-specific sounds (array of {actorId: string, sound: string})
  game.settings.register("hearme-chat-notification", "actorSounds", {
    name: "Per-Actor Notification Sounds",
    hint: "Configure custom notification sounds for specific actors.",
    scope: "world",
    config: false, // Hidden from standard settings; managed via submenu
    type: Object,
    default: []
  });

  // Register a submenu button in Module Settings
  game.settings.registerMenu("hearme-chat-notification", "actorSoundsMenu", {
    name: "Configure Per-Actor Sounds",
    label: "Open Configuration",
    hint: "Assign custom chat notification sounds to specific actors. Drag to reorder.",
    icon: "fas fa-user-volume",
    type: ActorSoundsConfig,
    restricted: true
  });
});

/* =========================================================
 * CUSTOM SETTINGS FORMAPPLICATION
 * =======================================================*/
class ActorSoundsConfig extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title: "Per-Actor Chat Notification Sounds",
      id: "hearme-actor-sounds-config",
      template: "modules/hearme-chat-notification/templates/actor-sounds.hbs",
      width: 600,
      height: "auto",
      closeOnSubmit: false,
      resizable: true
    });
  }

  getData() {
    const actorSounds = game.settings.get("hearme-chat-notification", "actorSounds") || [];
    const entries = actorSounds.map(entry => {
      const actor = game.actors.get(entry.actorId);
      return {
        actorId: entry.actorId,
        actorName: actor ? actor.name : `(Missing Actor ID: ${entry.actorId})`,
        sound: entry.sound || ""
      };
    });

    return { entries };
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Add new entry
    html.find("button.add-entry").click(async () => {
      const actorSounds = game.settings.get("hearme-chat-notification", "actorSounds") || [];
      actorSounds.push({ actorId: "", sound: "" });
      await game.settings.set("hearme-chat-notification", "actorSounds", actorSounds);
      this.render(true);
    });

    // Remove entry
    html.find("button.remove-entry").click(async (ev) => {
      const idx = parseInt(ev.currentTarget.dataset.idx);
      const actorSounds = game.settings.get("hearme-chat-notification", "actorSounds") || [];
      actorSounds.splice(idx, 1);
      await game.settings.set("hearme-chat-notification", "actorSounds", actorSounds);
      this.render(true);
    });

    // Make list sortable (drag & drop reordering)
    new Sortable(html.find("ol.actor-list")[0], {
      animation: 150,
      onEnd: async (ev) => {
        const actorSounds = game.settings.get("hearme-chat-notification", "actorSounds") || [];
        const moved = actorSounds.splice(ev.oldIndex, 1)[0];
        actorSounds.splice(ev.newIndex, 0, moved);
        await game.settings.set("hearme-chat-notification", "actorSounds", actorSounds);
      }
    });
  }

  async _updateObject(event, formData) {
    const expanded = expandObject(formData);
    const newEntries = [];
    for (const [key, data] of Object.entries(expanded)) {
      if (data.actorId && data.sound) {
        newEntries.push({ actorId: data.actorId, sound: data.sound });
      }
    }
    await game.settings.set("hearme-chat-notification", "actorSounds", newEntries);
    ui.notifications.info("Per-actor sounds saved.");
  }
}

/* =========================================================
 * SOUND LOGIC
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
 * CHAT HOOK — LOCAL ONLY
 * =======================================================*/
Hooks.on("createChatMessage", (message) => {
  if (!message.visible) return;
  if (message.isRoll) return;
  if (!message.isAuthor) return; // Only play for messages from others

  const content = message.content.trim().toLowerCase();
  let isOOC = content.startsWith("/ooc") || !message.speaker?.token;

  let soundSrc = isOOC
    ? game.settings.get("hearme-chat-notification", "oocPingSound")
    : game.settings.get("hearme-chat-notification", "pingSound");

  // Check for per-actor override (higher priority first)
  if (message.speaker?.actor) {
    const actorSounds = game.settings.get("hearme-chat-notification", "actorSounds") || [];
    const match = actorSounds.find(entry => entry.actorId === message.speaker.actor);
    if (match && match.sound) {
      soundSrc = match.sound;
    }
  }

  playChatSound(soundSrc);
});
